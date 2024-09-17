import Html from '@kitajs/html';
import { randomUUID } from 'crypto';
import { Actor, ActorGroup, User } from '../types/types';
import { RoomController, base } from '../controller';
import { Multiselect } from '../components/Select';
import { ChatItem } from './Chat';
import { URLs } from '..';

export function Portrait({
	room,
	item,
	dark,
}: {
	room: RoomController;
	item: Actor | ActorGroup | User;
	dark?: boolean;
}) {
	const img = (item as any).settings
		? (item as User).settings.img
		: (item as Actor | ActorGroup).img;

	return (
		<div
			class='actor-portrait'
			style={{
				backgroundImage:
					img &&
					`url(${URLs.room(room.id)[
						Object.hasOwn(item, 'active') ? 'user' : 'actor'
					](`/${item.id}/image/${img}`)})`,
				backgroundSize: 'cover',
				backgroundRepeat: 'no-repeat',
				backgroundColor: dark
					? 'var(--clr-background)'
					: 'var(--clr-foreground)',
			}}
		></div>
	);
}

type ActorSettings = {
	actor: Actor;
	group?: never;
	disabled?: boolean;
};
type ActorGroupSettings = {
	group: ActorGroup;
	actor?: never;
	disabled?: never;
};
export function ActorSettingsItem({
	room,
	actor,
	group,
	selected,
	disabled,
}: {
	room: RoomController;
	selected?: boolean;
} & (ActorSettings | ActorGroupSettings)) {
	return (
		<label
			id={`actor-${(actor ?? group).id}`}
			class={`actor-item col ${selected ? 'selected' : ''} ${
				disabled ? 'disabled' : ''
			}`}
			hx-get={URLs.room(room.id)[actor ? 'actor' : 'actorGroup'](
				`/${(actor ?? group).id}/settings`
			)}
			hx-trigger='click'
			hx-target='#actor-settings'
			hx-swap='outerHTML'
		>
			<input
				name='actor'
				type='checkbox'
				value={(actor ?? group).id}
				checked={selected}
				onclick='event.preventDefault()'
			/>
			<Portrait room={room} item={actor ?? group} />
			<p safe>{(actor ?? group).name}</p>
			<small safe>{(actor ?? group).id}</small>
		</label>
	);
}

export function ViewActorSettings({
	room,
	actor,
	oob,
}: {
	room: RoomController;
	actor: Actor;
	oob?: true;
}) {
	const availableLanguages = room.settings.languages;

	const roomURL = URLs.room(room.id);

	const readonly =
		actor.reserved !== room.user.id && room.hostId !== room.user.id;

	return (
		<>
			{oob ? <div role='oob-slave'></div> : ''}
			<div
				id='actor-settings'
				data-actor={actor.id}
				class='actor-view'
				hx-get={roomURL.actor(`/${actor.id}/settings`)}
				hx-trigger='sse:update:actors, sse:update:actorSettings'
				hx-target='#actor-settings'
				hx-swap={oob ? undefined : 'innerHTML'}
				hx-swap-oob={oob ? 'true' : undefined}
			>
				<script>{`document.getElementById('actors-view').querySelector(':scope > div > .viewing-settings')?.classList.remove('viewing-settings'); document.getElementById('actor-${actor.id}').classList.add('viewing-settings');`}</script>
				<div class='row actor-view-header'>
					<Portrait room={room} item={actor} />
					<div class='col'>
						<h3 safe>{actor.name}</h3>
						<small safe>{actor.id}</small>
					</div>
				</div>
				<br />
				{room.hostId === room.user.id ||
				actor.reserved === room.user.id ||
				actor.reserved === '' ? (
					<button
						hx-patch={roomURL.actor(`/${actor.id}/reserve`)}
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
					hx-patch={roomURL.actor(`/${actor.id}/name`)}
					hx-target='this'
					hx-swap='none'
					readonly={readonly}
				/>
				<br />
				<label for='settings--actor-id'>unique identifier</label>
				<input
					id='settings--actor-id'
					name='id'
					type='text'
					placeholder='unique id'
					value={actor.id}
					hx-patch={roomURL.actor(`/${actor.id}/id`)}
					hx-target='this'
					hx-swap='none'
					readonly={readonly}
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
					hx-patch={roomURL.actor(`/${actor.id}/color`)}
					hx-target='this'
					hx-swap='none'
					readonly={readonly}
				/>
				<br />
				<label for='settings--actor-img'>portrait image</label>
				<input
					id='settings--actor-img'
					type='file'
					name='img'
					hx-encoding='multipart/form-data'
					hx-post={roomURL.actor(`/${actor.id}/image`)}
					hx-trigger="input from:[name='img']"
					hx-target='this'
					hx-swap='none'
					readonly={readonly}
				/>
				<br />
				<label for='settings--known-languages'>known languages</label>
				<div class='spacer'></div>
				<Multiselect
					id='settings--known-languages'
					options={availableLanguages}
					selected={actor.knownLanguages}
					action={roomURL.actor(`/${actor.id}/languages/known`)}
					readonly={readonly}
				/>
				<br />
				<label for='settings--familiar-languages'>familiar languages</label>
				<div class='spacer'></div>
				<Multiselect
					id='settings--familiar-languages'
					options={availableLanguages.filter(
						(language) => !actor.knownLanguages.includes(language)
					)}
					selected={actor.familiarLanguages}
					action={roomURL.actor(`/${actor.id}/languages/familiar`)}
					readonly={readonly}
				/>
				<br />

				{!readonly ? (
					<button
						class='delete'
						hx-delete={roomURL.actor(`/${actor.id}`)}
						hx-swap='none'
					>
						delete
					</button>
				) : (
					''
				)}
			</div>
		</>
	);
}
export function ViewActorGroupSettings({
	room,
	group,
	oob,
}: {
	room: RoomController;
	group: ActorGroup;
	oob?: true;
}) {
	const actors = room.actors;

	const groups = room.actorGroups.filter((_group) => _group.id !== group.id);

	const roomURL = URLs.room(room.id);

	return (
		<>
			{oob ? <div role='oob-slave'></div> : ''}
			<div
				id='actor-settings'
				class='actor-view'
				hx-get={roomURL.actorGroup(`/${group.id}/settings`)}
				hx-trigger='sse:update:actors, sse:update:actorSettings'
				hx-target='#actor-settings'
				hx-swap={oob ? undefined : 'innerHTML'}
				hx-swap-oob={oob ? 'true' : undefined}
			>
				<script>{`document.getElementById('actors-view').querySelector(':scope > div > .viewing-settings')?.classList.remove('viewing-settings');  document.getElementById('actor-${group.id}').classList.add('viewing-settings');`}</script>
				<div class='row actor-view-header'>
					<Portrait room={room} item={group} />
					<div class='col'>
						<h3 safe>{group.name}</h3>
						<small safe>{group.id}</small>
					</div>
				</div>
				<br />
				<label for='settings--actor-name'>name</label>
				<input
					id='settings--actor-name'
					name='name'
					type='text'
					placeholder='name'
					value={group.name}
					hx-patch={roomURL.actorGroup(`/${group.id}/name`)}
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
					value={group.id}
					hx-patch={roomURL.actorGroup(`/${group.id}/id`)}
					hx-target='this'
					hx-swap='none'
				/>
				<br />
				<label for='settings--actor-color'>chat name color</label>
				<input
					style={{ color: group.color }}
					id='settings--actor-color'
					name='color'
					type='text'
					placeholder='chat name color'
					value={group.color}
					oninput='this.style.color = ""; this.style.color = this.value'
					hx-patch={roomURL.actorGroup(`/${group.id}/color`)}
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
					hx-post={roomURL.actorGroup(`/${group.id}/image`)}
					hx-trigger="input from:[name='img']"
					hx-target='this'
					hx-swap='none'
				/>
				<br />
				<label for='settings--actor-ids'>Actors</label>
				<div class='spacer'></div>
				<Multiselect
					id='settings--actor-ids'
					selected={group.actorIds}
					action={roomURL.actorGroup(`/${group.id}/actor-ids`)}
				>
					{[...actors, ...groups].map((item) => (
						<span data-value={item.id}>
							<ChatItem
								room={room}
								item={item}
								selected={false}
								side='left'
								darkPortrait
								plain
							/>
						</span>
					))}
				</Multiselect>
				<br />
				{!room.settings.onlyHostMayDeleteActorGroups ||
				room.hostId === room.user.id ? (
					<button
						class='delete'
						hx-delete={roomURL.actorGroup(`/${group.id}`)}
						hx-swap='none'
					>
						delete
					</button>
				) : (
					''
				)}
			</div>
		</>
	);
}

export function ActorsView({ room }: { room: RoomController }) {
	const _actors = room.actors;

	const actors = _actors.toSorted((a, b) => {
		if (a.reserved === room.user.id && b.reserved !== room.user.id) {
			return -1;
		} else if (a.reserved !== room.user.id && b.reserved === room.user.id) {
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
	const actorGroups = room.actorGroups.toSorted((a, b) =>
		a.name.localeCompare(b.name)
	);
	const reserved = actors.filter((actor) => actor.reserved === room.user.id);

	const roomURL = URLs.room(room.id);

	return (
		<>
			<div class='actors-view-container'>
				<div class='actors-view-buttons'>
					<button
						hx-post={roomURL.actor('/')}
						hx-trigger='click'
						hx-swap='none'
					>
						create actor
					</button>
					<button
						hx-post={roomURL.actorGroup('/')}
						hx-trigger='click'
						hx-swap='none'
					>
						create group
					</button>
				</div>
				<div id='actors-view' class='actors-view'>
					{actors.length > 0 ? (
						<div class='actors-view-actors'>
							{actors.map((actor) => (
								<ActorSettingsItem
									room={room}
									actor={actor}
									selected={actor.reserved === room.user.id}
									disabled={
										actor.reserved !== room.user.id && actor.reserved !== ''
									}
								/>
							))}
						</div>
					) : (
						''
					)}
					{actors.length > 0 && actorGroups.length > 0 ? <hr /> : ''}
					<div class='actors-view-actor-groups'>
						{actorGroups.map((group) => (
							<ActorSettingsItem
								room={room}
								group={group}
								selected={reserved.some((actor) =>
									group.actorIds.includes(actor.id)
								)}
							/>
						))}
					</div>
				</div>
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
			hx-get={URLs.room(room.id).actor(`/${actor.id}/tooltip`)}
			hx-trigger='sse:update:actors'
			hx-target='this'
			hx-swap='outerHTML'
		>
			<h3 safe>{actor.name}</h3>
			<small safe>{actor.id}</small>
			{actor.reserved === room.user.id ? (
				<>
					<br />
					<p safe>{actor.knownLanguages.join(', ')}</p>
				</>
			) : (
				''
			)}
			{/* {actor.bio ? (
				<>
					<br />
					<p safe>{actor.bio}</p>
				</>
			) : (
				''
			)} */}
			{/* user notes here pls */}
		</div>
	);
}
export function ActorGroupTooltip({
	room,
	group,
}: {
	room: RoomController;
	group: ActorGroup;
}) {
	const actors = room.actors
		.filter((actor) => group.actorIds.includes(actor.id))
		.map((actor) => actor.name);

	return (
		<div
			class='actor-view'
			hx-get={URLs.room(room.id).actorGroup(`/${group.id}/tooltip`)}
			hx-trigger='sse:update:actors'
			hx-target='this'
			hx-swap='outerHTML'
		>
			<h3 safe>{group.name}</h3>
			<small safe>{group.id}</small>
			{group.actorIds.length > 0 ? (
				<>
					<br />
					<p safe>{actors.join(', ')}</p>
				</>
			) : (
				''
			)}
			{/* {group.bio ? (
				<>
					<br />
					<p safe>{group.bio}</p>
				</>
			) : (
				''
			)} */}
			{/* user notes here pls */}
		</div>
	);
}

export function ActorItem({
	room,
	actor,
	side,
	targetId,
	link,
	tooltip,
	noPortrait,
	darkPortrait,
}: {
	room: RoomController;
	actor: Actor | ActorGroup | User;
	side: 'left' | 'right';
	targetId?: string;
	link?: true;
	tooltip?: true;
	noPortrait?: true;
	darkPortrait?: true;
}) {
	const portrait = noPortrait ? (
		''
	) : (
		<Portrait room={room} item={actor} dark={darkPortrait} />
	);

	const isUser = Object.hasOwn(actor, 'settings');
	const color = isUser
		? (actor as User).settings.color
		: (actor as Actor).color;
	const name = isUser
		? (actor as User).settings.displayName
		: (actor as Actor).name;

	return (
		<>
			{side === 'left' ? portrait : ''}
			<span
				class={`item-link ${link ? 'decorate' : ''}`}
				style={{ color: color }}
				hx-get={
					tooltip
						? URLs.room(room.id)[
								isUser
									? 'user'
									: Object.hasOwn(actor, 'reserved')
									? 'actor'
									: 'actorGroup'
						  ](`/${actor.id}/tooltip`)
						: undefined
				}
				hx-trigger={tooltip ? 'mouseenter' : undefined}
				hx-target={`#${targetId}`}
				hx-swap='innerHTML'
				hx-on:mouseenter={
					tooltip ? `showTooltip(this, '${targetId}', '${side}');` : undefined
				}
				hx-on:mouseleave={
					tooltip ? `hideTooltip(this, '${targetId}');` : undefined
				}
				onclick={
					link
						? `event.stopPropagation(); clickActorLink('${actor.id}');`
						: undefined
				}
				safe
			>
				{name}
			</span>
			{side === 'right' ? portrait : ''}
		</>
	);
}
