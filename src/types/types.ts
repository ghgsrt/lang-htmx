import { t } from 'elysia';
import { ArrayKeys } from './utils';

export type User = {
	id: string;
	name: string;
	active: boolean;
	sendingFrom: string;
	sendingTo: string[];
};

export type Actor = {
	id: string;
	name: string;
	languages: { known: string[]; familiar: string[] };
	reserved: User['id'];
	img: string;
	color: string;
};

export const actorSchema = t.Object({
	id: t.String(),
	name: t.String(),
	languages: t.Array(t.String()),
	reserved: t.String(),
});

// export type ActiveActor = {
// 	user: string;
// 	actorId: string;
// };

// export const activeActorSchema = t.Object({
// 	userId: t.String(),
// 	socketId: t.String(),
// });

export type Timestamp = {
	group: string;
	date: string;
	time: string;
};
// export type Processors = 'ChatMessage';

// type __Unprocessed<T extends ProcessorKey, A extends boolean = false> = {
// 	__processor: T;
// 	__noCache: A;
// };
// export type ProcessorKey = Exclude<ArrayKeys<Room>, 'availableLanguages'>;
// // <T extends Processable = Processable> =
// // T extends ChatMessage ? 'messages' : never;
// export type Processable<
// 	T extends Exclude<ArrayKeys<Room>, 'availableLanguages'> = Exclude<
// 		ArrayKeys<Room>,
// 		'availableLanguages'
// 	>
// > = Room[T][0];
// export type Unprocessed<T extends Processable = Processable> = T extends Room
// 	? __Room
// 	: T extends ChatMessage
// 	? __ChatMessage
// 	: T;
// export type __ChatMessage = __Unprocessed<'messages'> & {
// 	id: string;
// 	userId: string;
// 	actorId: string;
// 	message: string;
// 	language: string;
// 	timestamp: string;
// 	msgType: MessageType;
// 	to: string[];
// };
export type ChatMessage = {
	id: string;
	userId: string;
	actorId: string;
	message: string;
	language: string;
	// timestamp: Timestamp;
	timestamp: string;
	msgType: MessageType;
	to: string[];
};

// export type Processed<T extends Unprocessed> =
// 	T extends Unprocessed<ChatMessage> ? ChatMessage : never;

export type MessageType = 'say' | 'yell' | 'whisper' | 'telepathy';

export const chatMessageSchema = t.Object({
	actorId: t.String(),
	message: t.String(),
	language: t.String(),
	type: t.String(),
	to: t.Array(t.String()),
});

// export type __Room = {
// 	id: string;
// 	title: string;
// 	host: Unprocessed<User>['id'];
// 	users: Unprocessed<User>[];
// 	actors: Unprocessed<Actor>[]; // [username, [languages]]
// 	// activeActors: ActiveActor[]; // [username, socketId]
// 	availableLanguages: string[];
// 	messages: Unprocessed<ChatMessage>[]; // [username, message, language, timestamp]
// };

export type ColorsConfig = {
	getHexOptions: (search: string) => Set<string>;
	getRGBAOptions: (search: string) => Set<string>;
	getHSLAOptions: (search: string) => Set<string>;
	getPlainTextOptions: (search: string) => Set<string>;
	getColorOptions: (search: string) => Set<string>;
};

export type Room = {
	id: string;
	title: string;
	host: User['id'];
	users: User[];
	actors: Actor[]; // [username, [languages]]
	// activeActors: ActiveActor[]; // [username, socketId]
	availableLanguages: string[];
	messages: ChatMessage[]; // [username, message, language, timestamp]
};

export const roomSchema = t.Object({
	id: t.String(),
	title: t.String(),
	host: t.String(),
	users: t.Array(t.String()),
	actors: t.Array(actorSchema),
	// activeActors: t.Array(activeActorSchema),
	availableLanguages: t.Array(t.String()),
	messages: t.Array(chatMessageSchema),
});
