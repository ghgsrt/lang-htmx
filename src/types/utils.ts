import { treaty } from '@elysiajs/eden';
import Elysia from 'elysia';

export type ArrayKeys<T extends Record<string, any>> = {
	[K in keyof T]: T[K] extends any[] ? K : never;
}[keyof T];
export type ObjectKeys<T extends Record<string, any>> = {
	[K in Exclude<keyof T, ArrayKeys<T>>]: T[K] extends Record<string, any>
		? K
		: never;
}[Exclude<keyof T, ArrayKeys<T>>];
export type PrimitiveKeys<T extends Record<string, any>> = Exclude<
	keyof T,
	ArrayKeys<T> | ObjectKeys<T>
>;

// https://stackoverflow.com/a/52490977
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
	? R
	: _TupleOf<T, N, [T, ...R]>;
export type Tuple<T, N extends number> = N extends N
	? number extends N
		? T[]
		: _TupleOf<T, N, []>
	: never;

export type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;
export type TailParameters<T extends (...args: any[]) => any> = (
	...args: Tail<Parameters<T>>
) => ReturnType<T>;

type _LengthOfObject<T extends object, K extends keyof T = keyof T> = [
	K
] extends [never]
	? []
	: K extends K
	? [0, ..._LengthOfObject<Omit<T, K>>]
	: never;
export type LengthOfObject<T extends object> = _LengthOfObject<T>['length'] &
	number;

export type ArrayOfLenKeys<O extends object, T = any> = Tuple<
	T,
	LengthOfObject<O>
>;

declare function tag<T>(strs: TemplateStringsArray, ...args: T[]): T;
export type Join<T extends string[], D extends string> = T extends []
	? ''
	: T extends [infer Head, ...infer Tail]
	? Tail extends string[]
		? `${`${Head & string}`}${`${Tail['length'] extends 0 ? '' : D}${Join<
				Tail,
				D
		  >}`}`
		: null
	: undefined;

export type NoSlash<T extends string> = T extends `${string}/${string}`
	? never
	: T;
export type GetPaths<T, FirstPass extends boolean = true> =
	| (T extends (...args: infer P) => infer R
			? P[0] extends object
				? `/${Join<ArrayOfLenKeys<P[0], string>, '/'>}${GetPaths<R, false>}`
				: never
			: never)
	| {
			[K in keyof T]: K extends
				| 'get'
				| 'post'
				| 'delete'
				| 'put'
				| 'patch'
				| 'index'
				? K extends 'index'
					? FirstPass extends true
						? '/' // base route (literally just the single '/' case)
						: '' // no trailing / on a subroute's index (e.g., /actor/${string}/settings/  <-- No)
					: '' // no trailing / on any other subroute
				: `/${K & string}${GetPaths<T[K], false>}`;
	  }[keyof T];

export type EdenTreaty<
	T extends Elysia<any, any, any, any, any, any, any, any>
> = ReturnType<typeof treaty<T & { derive: any }>>;

export type IsMapped<T> = string extends keyof T ? true : false;

export type ExtractArray<T> = T extends (infer U)[] ? T : never;
export type ValueOrArray<T> = T | ValueOrArray<T>[];

export type PartiallyPartial<T, K extends string> = Omit<T, K> &
	//@ts-ignore
	Partial<Pick<T, K>>;
