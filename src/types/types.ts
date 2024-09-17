import { equals } from '../utils';
import { PartiallyPartial, PrimitiveKeys } from './utils';

export type User = SyncableObject<{
	id: string;
	active: boolean;
	sendingFrom: string;
	sendingTo: SyncableArray<string>;
	settings: UserSettings;
}>;

export type Actor = SyncableObject<{
	id: string;
	name: string;
	img: string;
	color: string;
	knownLanguages: SyncableArray<string>;
	familiarLanguages: SyncableArray<string>;
	reserved: string;
}>;

export type ActorGroup = SyncableObject<{
	id: string;
	name: string;
	img: string;
	color: string;
	actorIds: SyncableArray<string>;
}>;

export type Timestamp = {
	group: string;
	date: string;
	time: string;
};
export type ChatMessage = {
	id: string;
	userId: string;
	actorId: string;
	message: string;
	language: string;
	timestamp: string;
	intro: string;
	to: SyncableArray<string>;
};
export type UserChatMessage = {
	id: string;
	userId: string;
	message: string;
	timestamp: string;
};

export type RoomSettings = {
	roomName: string;
	roomId: string;
	host: string;
	onlyHostMayDeleteActorGroups: boolean;
	defaultLanguages: string[];
	languages: string[];
	defaultIntro: string;
	verbs: {
		[key: string]: {
			color: string;
			asPrefix?: boolean;
			aliases?: string[];
		};
	};
};

export type UserSettings = {
	displayName: string;
	color: string;
	img: string;
	defaultIntro: string;
	styles: {
		'--clr-foreground': string;
		'--clr-background': string;
		'--clr-accent': string;
		'--clr-sys': string;
		'--clr-error': string;
		'--clr-error-bg': string;
		'--clr-text': string;
		'--clr-text-disabled': string;
		'--clr-text-select': string;

		'--clr-settings-declaration': string;
		'--clr-settings-bracket': string;
		'--clr-settings-property': string;
		'--clr-settings-quote': string;
		'--clr-settings-text': string;
		'--clr-settings-variable': string;
		'--clr-settings-special': string;
		'--clr-settings-number': string;
		'--clr-settings-boolean': string;
	};
};

export type Room = {
	id: string;
	hostId: string;
	users: SyncableArray<User>;
	actors: SyncableArray<Actor>;
	actorGroups: SyncableArray<ActorGroup>;
	messages: ChatMessage[];
	userMessages: UserChatMessage[];
	settings: RoomSettings;
};

export type Safe = unknown;
// export const Safe = (nonXSSVulnerability: JSX.Element | JSX.Element[]) =>
// 	nonXSSVulnerability as unknown as Safe;

//!!! ==========================================================================================
//!!!  "badPractice.ts"
//!!! ==========================================================================================
//!!! IF THESE ARE IN THEIR OWN FILE, TS DECIDES CIRCULAR DEPENDENCY 😠
//!!! ==========================================================================================

Array.prototype.delete = function (by: any) {
	const idx =
		typeof by === 'function' ? this.findIndex(by) : this.findIndex(equals(by));
	if (idx === -1) return false;

	this.splice(idx, 1);
	return true;
};
Array.prototype.toggle = function (value: any) {
	const result = this.delete(value);
	if (!result) this.push(value);

	return !result;
};
Array.prototype.joinFns = function (...args: any[]) {
	return () => {
		const results: any[] = [];
		for (const fn of this) results.push(fn(...args));

		return results;
	};
};

declare global {
	interface Array<T> {
		delete: T extends Record<string, any>
			? (by: (item: T) => boolean) => boolean
			: (value: T) => boolean;
		toggle: (value: T) => boolean;
		joinFns: T extends (...args: any[]) => any
			? () => (...args: Parameters<T>) => ReturnType<T>[]
			: undefined;
	}
}

//!!! ==========================================================================================
//!!!  "sync.ts"
//!!! ==========================================================================================
//!!! IF THESE ARE IN THEIR OWN FILE, TS DECIDES CIRCULAR DEPENDENCY 😠
//!!! ==========================================================================================

export type SyncPrimitiveFn<T = any> = (newValue: T, prevValue: T) => void;
export type SyncArrayFn<A extends any[] = any[]> = <M extends ArrayMutation>(
	mutation: M,
	value: ReturnType<A[M]>,
	propsOrPrev: Parameters<A[M]>
) => void;
export type SyncFn<T> = T extends any[] ? SyncArrayFn<T> : SyncPrimitiveFn<T>;
export type BaseSyncFn = () => void;

export type SyncArray<A extends any[]> = {
	__item?: (
		item: A[number]
	) => A[number] extends any[]
		? SyncArray<A[number]>
		: A[number] extends Record<string, any>
		? SyncMap<A[number]>
		: undefined;
} & {
	[M in ArrayMutation]?: (args: ReturnType<A[M]>) => void;
} & { __base?: BaseSyncFn };
export type SyncMap<
	BaseObj extends {} = Record<string, any>,
	MutableProps extends keyof BaseObj = keyof BaseObj
> = {
	[K1 in MutableProps]?: BaseObj[K1] extends any[]
		? SyncArray<BaseObj[K1]>
		: BaseObj[K1] extends Record<string, any>
		? SyncMap<BaseObj[K1]>
		: SyncFn<BaseObj[K1]>;
} & { __base?: BaseSyncFn };
export type SyncArrayItemFn<A> = (
	__item: A
) => A extends any[]
	? SyncArray<A>
	: A extends Record<string, any>
	? SyncMap<Pick<A, PrimitiveKeys<A>>>
	: undefined;

export type SyncableArray<T = any> = T[] & {
	set: (value: T[]) => void;
	sync: (syncer: [BaseSyncFn[], SyncArray<T[]> | SyncArrayItemFn<T[]>]) => void;
} & {
	push: (...items: StripSync<T>[]) => number;
	unshift: (...items: StripSync<T>[]) => number;
	fill: (value: StripSync<T>, start?: number, end?: number) => StripSync<T>[];
};
export type SyncableObject<
	T extends {
		// [key in keyof T]: T[key] extends any[]
		// 	? SyncableArray<T[key][number]>
		// 	: T[key] extends Record<string, any>
		// 	? SyncableObject<T[key]>
		// 	: T[key];
	} = Record<string, any>
> = T & {
	set: <K extends PrimitiveKeys<T>>(key: K, value: T[K]) => void;
	sync: (
		syncer: [
			BaseSyncFn[],
			SyncMap<Pick<T, PrimitiveKeys<T>>> | SyncArrayItemFn<T>
		]
	) => void;
};
export type Syncable<T> = T extends any[]
	? SyncableArray<T>
	: T extends Record<string, any>
	? SyncableObject<T>
	: never;

type _StripSync<T> = PartiallyPartial<T, 'set' | 'sync'>;
type _StripSyncArray<T extends any[]> = T[number] extends any[]
	? _StripSync<_StripSyncArray<T[number]>> & {
			push: (...items: StripSync<T>[]) => number;
			unshift: (...items: StripSync<T>[]) => number;
			fill: (
				value: StripSync<T>,
				start?: number,
				end?: number
			) => StripSync<T>[];
	  }
	: T[number] extends Record<string, any>
	? StripSync<T[number]>
	: T;
export type StripSync<T> = T extends any[]
	? _StripSync<_StripSyncArray<T>> & {
			push: (...items: StripSync<T>[]) => number;
			unshift: (...items: StripSync<T>[]) => number;
			fill: (
				value: StripSync<T>,
				start?: number,
				end?: number
			) => StripSync<T>[];
	  }
	: T extends Record<string, any>
	? _StripSync<{ [K in keyof T]: StripSync<T[K]> }>
	: T;

export type Syncer<O extends Record<string, any>> = {
	[K in keyof O]: O[K] extends any[]
		? [BaseSyncFn[], SyncArray<O[K][]>] & {
				item: [
					BaseSyncFn[],
					SyncArrayItemFn<Pick<O[K][number], PrimitiveKeys<O[K][number]>>>
				];
		  }
		: O[K] extends Record<string, any>
		? [BaseSyncFn[], Syncer<O[K]>]
		: [BaseSyncFn[], SyncMap<Pick<O[K], PrimitiveKeys<O[K]>>>]; //? shouldn't this be throwing an error bc O[K] should be guaranteed not to be an object or array by this point???
};

export function SyncableArray<T>(arr?: T[]) {
	arr ??= [];

	(arr as unknown as SyncableArray<T>).sync = function ([base, sync]) {
		const temp: T[] = [];
		_asSyncedArray(temp, base, typeof sync === 'function' ? sync(this) : sync);

		//@ts-ignore -- ts dumb
		for (const mutation of arrayMutations) arr[mutation] = temp[mutation];
	};
	(arr as unknown as SyncableArray<T>).set = (value) => {
		if (arr === value) return;

		arr.splice(0, arr.length, ...value);
	};

	return arr as unknown as SyncableArray<T>;
}
export function SyncableObject<T extends Record<string, any>>(obj?: T) {
	obj ??= {} as T;

	let _base: BaseSyncFn[];
	let _syncMap: SyncMap<Pick<T, PrimitiveKeys<T>>> | undefined;
	(obj as unknown as SyncableObject<T>).sync = function ([base, syncMap]) {
		_base = base;
		//@ts-ignore -- no idea and the types all work as expected otherwise so not worth wasting time
		_syncMap = typeof syncMap === 'function' ? syncMap(this) : syncMap;
	};
	(obj as unknown as SyncableObject<T>).set = (key, value) => {
		if (obj[key] === value) return;

		const prev = obj[key];
		obj[key] = value;

		for (const base of _base) base();
		(_syncMap?.[key] as SyncPrimitiveFn)?.(value, prev);
	};

	return obj as unknown as SyncableObject<T>;
}

const arrayMutations = [
	'push',
	'pop',
	'shift',
	'unshift',
	'fill',
	'reverse',
	'sort',
	'splice',
	'copyWithin',
	'delete', //? calls splice
	'toggle', //? calls delete or push
] as const;
type ArrayMutation = (typeof arrayMutations)[number];

const mutationsReliesOnOtherMutations = ['delete', 'toggle'];
const arrayAdditions = ['push', 'unshift', 'fill', 'splice'];

const _asSyncedArray = <A>(
	arr: A[],
	base: BaseSyncFn[],
	sync?: SyncArray<A[]>
) => {
	SyncableArray(arr);

	const _base = sync?.__base ? [sync.__base, ...base] : [...base];
	const syncItems = (items: A[]) => {
		for (const item of items)
			if (typeof item === 'object')
				Array.isArray(item)
					? _asSyncedArray(
							item,
							_base,
							sync?.__item?.(item) as SyncArray<A[][]> //? A[][] ?????
					  )
					: _asSynced(item as Record<string, any>, _base, sync?.__item?.(item));
	};

	for (const mutation of arrayMutations) {
		const oldMutation: (...args: any[]) => any = arr[mutation];
		//@ts-ignore
		arr[mutation] = ((...args) => {
			const result = oldMutation.apply(arr, args);

			if (sync?.__item && arrayAdditions.includes(mutation)) {
				if (mutation === 'splice') syncItems(args.slice(2));
				else if (mutation === 'fill') syncItems([args[0]]);
				else syncItems(args);
			}

			if (!mutationsReliesOnOtherMutations.includes(mutation)) {
				//@ts-ignore
				//? for whatever reason having 'toggle' as a mutation causes ts to throw a fit
				//? and claim the param type is never 🤷🏻‍♂️
				sync?.[mutation]?.(result);
				sync?.__base?.();
				for (const sync of base) sync();
			}

			return result;
		}) as typeof oldMutation;
	}

	if (sync?.__item) syncItems(arr);

	//@ts-ignore
	const syncer: [BaseSyncFn[], SyncArray<A[]> | undefined] & {
		item: [BaseSyncFn[], SyncArrayItemFn<A> | undefined];
	} = [base, sync];
	syncer.item = [base, sync?.__item];

	return syncer;
};

const _asSynced = <O extends Record<string, any>, S extends SyncMap<O>>(
	obj: O,
	base: BaseSyncFn[],
	sync?: S
) => {
	if (sync?.__base) base.unshift(sync.__base);

	SyncableObject(obj);
	obj.sync([[...base], sync]);

	const syncer: Record<string, any> = {};

	for (const key in obj) {
		if (typeof obj[key] === 'object') {
			if (Array.isArray(obj[key])) {
				syncer[key] = _asSyncedArray(
					obj[key],
					[...base],
					sync?.[key] as SyncArray<any[]>
				);
			} else if (sync?.[key])
				syncer[key] = _asSynced(obj[key], [...base], sync?.[key]);
		}
	}

	return [[...base], syncer];
};

export const sync = <O extends Record<string, any>, S extends SyncMap<O>>(
	obj: O,
	sync: S
): Syncer<O> => _asSynced(obj, [], sync)[1] as unknown as Syncer<O>;
