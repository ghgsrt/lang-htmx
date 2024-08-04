import Html from '@kitajs/html';
import { randomUUID } from 'crypto';
import { Actor } from '../types/types';
import { RoomController, base } from '../controller';
import { Multiselect } from '../components/Select';

export function ActorPortrait({
	room,
	actor,
}: {
	room: RoomController;
	actor: Actor;
}) {
	return (
		<div
			class='actor-portrait'
			style={{
				backgroundImage:
					actor.img &&
					`url(${room.URL.actor(`/${actor.id}/image/${actor.img}`)})`,
				backgroundSize: 'cover',
				backgroundRepeat: 'no-repeat',
			}}
		></div>
	);
}

export function ActorItem({
	room,
	actor,
	selected,
	disabled,
}: {
	room: RoomController;
	actor: Actor;
	selected: boolean;
	disabled: boolean;
}) {
	return (
		<label
			id={`actor-${actor.id}`}
			class={`actor-item col ${selected ? 'selected' : ''} ${
				disabled ? 'disabled' : ''
			}`}
			hx-get={room.URL.actor(`/${actor.id}/settings`)}
			hx-trigger='click'
			hx-target='#actor-settings'
			hx-swap='outerHTML'
		>
			<input
				name='actor'
				type='checkbox'
				value={actor.id}
				checked={selected}
				onclick='event.preventDefault()'
			/>
			<ActorPortrait room={room} actor={actor} />
			<p>{actor.name}</p>
			<small>{actor.id}</small>
		</label>
	);
}

export function ViewActorSettings({
	room,
	actor,
}: {
	room: RoomController;
	actor: Actor;
}) {
	const availableLanguages = room.get('availableLanguages');

	return (
		<>
			<div
				id='actor-settings'
				class='actor-view'
				hx-get={room.URL.actor(`/${actor.id}/settings`)}
				hx-trigger='sse:update:actors'
				hx-target='this'
				hx-swap='outerHTML'
			>
				<div class='row actor-view-header'>
					<ActorPortrait room={room} actor={actor} />
					<div class='col'>
						<h3>{actor.name}</h3>
						<small>{actor.id}</small>
					</div>
				</div>
				<br />
				{actor.reserved === room.uid || actor.reserved === '' ? (
					<button
						hx-patch={room.URL.actor(`/${actor.id}/reserve`)}
						hx-trigger='click'
						hx-target='this'
						hx-swap='none'
					>
						{actor.reserved ? 'release' : 'reserve'}
					</button>
				) : (
					''
				)}
				<br />
				<label for='settings--actor-name'>name</label>
				<input
					id='settings--actor-name'
					name='name'
					type='text'
					placeholder='name'
					value={actor.name}
					hx-patch={room.URL.actor(`/${actor.id}/name`)}
					hx-target='this'
					hx-swap='none'
				/>
				<br />
				<label for='settings--actor-id'>unique identifier</label>
				<input
					id='settings--actor-id'
					name='id'
					type='text'
					placeholder='unique id'
					value={actor.id}
					hx-patch={room.URL.actor(`/${actor.id}/id`)}
					hx-target='this'
					hx-swap='none'
				/>
				<br />
				<label for='settings--actor-color'>chat name color</label>
				<input
					style={{ color: actor.color }}
					id='settings--actor-color'
					name='color'
					type='text'
					placeholder='chat name color'
					value={actor.color}
					oninput='this.style.color = ""; this.style.color = this.value'
					hx-patch={room.URL.actor(`/${actor.id}/color`)}
					hx-target='this'
					hx-swap='none'
				/>
				<br />
				<label for='settings--actor-img'>portrait image</label>
				<input
					id='settings--actor-img'
					type='file'
					name='img'
					hx-encoding='multipart/form-data'
					hx-post={room.URL.actor(`/${actor.id}/image`)}
					hx-trigger="input from:[name='img']"
					hx-target='this'
					hx-swap='none'
				/>
				<br />
				<label for='settings--known-languages'>known languages</label>
				<div class='spacer'></div>
				<Multiselect
					id='settings--known-languages'
					options={availableLanguages}
					selected={actor.languages.known}
					action={room.URL.generated.actor(`/${actor.id}/languages/known`)}
				/>
				<br />
				<label for='settings--familiar-languages'>familiar languages</label>
				<div class='spacer'></div>
				<Multiselect
					id='settings--familiar-languages'
					options={availableLanguages.filter(
						(language) => !actor.languages.known.includes(language)
					)}
					selected={actor.languages.familiar}
					action={room.URL.generated.actor(`/${actor.id}/languages/familiar`)}
				/>
				<br />
			</div>
		</>
	);
}

export function ActorsView({ room }: { room: RoomController }) {
	let actors = room.get('actors').sort((a, b) => {
		if (a.reserved === room.uid && b.reserved !== room.uid) {
			return -1;
		} else if (a.reserved !== room.uid && b.reserved === room.uid) {
			return 1;
		} else if (a.reserved === '' && b.reserved !== '') {
			return -1;
		} else if (a.reserved !== '' && b.reserved === '') {
			return 1;
		} else if (a.reserved === b.reserved) {
			return a.name.localeCompare(b.name);
		} else {
			return a.reserved.localeCompare(b.reserved);
		}
	});

	return (
		<>
			<div class='actors-view'>
				<button hx-post={room.URL.actor('/')} hx-trigger='click' hx-swap='none'>
					create actor
				</button>
				{actors.map((actor) => (
					<ActorItem
						room={room}
						actor={actor}
						selected={actor.reserved === room.uid}
						disabled={actor.reserved !== room.uid && actor.reserved !== ''}
					/>
				))}
			</div>
		</>
	);
}

export function ActorTooltip({
	room,
	actor,
}: {
	room: RoomController;
	actor: Actor;
}) {
	return (
		<div
			class='actor-view'
			hx-get={room.URL.actor(`/${actor.id}/tooltip`)}
			hx-trigger='sse:update:actors'
			hx-target='this'
			hx-swap='outerHTML'
		>
			<h3>{actor.name}</h3>
			<small>{actor.id}</small>
			{actor.reserved === room.uid ? (
				<>
					<br />
					<p>{actor.languages.known.join(', ')}</p>
				</>
			) : (
				''
			)}
			{actor.bio ? (
				<>
					<br />
					<p>{actor.bio}</p>
				</>
			) : (
				''
			)}
			{/* user notes here pls */}
		</div>
	);
}

export function ActorLink({
	room,
	actor,
	side,
	targetId,
}: {
	room: RoomController;
	actor: Actor;
	side: 'left' | 'right';
	targetId: string;
}) {
	return (
		<span
			class='actor-link'
			style={{ color: actor.color }}
			hx-get={room.URL.actor(`/${actor.id}/tooltip`)}
			hx-trigger='mouseenter'
			hx-target={`#${targetId}`}
			hx-swap='innerHTML'
			hx-on:mouseenter={`this.setAttribute('data-timeoutId', setTimeout(() => {const rect = this.getBoundingClientRect(); const target = document.getElementById('${targetId}'); target.style.display = 'block'; const targetRect = target.getBoundingClientRect(); target.style.top = rect.top + 'px'; target.style.${'left'} = ${
				side === 'left'
					? 'rect.left - targetRect.right + targetRect.left'
					: 'rect.right'
			} + 'px';  console.log(targetRect.left, targetRect.right)}, 100))`}
			hx-on:mouseleave={`clearTimeout(this.getAttribute('data-timeoutId'));  const target = document.getElementById('${targetId}'); target.style.display = 'none';`}
		>
			{actor.name}
		</span>
	);
}
