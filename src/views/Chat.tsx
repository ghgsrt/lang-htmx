import Html from '@kitajs/html';
import {
	Actor,
	ActorGroup,
	ChatMessage,
	RoomSettings,
	Safe,
	Timestamp,
	User,
	UserChatMessage,
} from '../types/types';
import { byId, escape, parseTimestamp, toPrettyDate } from '../utils';
import { ActorItem, Portrait } from './Actors';
import { RoomController } from '../controller';
import { AutoResizeInput } from '../components/AutoResizeInput';
import { Select } from '../components/Select';
import { redirect } from 'elysia';
import { Placeholder } from '../components/Placeholder';
import { URLs } from '..';
import sanitize from 'sanitize-html';

export function ChatItem({
	room,
	item,
	selected,
	side,
	targetId,
	plain,
	noPortrait,
	darkPortrait,
	children,
}: {
	room: RoomController;
	item: Actor | ActorGroup | User;
	selected: boolean;
	side: 'left' | 'right';
	targetId?: string;
	plain?: true;
	noPortrait?: true;
	darkPortrait?: true;
	children?: JSX.Element;
}) {
	const isUser = Object.hasOwn(item, 'active');

	return (
		<label
			id={`chat-${isUser ? 'user' : 'actor'}-${item.id}`}
			class={`chat-item row`}
			data-plain={plain}
			hx-swap='none'
		>
			{children as Safe}
			<ActorItem
				room={room}
				actor={item}
				side={side}
				targetId={targetId}
				link={!plain || undefined}
				tooltip={!plain || undefined}
				noPortrait={noPortrait}
				darkPortrait={darkPortrait}
			/>
		</label>
	);
}

export function ActiveFromActorItem({
	room,
	plain,
}: {
	room: RoomController;
	plain?: true;
}) {
	const fromId = room.user.sendingFrom;

	if (!fromId) return '';

	const activeFromActor = room.actors.find(byId(fromId))!;

	return (
		<>
			<span
				style={{
					float: 'inline-start',
					display: 'inline-flex',
					width: 'min-content',
					color: 'unset',
				}}
			>
				<Portrait room={room} item={activeFromActor} dark />
				<span
					id='select-language'
					class={'chat-message-actor-name'}
					data-selected={activeFromActor.knownLanguages[0]}
				>
					<Select
						dropdownStyle={{
							// marginBottom: '1rem',
							backgroundColor: 'var(--clr-background)',
							outlineColor: 'var(--clr-foreground)',
						}}
						id='select-language'
						name='language'
						options={activeFromActor.knownLanguages}
						customSelected={{ datasetOnly: true }}
						clientOnly
						openUp
						teleport
					/>
					<span>
						[
						<ActorItem
							room={room}
							actor={activeFromActor!}
							targetId='chat-actor-tooltip'
							side='left'
							noPortrait
						/>
						]
					</span>
				</span>
			</span>
		</>
	);
}
export function ActiveToActorItem({ room }: { room: RoomController }) {
	const toIds = room.user.sendingTo;
	if (toIds.length === 0) return '';
	const activeToActors = toIds.map(
		(actorId) =>
			room.actors.find(byId(actorId)) ?? room.actorGroups.find(byId(actorId))!
	);

	const fromActorId = room.user.sendingFrom;
	let values = activeToActors.map((actor) =>
		actor.id === fromActorId ? 'themself' : actor.name
	);
	let value = values[0];

	if (values.length > 1)
		for (let i = 1; i < values.length; i++) {
			if (i === values.length - 1) {
				value += ` and ${values[i]}`;
			} else {
				if (i === 1) value += ',';
				value += ` ${values[i]},`;
			}
		}

	return (
		<AutoResizeInput
			id='message-to'
			name='toActors'
			placeholder={value}
			value={value}
		/>
	);
}

export function _ChatActorsView({
	room,
	type,
	items,
}: {
	room: RoomController;
	type: 'to' | 'from' | 'users';
	items: Actor[] | ActorGroup[] | User[];
}) {
	const isSelected = (item: Actor | ActorGroup | User) =>
		type === 'users'
			? (item as User).active
			: 'from'
			? item.id === room.user.sendingFrom
			: room.user.sendingTo.includes(item.id);

	return (
		<>
			{items.map((item) => (
				<ChatItem
					room={room}
					item={item}
					selected={isSelected(item)}
					targetId={
						type === 'users' ? 'users-tooltip' : `${type}-actor-tooltip`
					}
					side={type === 'to' ? 'right' : 'left'}
				>
					{type === 'users' ? (
						''
					) : (
						<input
							name={type}
							type='checkbox'
							value={item.id}
							checked={isSelected(item)}
							hx-patch={URLs.room(room.id).user(`/sending-${type}/${item.id}`)}
							hx-trigger={
								type === 'to' || !isSelected(item) ? 'click' : undefined
							}
							onclick='event.preventDefault()'
							hx-on:htmx-config-request={
								type === 'to'
									? 'event.detail.parameters["usedCtrl"] = event.detail.triggeringEvent?.ctrlKey;'
									: undefined
							}
						/>
					)}
				</ChatItem>
			))}
		</>
	);
}
export function ChatFromActorsView({ room }: { room: RoomController }) {
	const actors = room.actors.filter(
		(actor: Actor) => actor.reserved === room.user.id
	);

	return (
		<>
			<_ChatActorsView room={room} type='from' items={actors} />
			<div id='from-actor-tooltip' class='item-tooltip'></div>
		</>
	);
}
export function ChatToActorsView({ room }: { room: RoomController }) {
	return (
		<>
			<div class='to-actors-list'>
				<_ChatActorsView room={room} type='to' items={room.actors} />
			</div>
			<div class='to-actor-groups-list'>
				<_ChatActorsView room={room} type='to' items={room.actorGroups} />
			</div>
			<div id='to-actor-tooltip' class='item-tooltip'></div>
		</>
	);
}

function determineMessageColor(
	intro: string,
	verbs: RoomSettings['verbs'],
	allVerbs: string[][]
) {
	const tokens = intro.split(' ');
	for (const verbage of allVerbs) {
		const asPrefix = verbs[verbage[0]].asPrefix;

		for (let token of tokens) {
			token = escape(token);

			if (asPrefix && verbage.some((verb) => token.startsWith(verb)))
				return `var(--clr-msg-type-prefixed-${verbage[0]})`;
			if (verbage.some((verb) => verb === token))
				return `var(--clr-msg-type-${verbage[0]})`;
		}
	}
	return 'unset';
}

export function ChatMessageItem({
	room,
	chat,
	timestamp,
}: {
	room: RoomController;
	chat: ChatMessage | UserChatMessage;
	timestamp: Timestamp;
}) {
	const sender = room.users.find(byId(chat.userId))!;
	const speaker = room.actors.find(byId((chat as any).actorId ?? ''));
	const listener = room.actors.find(byId(room.user.sendingFrom));
	const listenerKnows = listener?.knownLanguages.includes(
		(chat as any).language
	);
	const listenerIsFamiliar = listener?.familiarLanguages.includes(
		(chat as any).language
	);

	const verbs = room.settings.verbs;
	const allVerbs = Object.entries(verbs).map(([verb, props]) => [
		verb,
		...(props.aliases ?? []),
	]);

	return (
		<span
			class='chat-message'
			onclick={
				speaker
					? `reply('${URLs.room(room.id).user(`/sending-to/${speaker.id}`)}');`
					: undefined
			}
		>
			<span
				style={{
					float: 'inline-start',
					display: 'inline-flex',
					color: 'unset',
				}}
			>
				<Portrait room={room} item={speaker ?? sender} />
				<span
					class={'chat-message-actor-name'}
					data-selected={
						speaker
							? listenerKnows || listenerIsFamiliar
								? (chat as ChatMessage).language
								: 'Unknown'
							: ''
						//! MIGHT HAVE TO ESCAPE? AND IS IT SAFE???
					}
					data-date={timestamp.date}
					data-time={timestamp.time}
				>
					<span>
						[
						<ActorItem
							room={room}
							actor={speaker ?? sender}
							targetId={speaker ? 'chat-actor-tooltip' : 'users-tooltip'}
							side='left'
							link={!!speaker || undefined}
							tooltip
							noPortrait
						/>
						]
					</span>
				</span>
			</span>
			<span
				style={
					speaker
						? {
								color: `${determineMessageColor(
									(chat as ChatMessage).intro,
									verbs,
									allVerbs
								)}`,
						  }
						: {}
				}
			>
				<br />
				{(chat as ChatMessage).intro ? (
					<span class='chat-message-intro' safe>
						&nbsp;{(chat as ChatMessage).intro}:&nbsp;
					</span>
				) : (
					':&nbsp;'
				)}
				<span
					class='chat-message-bubble'
					style={{
						fontSize: '0.85rem',
					}}
				>
					{listenerKnows || !speaker ? (
						<span>
							{
								sanitize(chat.message, {
									allowedTags: ['em', 'strong'],
								}) as Safe
							}
						</span>
					) : listenerIsFamiliar ? (
						<em style={{ color: 'var(--clr-sys)' }}>
							The words sound familiar but you can't quite understand it...
						</em>
					) : (
						<em style={{ color: 'var(--clr-sys)' }}>
							You have no idea what <strong safe>{speaker.name}</strong> just
							said...
						</em>
					)}
				</span>
			</span>
			{speaker && (
				<div
					style={{
						width: '100%',
						whiteSpace: 'nowrap',
						overflowY: 'hidden',
					}}
				>
					<small class='chat-message-sender' safe>
						(From: {sender.settings.displayName})
					</small>
				</div>
			)}
		</span>
	);
}

export function ChatView({
	room,
	messages,
}: {
	room: RoomController;
	messages?: (ChatMessage | UserChatMessage)[];
}) {
	const _today = new Date();
	const _yesterday = new Date(_today.getDate() - 1);
	const today = _today.toLocaleDateString();
	const yesterday = _yesterday.toLocaleDateString();

	const messageGroups = (messages ?? room.messages).reduce((acc, curr) => {
		const timestamp = parseTimestamp(curr.timestamp, today, yesterday);

		if (acc[acc.length - 1]?.[0]?.[1]?.date !== timestamp.date) acc.push([]);
		(acc[acc.length - 1] ??= []).push([curr, timestamp]);

		return acc;
	}, [] as [ChatMessage | UserChatMessage, Timestamp][][]);

	return (
		<>
			{messageGroups.length === 0 ? (
				<Placeholder for='room' pKey='chat' args={[room]} />
			) : (
				messageGroups.map((group) => (
					<div class='col chat-group'>
						<small class='chat-group-header' safe>
							{toPrettyDate(group[0][1].group)}
						</small>
						{group.map(([chat, timestamp]) => (
							<ChatMessageItem room={room} chat={chat} timestamp={timestamp} />
						))}
					</div>
				))
			)}
			<div id='chat-actor-tooltip' class='item-tooltip'></div>
		</>
	);
}
