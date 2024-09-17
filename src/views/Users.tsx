import Html from '@kitajs/html';
import { User } from '../types/types';
import { RoomController } from '../controller';
import { SSEPartial } from './SSEPartial';
import { _ChatActorsView, ChatView } from './Chat';
import { URLs } from '..';
import Modal from '../components/Modal';
import { byName } from '../utils';
import { redirect } from 'elysia';

export function CreateUser({
	uid,
	room,
	error,
}: {
	uid: string;
	room: RoomController;
	error?: string;
}) {
	return (
		<Modal
			uid={uid}
			message='choose your display name'
			error={error}
			target='#app'
			onConfirm={({ body }: any) => {
				if (body.displayName === '')
					return (
						<CreateUser uid={uid} room={room} error='please provide a value' />
					);

				const existing = room.users.find(byName(body.displayName));
				if (existing)
					return (
						<CreateUser
							uid={uid}
							room={room}
							error='a user with that name already exists'
						/>
					);

				room.createUser(uid, body.displayName);

				return redirect(URLs.room(room.id)('/'));
			}}
			onCancel={() => <script>{'window.location.reload()'}</script>}
		>
			<label>
				<input name='displayName' placeholder='display name' />
			</label>
		</Modal>
	);
}

export function UserTooltip({
	room,
	user,
}: {
	room: RoomController;
	user: User;
}) {
	return (
		<div
			class='actor-view'
			hx-get={URLs.room(room.id).user(`/${user.id}/tooltip`)}
			hx-trigger='sse:update:users'
			hx-target='this'
			hx-swap='outerHTML'
		>
			<h3 safe>{user.settings.displayName}</h3>
			<small safe>{user.id}</small>
			{/* {user.bio ? (
				<>
					<br />
					<p safe>{user.bio}</p>
				</>
			) : (
				''
			)} */}
			{/* user notes here pls */}
		</div>
	);
}

// export function UserItem({ room, user }: { room: RoomController; user: User }) {
// 	const targetId = 'users-tooltip';

// 	return (
// 		<>
// 			<Portrait room={room} item={user} />
// 			<span
// 				class={`item-link decorate`}
// 				style={{ color: user.settings.color }}
// 				hx-get={URLs.room(room.id).user(`/${user.id}/tooltip`)}
// 				hx-trigger={'mouseenter'}
// 				hx-target={`#${targetId}`}
// 				hx-swap='innerHTML'
// 				hx-on:mouseenter={`showTooltip(this, '${targetId}', 'left');`}
// 				hx-on:mouseleave={`hideTooltip(this, '${targetId}');`}
// 				safe
// 			>
// 				{user.settings.displayName}
// 			</span>
// 		</>
// 	);
// }

export function UsersChatUsersView({ room }: { room: RoomController }) {
	const online: User[] = [];
	const offline: User[] = [];

	for (const user of room.users)
		if (user.id === room.user.id) continue;
		else if (user.active) online.push(user);
		else offline.push(user);

	online.unshift(room.user);

	return (
		<>
			<div class='users-online-list'>
				<_ChatActorsView room={room} type='users' items={online} />
			</div>
			<div class='users-offline-list'>
				<_ChatActorsView room={room} type='users' items={offline} />
			</div>
			<div id='users-tooltip' class='item-tooltip'></div>
		</>
	);
}

export function UsersChatView({ room }: { room: RoomController }) {
	return <ChatView room={room} messages={room.userMessages} />;
}

export function UsersView({ room }: { room: RoomController }) {
	const SSE = SSEPartial(room);

	return (
		<form
			class='chat-form'
			hx-post={URLs.room(room.id).user('/send')}
			hx-trigger='submit'
			hx-swap='none'
			hx-on:htmx-after-request="if (event.detail.successful) document.getElementById('users-message-area').value = ''"
		>
			<div class='hidden'>
				<div class='row flex'>
					<SSE event='update:usersChatUsers' class='active-actors' />
					<SSE
						event='update:usersChat'
						scroll='bottom'
						tag='main'
						class='chat'
					/>
				</div>
				<div class='message-container'>
					<div class='message'>
						<textarea
							id='users-message-area'
							name='message'
							placeholder='message'
							// autocomplete="off"
							hx-on:input='resizeTextArea(event)'
							onkeydown='if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.target.nextSibling.click() }'
						/>
						<button type='submit'></button>
						<script>
							{`resizeTextArea({ target: document.querySelector('textarea') });`}
						</script>
					</div>
				</div>
			</div>
		</form>
	);
}
