import { randomUUID } from 'crypto';
import {
	BaseRoutes,
	BaseValidatorRoutes,
	RoomActorRoutes,
	RoomRoutes,
	RoomUserRoutes,
	RoomValidatorRoutes,
	SSEEventName,
	_broadcast,
	_sendTo,
	dataMap,
	storage,
} from '.';
import { Room, Actor, User, ChatMessage } from './types/types';
import { ArrayKeys, TailParameters } from './types/utils';

//! similar dumbass deal as below
//! let me use implicit return types ts for the love of God
//! if explicit works with no other changes, then implicit should too 😠
type Controller = {
	URL: ReturnType<typeof _URLs.base>;
	createRoom: (uid: string, rid?: string) => string;
	roomController: (rid: string, uid: string) => RoomController;
};

//! fuck Typescript: circular dependency with URL (due to being used in room.derive [index.ts], putting it in the type for RoomRoutes, which is used in URL)
//! explicit return type is the only fix (why does ts interpret it differently when the end result is literally fucking identical???)
export type RoomController = {
	rid: string;
	uid: string;
	URL: ReturnType<typeof _URLs.room>;
	broadcast: TailParameters<typeof _broadcast>;
	sendTo: TailParameters<typeof _sendTo>;
	send: TailParameters<TailParameters<typeof _sendTo>>;
	init: () => void;
	get: <
		P extends ID extends undefined
			? keyof Room
			: Exclude<ArrayKeys<Room>, 'availableLanguages'>,
		ID extends string | undefined = undefined
	>(
		prop: P,
		id?: ID
	) => ID extends undefined ? Room[P] : Room[P][number];
	set: <P extends Exclude<keyof Room, ArrayKeys<Room>>>(
		prop: P,
		value: Room[P]
	) => void;
	push: <P extends ArrayKeys<Room>>(prop: P, ...values: Room[P]) => void;
	remove: <P extends ArrayKeys<Room>>(prop: P, value: Room[P][number]) => void;
	update: <P extends Exclude<ArrayKeys<Room>, 'availableLanguages'>>(
		prop: P,
		id: string,
		newValue:
			| Partial<Room[P][number]>
			| ((old: Room[P][number]) => Partial<Room[P][number]>)
	) => void;
	createUser: () => void;
	createActor: () => Actor;
	cloneActor: (actorId: string) => Actor;
	recieveMessage: (message: ChatMessage) => void;
	ssePartial: (
		name: keyof typeof dataMap
	) => ReturnType<(typeof dataMap)[keyof typeof dataMap]>;
};

const _URLs = {
	room: (rid: string) => {
		const room = (path: RoomRoutes) => `/room/${rid}${path}`;
		room.validate = (path: RoomValidatorRoutes) =>
			`/room/${rid}/validate${path}`;
		room.user = (path: RoomUserRoutes) => `/room/${rid}/user${path}`;
		room.actor = (path: RoomActorRoutes) => `/room/${rid}/actor${path}`;

		const generated = (path: `/${string}`) => `/room/${rid}${path}`;
		generated.validate = (path: `/${string}`) => `/room/${rid}/validate${path}`;
		generated.user = (path: `/${string}`) => `/room/${rid}/user${path}`;
		generated.actor = (path: `/${string}`) => `/room/${rid}/actor${path}`;

		room.generated = generated;

		return room;
	},
	base: () => {
		const base = (path: BaseRoutes) => `${path}`;
		base.validate = (path: BaseValidatorRoutes) => `/validate${path}`;

		const generated = (path: `/${string}`) => `${path}`;
		generated.validate = (path: `/${string}`) => `/validate${path}`;
		generated.tab = (groupId: string | number, tab?: string | number) =>
			`/tab/${groupId}/${tab ?? ':tab'}`;

		base.generated = generated;

		return base;
	},
};

const _controller = (): Controller => {
	const roomController = (rid: string, uid: string): RoomController => {
		const broadcast: TailParameters<typeof _broadcast> = (
			eventName,
			extraArgs
		) => {
			_broadcast(rid, eventName, extraArgs);
		};
		const sendTo: TailParameters<typeof _sendTo> = (
			uid,
			eventName,
			extraArgs
		) => {
			_sendTo(rid, uid, eventName, extraArgs);
		};
		const send: TailParameters<TailParameters<typeof _sendTo>> = (
			eventName,
			extraArgs
		) => {
			_sendTo(rid, uid, eventName, extraArgs);
		};

		const init = () => {
			for (const eventName in dataMap) {
				broadcast(eventName as SSEEventName);
			}
		};

		const get = <
			P extends ID extends undefined
				? keyof Room
				: Exclude<ArrayKeys<Room>, 'availableLanguages'>,
			ID extends string | undefined = undefined
		>(
			prop: P,
			id?: ID
		): ID extends undefined ? Room[P] : Room[P][number] => {
			return id !== undefined
				? storage[rid][
						prop as Exclude<ArrayKeys<Room>, 'availableLanguages'>
				  ].find((item) => item.id === id)!
				: storage[rid][prop];
		};
		const set = <P extends Exclude<keyof Room, ArrayKeys<Room>>>(
			prop: P,
			value: Room[P]
		) => {
			storage[rid][prop] = value;
			broadcast(`update:${prop}`);
		};
		const push = <P extends ArrayKeys<Room>>(prop: P, ...values: Room[P]) => {
			storage[rid][prop].push(...(values as any));
			console.log('Pushed', prop, values);
			if (Object.hasOwn(dataMap, `update:${prop}`))
				broadcast(`update:${prop}` as keyof typeof dataMap);
		};
		const remove = <P extends ArrayKeys<Room>>(
			prop: P,
			value: Room[P][number]
		) => {
			const idx = storage[rid][prop].findIndex((x) => x === value);
			if (idx !== -1) storage[rid][prop].splice(idx, 1);
			if (Object.hasOwn(dataMap, `update:${prop}`))
				broadcast(`update:${prop}` as keyof typeof dataMap);
		};
		const update = <P extends Exclude<ArrayKeys<Room>, 'availableLanguages'>>(
			prop: P,
			id: string,
			newValue:
				| Partial<Room[P][number]>
				| ((old: Room[P][number]) => Partial<Room[P][number]>)
		) => {
			const idx = storage[rid][prop].findIndex((x) => x.id === id);
			if (idx === -1) return;

			const _newValue =
				typeof newValue === 'function'
					? newValue(storage[rid][prop][idx])
					: newValue;

			if (storage[rid][prop][idx] === _newValue) return;

			storage[rid][prop][idx] = { ...storage[rid][prop][idx], ..._newValue };
			broadcast(`update:${prop}`);

			if (prop === 'users') {
				if ((_newValue as Partial<User>).sendingFrom) {
					sendTo(id, 'update:fromActors');
					sendTo(id, 'update:messages');
				}
				if ((_newValue as Partial<User>).sendingTo)
					sendTo(id, 'update:toActors');
			}

			return storage[rid][prop][idx];
		};

		const createUser = () => {
			push('users', {
				id: uid,
				name: 'Anonymous',
				active: true,
				sendingFrom: '',
				sendingTo: [],
			});
		};

		const createActor = () => {
			const actor = {
				id: randomUUID(),
				name: 'Anonymous',
				languages: { known: ['Common'], familiar: [] },
				reserved: uid,
				img: '',
				color: '',
			};
			push('actors', actor);

			update('users', uid, (old) => {
				if (old.sendingFrom === '') return { sendingFrom: actor.id };
				return old;
			});

			return actor;
		};
		const cloneActor = (actorId: string) => {
			const actor = get('actors', actorId);

			const clone = {
				...actor,
				userId: randomUUID(),
				reserved: uid,
			};
			push('actors', clone);

			update('users', uid, (old) => {
				if (old.sendingFrom === '') return { sendingFrom: clone.id };
				return old;
			});

			return clone;
		};

		const recieveMessage = (message: ChatMessage) => push('messages', message);

		const ssePartial = (name: keyof typeof dataMap) =>
			dataMap[name](base.roomController(rid, uid));

		const URL = _URLs.room(rid);

		return {
			rid,
			uid,
			URL,
			broadcast,
			sendTo,
			send,
			init,
			get,
			set,
			push,
			remove,
			update,
			createUser,
			createActor,
			cloneActor,
			recieveMessage,
			ssePartial,
		};
	};

	const roomControllers: Record<string, Record<string, RoomController>> = {};
	let lol: ReturnType<typeof _URLs.base> | undefined = undefined;

	return {
		get URL() {
			//! if you don't use the getter, then ts decides there's a circular dependency 🫵🏻👎🏻
			if (!lol) lol = _URLs.base();
			return lol;
		},
		createRoom: (uid: string, rid?: string) => {
			const _rid = rid || randomUUID();
			storage[_rid] = {
				id: _rid,
				title: 'new room',
				host: uid,
				users: [],
				actors: [],
				availableLanguages: [
					'Common',
					'Elvish',
					'Dwarvish',
					'Giant',
					'Goblin',
					'Orc',
					'Abyssal',
					'Celestial',
					'Draconic',
					'Deep Speech',
					'Infernal',
					'Primordial',
					'Sylvan',
					'Undercommon',
					'Aquan',
					'Auran',
					'Ignan',
					'Terran',
					'Druidic',
					"Thieves' Cant",
					'Sign Language',
					'THIS IS TO TEST TEXT OVERFLOW ZOOOOOOOOOOOOOWEEEEEEEEEEEEEEE',
				],
				messages: [],
			};

			return _rid;
		},
		roomController: (rid: string, uid: string): RoomController => {
			if (!roomControllers[rid])
				(roomControllers[rid] ??= {})[uid] = roomController(rid, uid);
			return roomControllers[rid][uid];
		},
	};
};

export const base = _controller();
