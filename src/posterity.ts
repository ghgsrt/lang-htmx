{
	/* <div */
}
{
	/* // hx-get={actionURL(rid)( */
}
{
	/* // 	isOpen ? '/collapse-active-actors' : '/expand-active-actors'
			// )}
			// hx-trigger={isOpen ? 'mouseleave' : 'mouseover delay:500ms'}
			// hx-swap='none'
			// hx-on:mouseenter={ */
}
{
	/* // 	"document.querySelector('#aa-acceptMouseover').setAttribute('value', 'true')"
			// }
			// hx-on:mouseleave={
			// 	"document.querySelector('#aa-acceptMouseover').setAttribute('value', 'false')" */
}
{
	/* // }
			// hx-include='[name=aa-acceptMouseover]'
			// > */
}
// {/* <input
// id='aa-acceptMouseover'
// type='checkbox'
// name='aa-acceptMouseover'
// checked
// style={{ display: 'none' }}
// /> */}

// const remove = (prop: ArrayKeys<Room>, id: string) => {
// 	const idx = storage[rid][prop].findIndex(byId(id));
// 	if (idx === -1) return;

// 	storage[rid][prop].splice(idx, 1); // update "remote db"
// 	prop].splice(idx, 1);

// 	_onRemove[prop](id);
// 	if (prop !== 'messages') _sync[prop].__base?.();
// };
// const deleteFrom = <
// 	P extends ArrayKeys<Room>,
// 	I extends Room[P][number],
// 	K extends ArrayKeys<I>
// >(
// 	prop: P,
// 	item: I,
// 	key: K,
// 	value: I[K][number]
// ) => {
// 	if (!removeFromArray(item[key], value)) return false;

// 	_sync[prop].__base?.();
// 	//@ts-ignore -- can't be bothered
// 	_sync[prop][key]?.();

// 	return true;
// };
// deleteFrom('users', users[0], 'sendingTo', 's');

// const push = <P extends ArrayKeys<Room>, I extends Room[P]>(
// 	prop: P,
// 	...items: I
// ) => {
// 	storage[rid][prop].push(...(items as any)); // update "remote db"
// 	if (prop === 'messages') prop].push(...(items as any));
// 	else prop].push(...(items as any).map(asMutable(prop)));

// 	_onPush[prop](...items);
// };

// //! similar dumbass deal as below
// //! let me use implicit return types ts for the love of God
// //! if explicit works with no other changes, then implicit should too 😠
// type Controller = {
// 	URL: ReturnType<typeof _URLs.base>;
// 	createRoom: (uid: string, rid?: string) => string;
// 	roomController: (rid: string, uid: string) => RoomController;
// };

// //! fuck Typescript: circular dependency with URL (due to being used in room.derive [index.ts], putting it in the type for RoomRoutes, which is used in URL)
// //! explicit return type is the only fix (why does ts interpret it differently when the end result is literally fucking identical???)
// export type RoomController = {
// 	rid: string;
// 	uid: string;
// 	URL: ReturnType<typeof _URLs.room>;
// 	broadcast: TailParameters<typeof _broadcast>;
// 	sendTo: TailParameters<typeof _sendTo>;
// 	send: TailParameters<TailParameters<typeof _sendTo>>;
// 	init: (eventName?: SSEEventName) => void;
// 	get: <
// 		P extends ID extends undefined
// 			? keyof Room
// 			: Exclude<ArrayKeys<Room>, 'availableLanguages'>,
// 		ID extends string | undefined = undefined
// 	>(
// 		prop: P,
// 		id?: ID
// 	) => ID extends undefined ? Room[P] : Room[P][number];
// 	set: <P extends Exclude<keyof Room, ArrayKeys<Room>>>(
// 		prop: P,
// 		value: Room[P]
// 	) => void;
// 	push: <P extends ArrayKeys<Room>>(prop: P, ...values: Room[P]) => void;
// 	remove: <P extends ArrayKeys<Room>>(prop: P, id: string) => void;
// 	update: <P extends Exclude<ArrayKeys<Room>, 'availableLanguages'>>(
// 		prop: P,
// 		id: string,
// 		newValue:
// 			| Partial<Room[P][number]>
// 			| ((old: Room[P][number]) => Partial<Room[P][number]>),
// 		shouldBroadcast?: boolean
// 	) => void;
// 	createUser: () => void;
// 	createActor: () => Actor;
// 	cloneActor: (actorId: string) => Actor;
// 	createActorGroup: () => ActorGroup;
// 	cloneActorGroup: (actorId: string) => ActorGroup;
// 	recieveMessage: (message: ChatMessage) => void;
// 	ssePartial: (
// 		name: keyof typeof dataMap
// 	) => ReturnType<(typeof dataMap)[keyof typeof dataMap]>;
// };

// const _URLs = {
// 	room: (rid: string) => {
// 		const room = (path: RoomRoutes) => `/room/${rid}${path}`;
// 		room.validate = (path: RoomValidatorRoutes) =>
// 			`/room/${rid}/validate${path}`;
// 		room.user = (path: RoomUserRoutes) => `/room/${rid}/user${path}`;
// 		// room.settings = (path: RoomSettingsRoutes) =>
// 		// 	`/room/${rid}/settings${path}`;
// 		room.actor = (path: RoomActorRoutes) => `/room/${rid}/actor${path}`;
// 		room.actorGroup = (path: RoomActorGroupRoutes) =>
// 			`/room/${rid}/actor-group${path}`;

// 		const generated = (path: `/${string}`) => `/room/${rid}${path}`;
// 		generated.validate = (path: `/${string}`) => `/room/${rid}/validate${path}`;
// 		generated.user = (path: `/${string}`) => `/room/${rid}/user${path}`;
// 		generated.roomSettings = (path: `${string}`) =>
// 			`/room/${rid}/room-settings${path}`;
// 		generated.userSettings = (path: `${string}`) =>
// 			`/room/${rid}/user-settings${path}`;
// 		generated.actor = (path: `/${string}`) => `/room/${rid}/actor${path}`;
// 		generated.actorGroup = (path: `/${string}`) =>
// 			`/room/${rid}/actor-group${path}`;

// 		room.generated = generated;

// 		return room;
// 	},
// 	base: () => {
// 		const base = (path: BaseRoutes) => `${path}`;
// 		base.validate = (path: BaseValidatorRoutes) => `/validate${path}`;

// 		const generated = (path: `/${string}`) => `${path}`;
// 		generated.validate = (path: `/${string}`) => `/validate${path}`;
// 		generated.tab = (groupId: string | number, tab?: string | number) =>
// 			`/tab/${groupId}/${tab ?? ':tab'}`;

// 		base.generated = generated;

// 		return base;
// 	},
// };

// const _controller = (): Controller => {
// 	const roomController = (rid: string, uid: string): RoomController => {
// 		const broadcast: TailParameters<typeof _broadcast> = (eventName) => {
// 			_broadcast(rid, eventName);
// 		};
// 		const sendTo: TailParameters<typeof _sendTo> = (uid, eventName) => {
// 			_sendTo(rid, uid, eventName);
// 		};
// 		const send: TailParameters<typeof sendTo> = (eventName) => {
// 			_sendTo(rid, uid, eventName);
// 		};

// 		const init = (eventName?: SSEEventName) => {
// 			if (eventName) return send(eventName);

// 			for (const eventName in dataMap) send(eventName as SSEEventName);
// 		};

// 		const get = <
// 			P extends ID extends undefined
// 				? keyof Room
// 				: Exclude<ArrayKeys<Room>, 'availableLanguages'>,
// 			ID extends string | undefined = undefined
// 		>(
// 			prop: P,
// 			id?: ID
// 		): ID extends undefined ? Room[P] : Room[P][number] => {
// 			return id !== undefined
// 				? storage[rid][
// 						prop as Exclude<ArrayKeys<Room>, 'availableLanguages'>
// 				  ].find((item) => item.id === id)!
// 				: storage[rid][prop];
// 		};
// 		const set = <P extends Exclude<keyof Room, ArrayKeys<Room>>>(
// 			prop: P,
// 			value: Room[P]
// 		) => {
// 			storage[rid][prop] = value;
// 			broadcast(`update:${prop}`);
// 		};
// 		const push = <P extends ArrayKeys<Room>>(prop: P, ...values: Room[P]) => {
// 			storage[rid][prop].push(...(values as any));
// 			console.log('Pushed', prop, values);
// 			if (prop === 'actorGroups' || prop === 'actors') {
// 				broadcast(`update:actors`);
// 				broadcast(`update:chatFromActors`);
// 				broadcast(`update:chatToActors`);
// 				broadcast(`update:chat`);
// 			} else if (Object.hasOwn(dataMap, `update:${prop}`)) {
// 				broadcast(`update:${prop}` as SSEEventName);
// 			}
// 		};
// 		const remove = <P extends ArrayKeys<Room>>(prop: P, id: string) => {
// 			const idx = storage[rid][prop].findIndex((item) => item.id === id);
// 			if (idx !== -1) storage[rid][prop].splice(idx, 1);
// 			if (prop === 'actorGroups' || prop === 'actors') {
// 				broadcast(`update:actors`);
// 				broadcast(`update:chatFromActors`);
// 				broadcast(`update:chatToActors`);
// 				broadcast(`update:chat`);

// 				if (get('host') === uid) {
// 					for (const user of get('users')) {
// 						update('users', user.id, (old) => {
// 							const newValue: Partial<User> = {};

// 							if (old.sendingFrom === id) {
// 								newValue.sendingFrom =
// 									get('actors').find((actor) => actor.reserved === uid)?.id ??
// 									'';
// 							}
// 							if (old.sendingTo.includes(id)) {
// 								newValue.sendingTo = old.sendingTo.filter(
// 									(toId) => toId !== id
// 								);
// 							}

// 							return newValue;
// 						});
// 					}
// 				} else {
// 					update('users', uid, (old) => {
// 						const newValue: Partial<User> = {};

// 						if (old.sendingFrom === id) {
// 							newValue.sendingFrom =
// 								get('actors').find((actor) => actor.reserved === uid)?.id ?? '';
// 						}
// 						if (old.sendingTo.includes(id)) {
// 							newValue.sendingTo = old.sendingTo.filter((toId) => toId !== id);
// 						}

// 						return newValue;
// 					});
// 				}
// 			} else if (Object.hasOwn(dataMap, `update:${prop}`)) {
// 				broadcast(`update:${prop}` as SSEEventName);
// 			}
// 		};
// 		const update = <P extends Exclude<ArrayKeys<Room>, 'availableLanguages'>>(
// 			prop: P,
// 			id: string,
// 			newValue:
// 				| Partial<Room[P][number]>
// 				| ((old: Room[P][number]) => Partial<Room[P][number]>),
// 			shouldBroadcast: boolean = true
// 		) => {
// 			const idx = storage[rid][prop].findIndex((x) => x.id === id);
// 			if (idx === -1) return;

// 			const _newValue =
// 				typeof newValue === 'function'
// 					? newValue(storage[rid][prop][idx])
// 					: newValue;

// 			if (Object.entries(_newValue).length === 0) return;
// 			// if (storage[rid][prop][idx] === _newValue) return;

// 			storage[rid][prop][idx] = { ...storage[rid][prop][idx], ..._newValue };

// 			if (shouldBroadcast) {
// 				if (Object.hasOwn(dataMap, `update:${prop}`))
// 					broadcast(`update:${prop}` as SSEEventName);

// 				if (prop === 'actorGroups') {
// 					broadcast('update:actors');
// 					broadcast('update:chatFromActors');
// 					broadcast('update:chatToActors');
// 					broadcast('update:chat');
// 				} else if (prop === 'actors') {
// 					if ((_newValue as Partial<Actor>).reserved === '') {
// 						update(
// 							'users',
// 							uid,
// 							{
// 								sendingFrom:
// 									get('actors').find((actor) => actor.reserved === uid)?.id ??
// 									'',
// 							},
// 							false
// 						);
// 					}
// 					broadcast('update:chatFromActors');
// 					broadcast('update:chatToActors');
// 					broadcast('update:chat');
// 				} else if (prop === 'users') {
// 					if ((_newValue as Partial<User>).sendingFrom) {
// 						sendTo(id, 'update:chatFromActors');
// 						sendTo(id, 'update:chatToActors');
// 						sendTo(id, 'update:chat');
// 					}
// 					if ((_newValue as Partial<User>).sendingTo)
// 						sendTo(id, 'update:chatToActors');
// 				}
// 			}

// 			return storage[rid][prop][idx];
// 		};

// 		const createUser = () => {
// 			push('users', {
// 				id: uid,
// 				name: 'Anonymous',
// 				active: true,
// 				sendingFrom: '',
// 				sendingTo: [],
// 			});
// 		};

// 		const createActor = () => {
// 			const actor = {
// 				id: randomUUID(),
// 				name: 'Anonymous',
// 				languages: {
// 					known: [...get('roomSettings').defaultLanguages],
// 					familiar: [],
// 				},
// 				reserved: uid,
// 				img: '',
// 				color: '',
// 			};
// 			push('actors', actor);

// 			update(
// 				'users',
// 				uid,
// 				(old) => {
// 					if (old.sendingFrom === '') return { sendingFrom: actor.id };
// 					return {};
// 				},
// 				false
// 			);

// 			return actor;
// 		};
// 		const cloneActor = (actorId: string) => {
// 			const actor = get('actors', actorId);

// 			const clone = {
// 				...actor,
// 				userId: randomUUID(),
// 				reserved: uid,
// 			};
// 			push('actors', clone);

// 			update(
// 				'users',
// 				uid,
// 				(old) => {
// 					if (old.sendingFrom === '') return { sendingFrom: clone.id };
// 					return {};
// 				},
// 				false
// 			);

// 			return clone;
// 		};

// 		const createActorGroup = () => {
// 			const group = {
// 				id: randomUUID(),
// 				name: 'Anonymous Group',
// 				actorIds: [],
// 				img: '',
// 				color: '',
// 			};
// 			push('actorGroups', group);

// 			return group;
// 		};
// 		const cloneActorGroup = (groupId: string) => {
// 			const group = get('actorGroups', groupId);

// 			const clone = {
// 				...group,
// 			};
// 			push('actorGroups', clone);

// 			return clone;
// 		};

// 		const recieveMessage = (message: ChatMessage) => push('messages', message);

// 		const ssePartial = (name: keyof typeof dataMap) =>
// 			dataMap[name](base.roomController(rid, uid));

// 		const URL = _URLs.room(rid);

// 		return {
// 			rid,
// 			uid,
// 			URL,
// 			broadcast,
// 			sendTo,
// 			send,
// 			init,
// 			get,
// 			set,
// 			push,
// 			remove,
// 			update,
// 			createUser,
// 			createActor,
// 			cloneActor,
// 			createActorGroup,
// 			cloneActorGroup,
// 			recieveMessage,
// 			ssePartial,
// 		};
// 	};

// 	const roomControllers: Record<string, Record<string, RoomController>> = {};
// 	let lol: ReturnType<typeof _URLs.base> | undefined = undefined;

// 	const defaultRoomSettings: Partial<RoomSettings> = {
// 		onlyHostMayDeleteActorGroups: false,
// 		defaultLanguages: ['Common'],
// 		languages: ['Common'],
// 		defaultIntro: 'says',
// 		verbs: {
// 			yell: {
// 				color: 'lightblue',
// 				aliases: [] as string[],
// 			},
// 			whisper: {
// 				color: 'lightblue',
// 				aliases: [] as string[],
// 			},
// 			seduce: {
// 				color: 'lightblue',
// 				aliases: [] as string[],
// 			},
// 		},
// 	};

// 	const defaultUserSettings: Partial<UserSyttings> = {}

// 	return {
// 		get URL() {
// 			//! without the getter ts decides there's a circular dependency 🫵🏻👎🏻
// 			if (!lol) lol = _URLs.base();
// 			return lol;
// 		},
// 		createRoom: (uid: string, rid?: string) => {
// 			const _rid = rid || randomUUID();
// 			storage[_rid] = {
// 				id: _rid,
// 				title: 'new room',
// 				host: uid,
// 				users: [],
// 				actors: [],
// 				actorGroups: [],
// 				messages: [],
// 				roomSettings: deepClone(defaultRoomSettings),
// 			};

// 			return _rid;
// 		},
// 		roomController: (rid: string, uid: string): RoomController => {
// 			if (!roomControllers[rid])
// 				(roomControllers[rid] ??= {})[uid] = roomController(rid, uid);
// 			return roomControllers[rid][uid];
// 		},
// 	};
// };

// export const base = _controller();
