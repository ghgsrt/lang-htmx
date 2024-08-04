import { randomUUID } from 'crypto';
import { distance } from 'fastest-levenshtein';
import { Elysia, redirect, t } from 'elysia';
import { html } from '@elysiajs/html';
import { Room, MessageType } from './types/types';
import Html from '@kitajs/html';
import { EdenTreaty, GetPaths, Tail } from './types/utils';
import { type RoomController, base } from './controller';
import { FormError } from './components/Form';
import { ActorsView, ViewActorSettings, ActorTooltip } from './views/Actors';
import { FromActorsView, ToActorsView, ChatView } from './views/Chat';
import { JoinRoom, HomeView } from './views/Index';
import { Languages, RoomView } from './views/Room';
import { UsersView } from './views/Users';

const sockets: Record<
	string,
	[string, (eventName: string, data: any) => void][]
> = {};

export const storage: Record<string, Room> = {};

export const dataMap = {
	'update:title': (room) => room.get('title'),
	'update:id': (room) => room.get('id'),
	'update:host': (room) => room.get('host'),
	'update:users': (room) => <UsersView room={room} />,
	'update:actors': (room) => <ActorsView room={room} />,
	'update:fromActors': (room) => <FromActorsView room={room} />,
	'update:toActors': (room) => <ToActorsView room={room} />,
	// 'update:availableLanguages': (room) => <Languages room={room} />,
	'update:messages': (room) => <ChatView room={room} />,
} as const satisfies Record<string, (room: RoomController) => any>;
export type SSEEventName = keyof typeof dataMap;

export const _broadcast = <E extends SSEEventName>(
	channelId: string,
	eventName: E,
	extraArgs?: Tail<Tail<Parameters<(typeof dataMap)[E]>>>
) => {
	const data = dataMap[eventName];
	console.log('Broadcasting', channelId, eventName, 'with args:', extraArgs);
	for (const [uid, sendMessage] of sockets[channelId] ?? []) {
		console.log('Sending to', uid);
		if (extraArgs)
			sendMessage(
				eventName,
				data(base.roomController(channelId, uid), ...extraArgs)
			);
		else sendMessage(eventName, data(base.roomController(channelId, uid)));
	}
};

export const _sendTo = <E extends SSEEventName>(
	channelId: string,
	uid: string,
	eventName: E,
	extraArgs?: Tail<Tail<Parameters<(typeof dataMap)[E]>>>
) => {
	const data = dataMap[eventName];
	console.log('Sending', channelId, uid, eventName, 'with args:', extraArgs);
	const sendMessage = sockets[channelId]?.find(([id]) => id === uid)?.[1];
	if (sendMessage) {
		if (extraArgs)
			sendMessage(
				eventName,
				data(base.roomController(channelId, uid), ...extraArgs)
			);
		else sendMessage(eventName, data(base.roomController(channelId, uid)));
	}
};

const room = new Elysia({ prefix: '/room/:rid' })
	.guard({
		cookie: t.Object({ userId: t.String() }),
	})
	.derive({ as: 'global' }, ({ params, cookie }) => ({
		room: base.roomController(params.rid, cookie.userId.value),
	}))
	.get('/', ({ room }) => {
		if (!room.get('users', room.uid)) room.createUser();

		room.update('users', room.uid, { active: true });
		return <RoomView room={room} />;
	})

	.get('/languages', ({ room }) =>
		room.get('users', room.uid).sendingFrom ? <Languages room={room} /> : ''
	)

	.post('/init', ({ room }) => room.init())

	.post(
		'/send',
		({ body, room }) => {
			const user = room.get('users', room.uid);
			if (!user.sendingFrom) return;
			if (!body.message) return;
			if (!body.language) return;

			return room.recieveMessage({
				id: randomUUID(),
				userId: user.id,
				actorId: user.sendingFrom,
				message: body.message,
				language: body.language,
				timestamp: new Date().toISOString(),
				msgType: body.type as MessageType,
				to: user.sendingTo,
			});
		},
		{
			// body: chatMessageSchema,
		}
	)

	.group('/validate', (app) => app.post('/', () => {}))

	.group('/user', (app) =>
		app
			.patch('/sendingFrom/:actorId', ({ room, params }) => {
				room.update('users', room.uid, {
					sendingFrom: params.actorId,
				});
			})
			.patch(
				'/sendingTo/:actorId',
				({ room, body, params }) => {
					room.update('users', room.uid, (old) => ({
						sendingTo:
							body.usedCtrl === 'true'
								? [...old.sendingTo, params.actorId]
								: [params.actorId],
					}));
				},
				{ body: t.Object({ usedCtrl: t.String() }) }
			)
	)

	.group('/actor', (app) =>
		app
			.post('/', ({ room }) => room.createActor())
			.group('/:actorId', (app) =>
				app
					.get('/image/:name', ({ room, params }) =>
						Bun.file(
							`./src/images/${room.rid}/${params.actorId}/${params.name}`
						)
					)
					.post(
						'/image',
						({ room, params, body }) => {
							console.log(JSON.stringify(body.img.name));
							Bun.write(
								`${process.cwd()}/src/images/${room.rid}/${params.actorId}/${
									body.img.name
								}`,
								body.img
							);

							room.update('actors', params.actorId, { img: body.img.name });
						},
						{
							body: t.Object({ img: t.File() }),
						}
					)

					.patch(
						'/name',
						({ room, params, body }) =>
							room.update('actors', params.actorId, { name: body.name }),
						{
							body: t.Object({ name: t.String() }),
						}
					)
					.patch(
						'/id',
						({ room, params, body }) => {
							if (room.get('actors', params.actorId)) return; //! TODO: FORM ERROR
							room.update('actors', params.actorId, { id: body.id });
						},
						{
							body: t.Object({ id: t.String() }),
						}
					)
					.patch(
						'/color',
						({ room, params, body }) =>
							room.update('actors', params.actorId, { color: body.color }),
						{
							body: t.Object({ color: t.String() }),
						}
					)

					.get('/settings', ({ room, params }) => {
						return (
							<ViewActorSettings
								room={room}
								actor={room.get('actors', params.actorId)}
							/>
						);
					})
					.get('/tooltip', ({ room, params }) => {
						return (
							<ActorTooltip
								room={room}
								actor={room.get('actors', params.actorId)}
							/>
						);
					})

					.post('/clone', ({ room, params }) => room.cloneActor(params.actorId))

					.patch('/reserve', ({ room, params }) => {
						const actor = room.get('actors', params.actorId);
						if (!actor) return;

						room.update('actors', params.actorId, {
							reserved: actor.reserved ? '' : room.uid,
						});

						const user = room.get('users', room.uid);
						if (user.sendingFrom === actor.id)
							room.update('users', room.uid, {
								sendingFrom: '',
							});
					})

					.group('/languages', (app) =>
						app
							.post('/known/:language', ({ room, params }) =>
								room.update('actors', params.actorId, (actor) => {
									const languages = actor.languages;
									const language = params.language.replaceAll('%20', ' ');
									languages.known.push(language);

									const famIdx = languages.familiar.indexOf(language);
									if (famIdx !== -1) languages.familiar.splice(famIdx, 1);

									return { languages };
								})
							)
							.delete('/known/:language', ({ room, params }) =>
								room.update('actors', params.actorId, (actor) => {
									const languages = actor.languages;
									const language = params.language.replaceAll('%20', ' ');
									languages.known.splice(languages.known.indexOf(language), 1);
									return { languages };
								})
							)
							.post('/familiar/:language', ({ room, params }) =>
								room.update('actors', params.actorId, (actor) => {
									const languages = actor.languages;
									const language = params.language.replaceAll('%20', ' ');
									languages.familiar.push(language);
									return { languages };
								})
							)
							.delete('/familiar/:language', ({ room, params }) =>
								room.update('actors', params.actorId, (actor) => {
									const languages = actor.languages;
									const language = params.language.replaceAll('%20', ' ');
									languages.familiar.splice(
										languages.familiar.indexOf(language),
										1
									);
									return { languages };
								})
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
// .post(
// 	'/set-roomId',
// 	({ body }) => {
// 		if (storage[body.roomId])
// 			return (
// 				<SetRoomId isValid={false} value={body.roomId}>
// 					<FormError message='That Room ID is already taken...' />
// 				</SetRoomId>
// 			);
// 		return <SetRoomId isValid={true} value={body.roomId} />;
// 	},
// 	{ body: t.Object({ roomId: t.String() }) }
// );

let app = new Elysia()
	.use(html())

	.get('/idiomorph.min.js', () => Bun.file('./src/deps/idiomorph-ext.min.js'))

	.get('/reset.css', () => Bun.file('./src/styles/reset.css'))
	.get('/styles.css', () => Bun.file('./src/styles/styles.css'))

	.get('/resizeInput.js', () => Bun.file('./src/scripts/resizeInput.js'))
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

	.get('/placeholder/:id/:text', ({ params }) => (
		<div id={params.id} class='placeholder'>
			{params.text.replaceAll('%20', ' ')}
		</div>
	))

	.get('/', ({ cookie }) => {
		cookie.userId.value ??= randomUUID();

		return <HomeView />;
	})
	.guard({
		cookie: t.Object({ userId: t.String() }),
	})

	.post('/create-room', ({ cookie }) =>
		redirect(`/room/${base.createRoom(cookie.userId.value)}`)
	)
	.post('/join-room', ({ body }) => redirect(`/room/${body.roomId}`), {
		body: t.Object({ roomId: t.String() }),
	})

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
							>
								{option}
							</p>
						))}
					</>
				);
			},
			{
				body: t.Object({ options: t.String(), search: t.String() }),
			}
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
						(eventName, data) => {
							controller.enqueue(`event: ${eventName}\ndata: ${data}\n\n`);
							console.log('Sent', eventName);
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
	});

setTimeout(() => (app = app.listen(3002)), 1000);

const generatedRoutes = new Set();
export function addBaseRoute(
	method: 'get' | 'post',
	path: string,
	callback: Parameters<typeof room.get>[1]
) {
	const key = `${method}::${path}`;
	if (generatedRoutes.has(key)) return;
	console.log(key, app[method]);
	generatedRoutes.add(key);
	app = app[method](path, callback);
}

type _RoomRoutes = EdenTreaty<typeof room>;
export type RoomRoutes = GetPaths<ReturnType<_RoomRoutes['room']>>;

export type RoomUserRoutes = GetPaths<ReturnType<_RoomRoutes['room']>['user']>;
export type RoomActorRoutes = GetPaths<
	ReturnType<_RoomRoutes['room']>['actor']
>;
export type RoomValidatorRoutes = GetPaths<
	ReturnType<_RoomRoutes['room']>['validate']
>;

type _BaseRoutes = EdenTreaty<typeof app>;
export type BaseRoutes = GetPaths<_BaseRoutes>;
type _BaseValidatorRoutes = EdenTreaty<typeof validator>;
export type BaseValidatorRoutes = GetPaths<_BaseValidatorRoutes['validate']>;

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
