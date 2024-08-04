// import { storage } from '.';
// import { ChatMessage, Room, User } from './types/types';

// const __templates = await Bun.file('./src/templates.html').text();
// const _templates = __templates
// 	.split('///')
// 	.map((x) => x.replaceAll('\r\n', '').trim())
// 	.filter((x) => x.length > 0);

// const T: Record<string, string> = {};
// for (let i = 0; i < _templates.length; i += 2) {
// 	T[_templates[i]] = _templates[i + 1];
// }

// export function TIndex(body: string) {
// 	return T['Index'].replaceAll('$$body', body);
// }

// export function THomeView() {
// 	return TIndex(T['Home View']);
// }

// export function TCreateRoom() {
// 	return T['Create Room View'];
// }

// export function TRoomView(room: Room) {
// 	return T['Room View']
// 		.replaceAll('$$rid', room.id)
// 		.replaceAll('$$title', room.title)
// 		.replaceAll('$$chat', TChatView(room.id))
// 		.replaceAll('$$users', TUsersView(room.id));
// }

// export function TUsersView(rid: string) {
// 	return T['Users View']
// 		.replaceAll('$$rid', rid)
// 		.replaceAll('$$users', TUsersBody(rid));
// }

// export function TUsersBody(rid: string) {
// 	console.log(storage[rid].users);
// 	return storage[rid].users.map(TUser).join('');
// }

// export function TUser(user: User) {
// 	return T['User']
// 		.replaceAll('$$userId', user.userId)
// 		.replaceAll('$$username', user.username);
// }

// export function TChatMessage(rid: string, chat: ChatMessage) {
// 	let user = storage[rid]?.users?.find((x) => x.userId === chat.userId);

// 	return T['Chat Message']
// 		.replaceAll('$$username', user?.username ?? chat.userId)
// 		.replaceAll('$$message', chat.message)
// 		.replaceAll('$$language', chat.language)
// 		.replaceAll('$$timestamp', chat.timestamp);
// }

// export function TChatView(rid: string) {
// 	return T['Chat View']
// 		.replaceAll('$$rid', rid)
// 		.replaceAll('$$chat', TChatBody(rid));
// }

// export function TChatBody(rid: string) {
// 	return storage[rid].messages.map((x) => TChatMessage(rid, x)).join('');
// }

// create processor for replacing $$<key> with values specified in the func
// const template = applyArgs(T['Room View'], { channelId: room.id, title: room.title });
