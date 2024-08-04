import Html from '@kitajs/html';
import { Actor, ChatMessage, Timestamp } from '../types/types';
import { parseTimestamp, toPrettyDate } from '../utils';
import { ActorLink, ActorPortrait } from './Actors';
import { RoomController } from '../controller';

export function ChatActorItem({
	room,
	actor,
	selected,
	side,
	targetId,
	children,
}: {
	room: RoomController;
	actor: Actor;
	selected: boolean;
	side: 'left' | 'right';
	targetId: string;
	children: JSX.Element;
}) {
	return (
		<label
			id={`chat-actor-${actor.id}`}
			class='chat-actor-item row'
			hx-trigger='click'
			hx-swap='none'
		>
			{children}
			{side === 'left' ? (
				<ActorLink room={room} actor={actor} side={side} targetId={targetId} />
			) : (
				''
			)}
			<ActorPortrait room={room} actor={actor} />
			{side === 'right' ? (
				<ActorLink room={room} actor={actor} side={side} targetId={targetId} />
			) : (
				''
			)}
		</label>
	);
}

export function FromActorsView({ room }: { room: RoomController }) {
	const actors = room
		.get('actors')
		.filter((actor) => actor.reserved === room.uid);
	const user = room.get('users').find((user) => user.id === room.uid)!;

	const isSelected = (actor: Actor) => actor.id === user.sendingFrom;

	return (
		<>
			{actors.map((actor) => (
				<ChatActorItem
					room={room}
					actor={actor}
					selected={isSelected(actor)}
					targetId='from-actor-tooltip'
					side='right'
				>
					<input
						name='from'
						type='radio'
						value={actor.id}
						checked={isSelected(actor)}
						hx-trigger='click'
						onclick='event.preventDefault()'
						hx-patch={room.URL.user(`/sendingFrom/${actor.id}`)}
					/>
				</ChatActorItem>
			))}
			<div id='from-actor-tooltip' class='actor-tooltip'></div>
		</>
	);
}

export function ToActorsView({ room }: { room: RoomController }) {
	const actors = room
		.get('actors')
		.filter((actor) => actor.reserved !== room.uid);
	const user = room.get('users').find((user) => user.id === room.uid)!;

	const isSelected = (actor: Actor) => user.sendingTo.includes(actor.id);

	return (
		<>
			{actors.map((actor) => (
				<ChatActorItem
					room={room}
					actor={actor}
					selected={isSelected(actor)}
					targetId='to-actor-tooltip'
					side='left'
				>
					<input
						name='to'
						type='checkbox'
						value={actor.id}
						checked={isSelected(actor)}
						hx-patch={room.URL.user(`/sendingTo/${actor.id}`)}
						hx-trigger='click'
						onclick='event.preventDefault()'
						hx-on:htmx-config-request='event.detail.parameters["usedCtrl"] = event.detail.triggeringEvent?.ctrlKey;'
					/>
				</ChatActorItem>
			))}
			<div id='to-actor-tooltip' class='actor-tooltip'></div>
		</>
	);
}

export function ChatItem({
	room,
	chat,
	timestamp,
}: {
	room: RoomController;
	chat: ChatMessage;
	timestamp: Timestamp;
}) {
	const sender = room.get('users', chat.userId);
	const speaker = room.get('actors', chat.actorId);
	const user = room.get('users', room.uid);
	const listener = room.get('actors', user.sendingFrom);

	const listenerKnows = listener.languages.known.includes(chat.language);
	const listenerIsFamiliar = listener.languages.familiar.includes(
		chat.language
	);

	return (
		<span class='chat-message'>
			<span style={{ float: 'inline-start', display: 'inline-flex' }}>
				<ActorPortrait room={room} actor={speaker} />
				<span
					class={'chat-actor-name'}
					data-language={
						listenerKnows || listenerIsFamiliar ? chat.language : 'Unknown'
					}
					data-date={timestamp.date}
					data-time={timestamp.time}
				>
					<br />[
					<ActorLink
						room={room}
						actor={speaker!}
						targetId='chat-actor-tooltip'
						side='right'
					/>
					]
				</span>
			</span>
			<br />
			<span>
				&nbsp;{chat.msgType.toLowerCase()}
				s:&nbsp;
			</span>
			<span class={'chat-bubble'} style={{ fontSize: '0.85rem' }}>
				{listenerKnows ? (
					chat.message
				) : listenerIsFamiliar ? (
					<em>The words sound familiar but you can't quite understand it...</em>
				) : (
					<em>
						You have no idea what <strong>{speaker.name}</strong> just said...
					</em>
				)}
			</span>
			<div class='chat-reply'></div>
			<small class='chat-sender'>(From: {sender?.name})</small>
		</span>
	);
}

export function ChatView({ room }: { room: RoomController }) {
	const _today = new Date();
	const _yesterday = new Date(_today.getDate() - 1);
	const today = _today.toLocaleDateString();
	const yesterday = _yesterday.toLocaleDateString();

	const messageGroups = room.get('messages').reduce((acc, curr, i) => {
		const timestamp = parseTimestamp(curr.timestamp, today, yesterday);

		if (acc[acc.length - 1]?.[0]?.[1]?.date !== timestamp.date) acc.push([]);
		(acc[acc.length - 1] ??= []).push([curr, timestamp]);

		return acc;
	}, [] as [ChatMessage, Timestamp][][]);

	return (
		<>
			{messageGroups.map((group) => (
				<div class='col chat-group'>
					<small class='chat-group-header'>
						{toPrettyDate(group[0][1].group)}
					</small>
					{group.map(([chat, timestamp]) => (
						<ChatItem room={room} chat={chat} timestamp={timestamp} />
					))}
				</div>
			))}
			<div id='chat-actor-tooltip' class='actor-tooltip'></div>
		</>
	);
}
