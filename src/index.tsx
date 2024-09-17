import { randomUUID } from 'crypto';
import { distance } from 'fastest-levenshtein';
import { Elysia, redirect, t } from 'elysia';
import { html } from '@elysiajs/html';
import { Room, RoomSettings, Safe } from './types/types';
import Html from '@kitajs/html';
import { EdenTreaty, GetPaths, Tail } from './types/utils';
import { base, RoomController } from './controller';
import { FormError } from './components/Form';
import {
	ActorsView,
	ViewActorSettings,
	ActorTooltip,
	ActorGroupTooltip,
	ViewActorGroupSettings,
} from './views/Actors';
import {
	ChatView,
	ActiveFromActorItem,
	ActiveToActorItem,
	ChatFromActorsView,
	ChatToActorsView,
} from './views/Chat';
import { JoinRoom, HomeView } from './views/Index';
import { Languages, RoomView } from './views/Room';
import {
	CreateUser,
	UsersChatUsersView,
	UsersChatView,
	UsersView,
	UserTooltip,
} from './views/Users';
import { byId, escape } from './utils';
import { Placeholder } from './components/Placeholder';
import { RoomSettingsView, UserSettingsView } from './views/Settings';
import Modal, { modal } from './components/Modal';

const sockets: Record<string, [string, (event: string, data: any) => void][]> =
	{};

export const storage: Record<string, Room> = {};

export const dataMap = {
	'update:title': (room) => room.settings.roomName,
	'update:id': (room) => room.settings.roomId,
	'update:actors': (room) => <ActorsView room={room} />,
	'update:users': (room) => <UsersView room={room} />,
	'update:usersChat': (room) => <UsersChatView room={room} />,
	'update:usersChatUsers': (room) => <UsersChatUsersView room={room} />,
	'update:chat': (room) => <ChatView room={room} />,
	'update:chatFromActors': (room) => <ChatFromActorsView room={room} />,
	'update:chatToActors': (room) => <ChatToActorsView room={room} />,
	'update:roomSettings': (room) => <RoomSettingsView room={room} />,
	'update:userSettings': (room) => <UserSettingsView room={room} />,
} as const satisfies Record<string, (room: any) => any>;
export type SSEEvent = keyof typeof dataMap;

export const _broadcast = <E extends SSEEvent>(channelId: string, event: E) => {
	console.log('Broadcasting', channelId, event);
	for (const [uid, sendMessage] of sockets[channelId] ?? []) {
		console.log('Broadcasting to', uid);
		const controller = base.roomController(channelId, uid);
		const data = dataMap[event](controller);
		sendMessage(event, data);
	}
};

export const _sendTo = <E extends SSEEvent>(
	channelId: string,
	uid: string,
	event: E
) => {
	console.log('Sending to', channelId, uid, event);
	const sendMessage = sockets[channelId]?.find(([id]) => id === uid)?.[1];
	if (sendMessage) {
		sendMessage(event, dataMap[event](base.roomController(channelId, uid)));
	}
};

const methods = ['get', 'post', 'patch', 'delete'] as const;
export type Method = (typeof methods)[number];
const protectedMethods = ['POST', 'PATCH', 'DELETE'];

const wildcard: Record<string, any> = {};
const wildcardGroup = (prefix: `/${string}`) => (app: Elysia) => {
	app = app.group(prefix, (app) => {
		for (const method of methods) {
			//@ts-ignore
			app = app[method]('/*', (req: any) => {
				console.log(`WILD:${method.toUpperCase()} => PASSING ALONG`, req.body); //! WITHOUT THIS LOG, BODY RESOLVES AS UNDEFINED???????????????????????
				return wildcard[method][req.path](req);
			});
		}
		return app;
	});

	return app;
};
export const addGeneratedRoute = (
	method: Method,
	path: string,
	callback: Parameters<typeof room.get>[1]
) => {
	(wildcard[method] ??= {})[path] = callback;
};

export const placeholders: {
	base: Record<string, () => string>;
	room: Record<string, (room: RoomController) => string>;
} = {
	base: {},
	room: {
		chat: () => 'no messages yet',
		'actor-settings': (room) =>
			room.actors.length === 0 && room.actorGroups.length === 0
				? 'create an actor'
				: 'select an actor',
	},
} as const;

const SSEInitializer = (app: typeof _room) => {
	app = app.group('/init', (app) => {
		app = app.get(`/`, ({ room }) => room.init());

		for (const event in dataMap) {
			app = app.get(`/${event.split(':')[1]}`, ({ room }) =>
				room.init(event as SSEEvent)
			);
		}

		return app;
	});

	return app;
};

const _room = new Elysia({ prefix: '/room/:rid' })
	.guard({
		cookie: t.Object({ userId: t.String() }),
	})
	.derive({ as: 'global' }, ({ params, cookie }) => ({
		room: base.roomController(params.rid, cookie.userId.value),
	}))
	.onAfterHandle(({ room }) => room.flush());

const room = _room
	.get('/', ({ cookie, room }) => {
		if (!room.user) return redirect(URLs.room(room.id)('/create-user'));

		room.user.set('active', true);

		room.broadcast('update:usersChatUsers');
		room.broadcast('update:roomSettings');

		return <RoomView room={room} />;
	})

	.get('/create-user', ({ cookie, room }) => (
		<CreateUser uid={cookie.userId.value} room={room} />
	))

	.get('/styles', ({ room }) => {
		const verbs = Object.entries(room.settings.verbs);

		return (
			<>
				<style id='message-colors' safe>
					{`	:root {
							${verbs
								.map(([verb, props]) =>
									[verb, ...(props.aliases ?? [])]
										.map(
											(token) =>
												`--clr-msg-type${
													props.asPrefix ? '-prefixed' : ''
												}-${token}: ${props.color}`
										)
										.join(';')
								)
								.join(';')}
					}`}
				</style>
				<script>{`getMessageVariables(); setMessageColor();`}</script>
			</>
		);
	})
	.get('/languages', ({ room }) => <Languages room={room} />)

	.get('/sending-from-item', ({ room }) => (
		<ActiveFromActorItem room={room} plain />
	))
	.get('/sending-to-item', ({ room }) => <ActiveToActorItem room={room} />)

	.use(SSEInitializer)

	.guard(
		{
			beforeHandle({ set, room }) {
				if (room.user.id !== room.hostId) return (set.status = 'Unauthorized');
			},
		},
		(app) => app.use(wildcardGroup('/settings'))
	)

	.get('/placeholder/:key', ({ params, room }) => (
		<Placeholder for={'room'} pKey={params.key} args={[room]} />
	))

	.post('/send', ({ body, room }) => {
		const user = room.user;

		if (
			!user.sendingFrom ||
			!(body as any).message ||
			!(body as any).language ||
			!(body as any).intro
		)
			return new Response(JSON.stringify({ error: 'Invalid message body.' }), {
				status: 400,
			});

		if ((body as any).toActors)
			(body as any).intro += ` ${(body as any).toActors}`;

		return room.recieveMessage({
			id: randomUUID(),
			userId: user.id,
			actorId: user.sendingFrom,
			message: (body as any).message,
			language: (body as any).language,
			timestamp: new Date().toISOString(),
			intro: (body as any).intro,
			to: user.sendingTo,
		});
	})

	.group('/validate', (app) => app.post('/', () => {}))

	.group('/user', (app) =>
		app
			.get('/styles', ({ room }) => {
				const styles = Object.entries(room.user.settings.styles);

				return (
					<style id='message-colors' safe>
						{`:root {
							${styles.map(([style, value]) => `${style}: ${value}`).join(';')}
						}`}
					</style>
				);
			})

			.post('/send', ({ body, room }) => {
				if (!(body as any).message)
					return new Response(
						JSON.stringify({ error: 'Invalid message body.' }),
						{
							status: 400,
						}
					);

				return room.recieveUserMessage({
					id: randomUUID(),
					userId: room.user.id,
					message: (body as any).message,
					timestamp: new Date().toISOString(),
				});
			})

			.patch('/sending-from/:actorId', ({ room, params }) =>
				room.user.set('sendingFrom', params.actorId)
			)
			.patch(
				'/sending-to/:actorId',
				({ room, body, params }) => {
					if (body.usedCtrl === 'true')
						room.user.sendingTo.toggle(params.actorId);
					else room.user.sendingTo.set([params.actorId]);
				},
				{ body: t.Object({ usedCtrl: t.String() }) }
			)

			.group('/:userId', (app) =>
				app
					.derive({ as: 'local' }, ({ room, params }) => ({
						user: room.users.find(byId(params.userId))!,
					}))

					.get('/image/:name', ({ room, params }) =>
						Bun.file(
							`./src/images/${room.id}/user/${params.userId}/${params.name}`
						)
					)
					// .post(
					// 	'/image',
					// 	({ room, params, body, user }) => {
					// 		Bun.write(
					// 			`${process.cwd()}/src/images/${room.id}/user/${params.userId}/${
					// 				body.img.name
					// 			}`,
					// 			body.img
					// 		);

					// 		user.set('img', body.img.name);
					// 	},
					// 	{ body: t.Object({ img: t.File() }) }
					// )

					.get('/tooltip', ({ room, user }) => (
						<UserTooltip room={room} user={user} />
					))

					.guard(
						{
							beforeHandle({ set, params, room }) {
								if (
									room.user.id !== room.hostId &&
									room.user.id !== (params as any).userId
								)
									return (set.status = 'Unauthorized');
							},
						},
						(app) => app.use(wildcardGroup('/settings'))
					)
			)
	)

	.group('/actor', (app) =>
		app
			.post('/', ({ room }) => {
				const actor = room.createActor();
				return <ViewActorSettings room={room} actor={actor} oob />;
			})
			.group('/:actorId', (app) =>
				app
					.derive({ as: 'local' }, ({ room, params }) => ({
						actor: room.actors.find(byId(params.actorId))!,
					}))
					.guard(
						{
							beforeHandle({ set, request, room, actor }) {
								const endpoint = request.url.split('/').pop();

								if (!actor && endpoint !== 'settings')
									return (set.status = 'Not Found');
								if (protectedMethods.includes(request.method))
									if (
										(endpoint !== 'reserve' || actor.reserved) &&
										actor.reserved !== room.user.id &&
										room.hostId !== room.user.id
									)
										return (set.status = 'Unauthorized');
							},
						},
						(app) =>
							app
								.delete('/', ({ room, params, actor }) => {
									return (
										<Modal
											uid={room.user.id}
											message={`delete ${actor.name}?`}
											warning='this action cannot be undone'
											onConfirm={() => {
												room.actors.delete(byId(params.actorId));
												room.flush();
											}}
										/>
									);
								})

								.get('/image/:name', ({ room, params }) =>
									Bun.file(
										`./src/images/${room.id}/actor/${params.actorId}/${params.name}`
									)
								)
								.post(
									'/image',
									({ room, params, body, actor }) => {
										Bun.write(
											`${process.cwd()}/src/images/${room.id}/actor/${
												params.actorId
											}/${body.img.name}`,
											body.img
										);

										actor.set('img', body.img.name);
									},
									{ body: t.Object({ img: t.File() }) }
								)

								.patch(
									'/name',
									({ body, actor }) => actor.set('name', body.name),
									{
										body: t.Object({ name: t.String() }),
									}
								)
								.patch(
									'/id',
									({ room, body, actor }) => {
										if (room.actors.find(byId(body.id)))
											return room.send('update:actors'); //! TODO: FORM ERROR

										actor.set('id', body.id);
									},
									{ body: t.Object({ id: t.String() }) }
								)
								.patch(
									'/color',
									({ body, actor }) => actor.set('color', body.color),
									{ body: t.Object({ color: t.String() }) }
								)

								.get('/settings', ({ room, actor }) => {
									if (
										(room.actors.length === 0 &&
											room.actorGroups.length === 0) ||
										!actor
									)
										return redirect(
											URLs.room(room.id)('/placeholder/actor-settings')
										);

									return <ViewActorSettings room={room} actor={actor} />;
								})
								.get('/tooltip', ({ room, actor }) => (
									<ActorTooltip room={room} actor={actor} />
								))

								.post('/clone', ({ room, params }) =>
									room.cloneActor(params.actorId)
								)

								.patch('/reserve', ({ room, params, actor }) =>
									actor.set('reserved', actor.reserved ? '' : room.user.id)
								)

								.group('/languages', (app) =>
									app
										.post('/known/:language', ({ params, actor }) => {
											const language = params.language.replaceAll('%20', ' ');
											actor.knownLanguages.push(language);
											actor.familiarLanguages.delete(language);
										})
										.delete('/known/:language', ({ params, actor }) => {
											const language = params.language.replaceAll('%20', ' ');
											actor.knownLanguages.delete(language);
										})
										.post('/familiar/:language', ({ params, actor }) => {
											const language = params.language.replaceAll('%20', ' ');
											actor.familiarLanguages.push(language);
										})
										.delete('/familiar/:language', ({ params, actor }) => {
											const language = params.language.replaceAll('%20', ' ');
											actor.familiarLanguages.delete(language);
										})
								)
					)
			)
	)
	.group('/actor-group', (app) =>
		app
			.post('/', ({ room }) => {
				const group = room.createActorGroup();
				return <ViewActorGroupSettings room={room} group={group} oob />;
			})

			.group('/:groupId', (app) =>
				app
					.derive({ as: 'local' }, ({ room, params }) => ({
						group: room.actorGroups.find(byId(params.groupId))!,
					}))

					.delete('/', ({ room, params, group }) => (
						<Modal
							uid={room.user.id}
							message={`delete ${group.name}?`}
							warning='this action cannot be undone'
							onConfirm={() => {
								room.actorGroups.delete(byId(params.groupId));
								room.flush();
							}}
						/>
					))

					.get('/image/:name', ({ room, params }) =>
						Bun.file(
							`./src/images/${room.id}/actorGroup/${params.groupId}/${params.name}`
						)
					)
					.post(
						'/image',
						({ room, params, body, group }) => {
							Bun.write(
								`${process.cwd()}/src/images/${room.id}/actorGroup/${
									params.groupId
								}/${body.img.name}`,
								body.img
							);

							group.set('img', body.img.name);
						},
						{ body: t.Object({ img: t.File() }) }
					)

					.patch('/name', ({ body, group }) => group.set('name', body.name), {
						body: t.Object({ name: t.String() }),
					})
					.patch(
						'/id',
						({ room, body, group }) => {
							if (room.actorGroups.find(byId(body.id)))
								return room.send('update:actors'); //! TODO: FORM ERROR

							group.set('id', body.id);
						},
						{ body: t.Object({ id: t.String() }) }
					)
					.post('/color', ({ body, group }) => group.set('color', body.color), {
						body: t.Object({ color: t.String() }),
					})

					.get('/settings', ({ room, group }) => {
						if (
							(room.actors.length === 0 && room.actorGroups.length === 0) ||
							!group
						)
							return redirect(
								URLs.room(room.id)('/placeholder/actor-settings')
							);

						return <ViewActorGroupSettings room={room} group={group} />;
					})
					.get('/tooltip', ({ room, group }) => (
						<ActorGroupTooltip room={room} group={group} />
					))

					.post('/clone', ({ room, params }) =>
						room.cloneActorGroup(params.groupId)
					)

					.group('/actor-ids/:id', (app) =>
						app
							.post('/', ({ params, group }) => {
								group.actorIds.push(params.id);
							})
							.delete(
								'/',
								({ params, group }) => group.actorIds.delete(params.id),
								{
									beforeHandle({ set, room }) {
										if (
											room.settings.onlyHostMayDeleteActorGroups &&
											room.user.id !== room.hostId
										)
											return (set.status = 'Unauthorized');
									},
								}
							)
					)
			)
	);

//* High Trust Society Mode: grant all users host permissions/actions

const validator = new Elysia({ prefix: '/validate' }).post(
	'/roomId',
	(req) => {
		const room = storage[req.body.roomId];
		if (!room)
			return (
				<JoinRoom isValid={false} value={req.body.roomId}>
					<FormError message='Room not found...' />
				</JoinRoom>
			);
		return <JoinRoom isValid={true} value={req.body.roomId} />;
	},
	{ body: t.Object({ roomId: t.String() }) }
);

let app = new Elysia()
	.use(html())

	.get('/htmx.js', () => Bun.file('./src/deps/htmx.min.js'))
	.get('/idiomorph.min.js', () => Bun.file('./src/deps/idiomorph-ext.min.js'))

	.get('/reset.css', () => Bun.file('./src/styles/reset.css'))
	.get('/styles.css', () => Bun.file('./src/styles/styles.css'))

	.get('/clientJS.js', () => Bun.file('./src/scripts/clientJS.js'))
	.post(
		'/resizeInput',
		({ body }) => (
			<script>
				{`resizeInput(document.getElementById("${body.inputId}"))`}
			</script>
		),
		{ body: t.Object({ inputId: t.String() }) }
	)

	.group('/icons', (app) =>
		app.get('/reload', () => Bun.file('./src/icons/reload.png'))
	)

	.get('/', ({ cookie }) => {
		cookie.userId.value ??= randomUUID();
		cookie.userId.httpOnly = true;
		cookie.userId.secure = true;
		cookie.userId.sameSite = 'strict';
		cookie.userId.expires = new Date(Date.now() + 86400000 * 31);

		return <HomeView />;
	})

	.guard({
		cookie: t.Object({ userId: t.String() }),
	})

	.use(modal)

	.post('/create-room', () => redirect(`/room/${base.createRoom()}`))
	.post('/join-room', ({ body }) => redirect(`/room/${body.roomId}`), {
		body: t.Object({ roomId: t.String() }),
	})

	.get('/placeholder/:key', ({ params }) => placeholders.base[params.key]())

	.group('/search', (app) =>
		app.post(
			'/options',
			({ body }) => {
				const [action, _options] = body.options.split(':::');

				if (_options === '') return;
				const options = _options.toLowerCase().split(',');

				const distances = options.map((option, i) => [
					i,
					distance(body.search, option),
				]);

				const sortedDistances = distances.toSorted((a, b) => a[1] - b[1]);
				const sortedOptions = sortedDistances.reduce((acc, [i]) => {
					acc.push(options[i][0].toUpperCase() + options[i].slice(1));
					return acc;
				}, [] as string[]);

				return (
					<>
						{sortedOptions.map((option) => (
							<p
								class='multiselect-option'
								hx-post={`${action}/${option}`}
								hx-trigger='click'
								hx-target='this'
								safe
							>
								{option}
							</p>
						))}
					</>
				);
			},
			{ body: t.Object({ options: t.String(), search: t.String() }) }
		)
	)

	.use(validator)
	.use(room)

	.get('/listen/:rid', ({ params, cookie }) => {
		console.log('Listening to', params.rid);

		return new Response(
			new ReadableStream({
				start(controller) {
					(sockets[params.rid] ??= []).push([
						cookie.userId.value!,
						(event, data) => {
							controller.enqueue(`event: ${event}\ndata: ${data}\n\n`);
							console.log('Sent', event);
						},
					]);

					//! connection event htmx:sseOpen will not fire before the first message is sent
					controller.enqueue('event: connected\ndata: connected\n\n');
				},
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				},
			}
		);
	})
	.listen(3005);

type _RoomRoutes = EdenTreaty<typeof room>;
export type RoomRoute = GetPaths<ReturnType<_RoomRoutes['room']>>;

export type RoomUserRoute = GetPaths<ReturnType<_RoomRoutes['room']>['user']>;
export type RoomActorRoute = GetPaths<ReturnType<_RoomRoutes['room']>['actor']>;
export type RoomActorGroupRoute = GetPaths<
	ReturnType<_RoomRoutes['room']>['actor-group']
>;
export type RoomValidatorRoute = GetPaths<
	ReturnType<_RoomRoutes['room']>['validate']
>;

type _BaseRoutes = EdenTreaty<typeof app>;
export type BaseRoute = GetPaths<_BaseRoutes>;
type _BaseValidatorRoutes = EdenTreaty<typeof validator>;
export type BaseValidatorRoute = GetPaths<_BaseValidatorRoutes['validate']>;

export const URLs = {
	room: (rid: string) => {
		const room = (path: RoomRoute) => `/room/${rid}${path}` as const;
		room.validate = (path: RoomValidatorRoute) =>
			`/room/${rid}/validate${path}` as const;
		room.user = (path: RoomUserRoute) => `/room/${rid}/user${path}` as const;
		room.actor = (path: RoomActorRoute) => `/room/${rid}/actor${path}` as const;
		room.actorGroup = (path: RoomActorGroupRoute) =>
			`/room/${rid}/actor-group${path}` as const;
		room.roomSettings = `/room/${rid}/settings`;

		return room;
	},
} as const;

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
