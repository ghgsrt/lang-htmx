import { randomUUID } from 'crypto';
import { SSEEvent, _broadcast, _sendTo, dataMap, storage } from '.';
import {
	Room,
	Actor,
	User,
	ChatMessage,
	RoomSettings,
	ActorGroup,
	SyncMap,
	sync,
	UserSettings,
	StripSync,
	UserChatMessage,
	SyncableArray,
} from './types/types';
import { ArrayKeys, TailParameters } from './types/utils';
import {
	byId,
	byName,
	byReserved,
	deepClone,
	replaceKeyOrdered,
} from './utils';
import { defaultUserStyles } from './views/Settings';

export type ImmutableRoomProps = 'settings';
export type MutableRoomProps = Exclude<ArrayKeys<Room>, ImmutableRoomProps>;

const roomControllers: Record<string, ReturnType<typeof roomController>> = {};

const roomController = (rid: string) => {
	//! if placed outside the function, ts thinks there's a circular dependency
	//! despite only being used in this fucking file
	//! Beyond comprehension
	const defaultUserSettings: Partial<UserSettings> = {
		styles: { ...defaultUserStyles },
	};

	let serverUser: User;

	const batched: {
		broadcast: Set<SSEEvent>;
		sendTo: Record<string, Set<SSEEvent>>;
	} = {
		broadcast: new Set(),
		sendTo: {},
	};
	const batcher = {
		broadcast: (event: SSEEvent) => batched.broadcast.add(event),
		sendTo: (uid: string, event: SSEEvent) =>
			(batched.sendTo[uid] ??= new Set()).add(event),
		flush: () => {
			for (const event of batched.broadcast) _broadcast(rid, event);
			for (const uid in batched.sendTo) {
				const events = batched.sendTo[uid].difference(batched.broadcast);
				for (const event of events) _sendTo(rid, uid, event);
			}

			batched.broadcast = new Set();
			batched.sendTo = {};
		},
	};

	const broadcast: TailParameters<typeof _broadcast> = (event) =>
		batcher.broadcast(event);
	const sendTo: TailParameters<typeof _sendTo> = (uid, event) => {
		batcher.sendTo(uid, event);
	};
	const send: TailParameters<typeof sendTo> = (event) => {
		batcher.sendTo(serverUser.id, event);
	};

	const ssePartial = (name: keyof typeof dataMap) => dataMap[name](controller);

	const init = (event?: SSEEvent) => {
		if (event) return ssePartial(event); //sendTo(serverUser.id, event);

		for (const event in dataMap) sendTo(serverUser.id, event as SSEEvent);
	};

	const users = storage[rid].users;
	const actors = storage[rid].actors;
	const actorGroups = storage[rid].actorGroups;
	const messages = storage[rid].messages;
	const userMessages = storage[rid].userMessages;
	const settings = storage[rid].settings;

	const _onRemove = {
		actors: (actor?: Actor) => {
			if (!actor) return;

			if (serverUser.id === settings.host) {
				for (const user of users) {
					if (user.sendingFrom === actor.id)
						user.set('sendingFrom', actors.find(byReserved(user.id))?.id ?? '');

					user.sendingTo.delete(actor.id);
				}
			} else {
				if (serverUser.sendingFrom === actor.id)
					serverUser.set(
						'sendingFrom',
						actors.find(byReserved(serverUser.id))?.id ?? ''
					);

				serverUser.sendingTo.delete(actor.id);
			}
		},
		actorGroups: (group?: ActorGroup) => {
			if (!group) return;

			if (serverUser.id === settings.host) {
				for (const user of users) user.sendingTo.delete(group.id);
			} else serverUser.sendingTo.delete(group.id);
		},
	};
	const _onPush = {
		actors: (actor: Actor) => {
			if (serverUser.sendingFrom === '')
				serverUser.set('sendingFrom', actor.id);
		},
	};

	const _sync: SyncMap<Room, MutableRoomProps> = {
		users: {
			__base: () => broadcast('update:users'),
			__item: (user) => ({
				sendingFrom: (value) => {
					if (value === '')
						user.sendingFrom = actors.find(byReserved(user.id))?.id ?? '';

					sendTo(user.id, 'update:chatFromActors');
					sendTo(user.id, 'update:chatToActors');
					sendTo(user.id, 'update:chat');
				},
				sendingTo: { __base: () => sendTo(user.id, 'update:chatToActors') },
			}),
		},
		actors: {
			__base: () => {
				broadcast('update:actors'); // refresh actor view
				broadcast('update:chatFromActors'); // show new name or img
				broadcast('update:chatToActors'); // show new name or img
				broadcast('update:chat'); // show new name or color or img
			},
			__item: (actor) => ({
				knownLanguages: {},
				familiarLanguages: {},
				reserved: (value) => {
					if (value === '') serverUser.set('sendingFrom', '');
					else if (serverUser.sendingFrom === '')
						serverUser.set('sendingFrom', actor.id);
				},
				id: (value, prev) => {
					for (const message of messages) {
						if (message.actorId === prev) message.actorId = value;
						const to = message.to.findIndex((to) => to === prev);
						if (to !== -1) message.to[to] = value;
					}
				},
			}),
			splice: ([actor]) => _onRemove.actors(actor),
			shift: _onRemove.actors,
			pop: _onRemove.actors,
			push: (len) => _onPush.actors(actors[len - 1]),
			unshift: (len) => _onPush.actors(actors[len - 1]),
		},
		actorGroups: {
			__base: () => {
				broadcast('update:actors');
				broadcast('update:chatToActors');
				broadcast('update:chat');
			},
			__item: () => ({ actorIds: {} }),
			splice: ([group]) => _onRemove.actorGroups(group),
			shift: _onRemove.actorGroups,
			pop: _onRemove.actorGroups,
		},
		messages: {
			__base: () => broadcast('update:chat'),
			__item: () => ({ to: {} }),
		},
		userMessages: {
			__base: () => broadcast('update:usersChat'),
		},
	};
	const _with = sync(storage[rid], _sync); //? for resyncing or whatever; e.g., actor.sync(_with.actors.item)

	const createUser = (uid: string, displayName: string) => {
		const user: StripSync<User> = {
			id: uid,
			active: true as boolean,
			sendingFrom: '',
			sendingTo: [] as any,
			settings: {
				...deepClone(defaultUserSettings),
				userId: uid,
				displayName: displayName,
			},
		};
		users.push(user);

		return user as unknown as User;
	};

	const createActor = () => {
		const actor: StripSync<Actor> = {
			id: randomUUID(),
			name: 'Anonymous',
			knownLanguages: [...settings.defaultLanguages] as any,
			familiarLanguages: [] as any,
			reserved: serverUser.id,
			img: '',
			color: '',
		};
		actors.push(actor);

		return actor as unknown as Actor;
	};
	const cloneActor = (actorId: string) => {
		const actor = actors.find(byId(actorId));
		if (!actor) return;

		const clone = {
			...actor,
			id: randomUUID(),
			reserved: serverUser.id,
		};
		actors.push(clone);

		return clone as unknown as Actor;
	};

	const createActorGroup = () => {
		const group: StripSync<ActorGroup> = {
			id: randomUUID(),
			name: 'Anonymous Group',
			actorIds: [] as any,
			img: '',
			color: '',
		};
		actorGroups.push(group);
		actorGroups.fill;

		return group as unknown as ActorGroup;
	};
	const cloneActorGroup = (groupId: string) => {
		const group = actorGroups.find(byId(groupId));
		if (!group) return;

		const clone = { ...group, id: randomUUID() };
		actorGroups.push(clone);

		return clone as unknown as ActorGroup;
	};

	const recieveMessage = (message: ChatMessage) => messages.push(message);
	const recieveUserMessage = (message: UserChatMessage) =>
		userMessages.push(message);

	const setId = (id: string) => {
		if (serverUser.id !== storage[rid].hostId) return;
		if (storage[id]) return;

		replaceKeyOrdered(storage, rid, id); //! make sure this doesn't cause massive issues lmao
		replaceKeyOrdered(roomControllers, rid, id); //! make sure this doesn't cause massive issues lmao

		rid = id;

		broadcast('update:id');
	};

	const _setHost = (newHost: User) => {
		storage[rid].hostId = newHost.id;
		settings.host = newHost.settings.displayName;
	};

	const setHost = (name: string) => {
		if (serverUser.id !== storage[rid].hostId) return;

		const newHost = users.find(byName(name));
		if (!newHost) return;

		_setHost(newHost);

		sendTo(newHost.id, 'update:roomSettings');
		sendTo(newHost.id, 'update:actors');
		sendTo(newHost.id, 'update:chat');
		send('update:roomSettings');
		send('update:actors');
		send('update:chat');
	};

	const controller = {
		get id() {
			return rid;
		},
		setId,
		get user() {
			return serverUser;
		},
		get hostId() {
			return storage[rid].hostId;
		},
		setHost,
		users,
		actors,
		actorGroups,
		messages,
		userMessages,
		settings,
		broadcast,
		sendTo,
		send,
		flush: batcher.flush,
		init,
		ssePartial,
		createUser,
		createActor,
		cloneActor,
		createActorGroup,
		cloneActorGroup,
		recieveMessage,
		recieveUserMessage,
	};

	return (uid: string) => {
		const user = users.find(byId(uid));
		if (user) {
			serverUser = user;

			if (!storage[rid].hostId) _setHost(serverUser);
		} else serverUser = undefined as unknown as User; //? guards are in place to prevent server user from being undefined in 99% of places; don't want ?'s everywhere

		return controller;
	};
};

const _controller = () => {
	const defaultRoomSettings: Partial<RoomSettings> = {
		roomName: 'new room',
		onlyHostMayDeleteActorGroups: false,
		defaultLanguages: ['Common'],
		languages: ['Common'],
		defaultIntro: 'says',
		verbs: {
			yell: {
				color: '#ff3f40',
				asPrefix: true,
				aliases: [],
			},
			whisper: {
				color: '#ff7eff',
				asPrefix: true,
				aliases: [],
			},
		},
	};
	return {
		createRoom: () => {
			const _rid = randomUUID();
			storage[_rid] = {
				id: _rid,
				users: [],
				actors: [],
				actorGroups: [],
				messages: [],
				userMessages: [],
				settings: {
					...deepClone(defaultRoomSettings),
					roomId: _rid,
				},
			} as any;

			return _rid;
		},
		roomController: (rid: string, uid: string) => {
			if (!roomControllers[rid]) roomControllers[rid] = roomController(rid);

			return roomControllers[rid](uid);
		},
	};
};

export const base = _controller();

export type RoomController = ReturnType<ReturnType<typeof roomController>>;
