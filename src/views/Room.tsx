import Html from '@kitajs/html';
import { TabGroup } from '../components/Containers';
import { Editable } from '../components/Dynamics';
import { RoomController, base } from '../controller';

export const [Title, EditTitle] = Editable('title', (room) => (
	<h2 sse-swap='update:title' hx-swap='innerHTML'>
		{room.ssePartial('update:title')}
	</h2>
));

export function Languages({ room }: { room: RoomController }) {
	return (
		<>
			{room
				.get('actors', room.get('users', room.uid).sendingFrom)
				.languages.known.map((language) => (
					<option>{language}</option>
				))}
		</>
	);
}

export function RoomView({ room }: { room: RoomController }) {
	return (
		<div
			hx-ext='sse'
			sse-connect={base.URL(`/listen/${room.rid}`)}
			hx-post={room.URL('/init')}
			hx-trigger='htmx:sseOpen'
			hx-swap='none'
		>
			<div class='room' hx-swap='innerHTML'>
				{/* <Title room={room} /> */}
				<div class='row hidden'>
					<div class='col'>
						<h2 sse-swap='update:title' hx-target='this'>
							{room.ssePartial('update:title')}
						</h2>
						<small sse-swap='update:id' hx-target='this'>
							{room.ssePartial('update:id')}
						</small>
					</div>
					<div title='force refresh the room' hx-post={room.URL('/init')} hx-trigger='click' hx-swap='none'>
						<div class='reload-room'></div>
					</div>
				</div>
				<br />
				<div class='flex'>
					<TabGroup
						tabs={() => ({
							chat: (
								<section title='Chat'>
									<form
										class='chat-form'
										hx-post={room.URL('/send')}
										hx-trigger='submit'
										hx-swap='none'
										hx-on:htmx-after-swap="document.getElementById('chat-input').value = ''"
									>
										<div hx-swap='innerHTML'>
											<div class='row flex'>
												<div
													class='active-actors'
													sse-swap='update:fromActors'
													hx-target='this'
												>
													{room.ssePartial('update:fromActors')}
												</div>
												<main
													class='chat'
													sse-swap='update:messages'
													hx-target='this'
													hx-swap='innerHTML scroll:bottom'
												>
													{room.ssePartial('update:messages')}
												</main>
												<div
													class='active-actors'
													sse-swap='update:toActors'
													hx-target='this'
												>
													{room.ssePartial('update:toActors')}
												</div>
											</div>
											<div class='row'>
												<select name='type'>
													<option selected>say</option>
													<option>yell</option>
													<option>whisper</option>
													<option>telepathy</option>
												</select>
												<select
													hx-get={room.URL('/languages')}
													hx-trigger='load, sse:update:fromActors'
													hx-target='this'
													style={{ width: '100%' }}
													name='language'
												>
												</select>
											</div>

											<div class='row'>
												<input
													id='chat-input'
													type='text'
													name='message'
													placeholder='message'
													autocomplete='false'
												/>
												<button type='submit'>send</button>
											</div>
										</div>
									</form>
								</section>
							),
							actors: (
								<section title='Actors' class='row'>
									<div class='actors' sse-swap='update:actors' hx-target='this'>
										{room.ssePartial('update:actors')}
									</div>
									<div id='actor-settings'>
										{room.get('actors').length === 0 ? (
											<div
												id='actor-settings-placeholder'
												class='placeholder'
												hx-get={base.URL(
													'/placeholder/actor-settings-placeholder/select an actor'
												)}
												hx-trigger='sse:update:actors'
												hx-target='this'
												hx-swap='outerHTML'
											>
												create an actor
											</div>
										) : (
											<div id='actor-settings-placeholder' class='placeholder'>
												select an actor
											</div>
										)}
									</div>
								</section>
							),
							users: (
								<section title='Users' class='placeholder'>
									TODO: users
								</section>
							),
							settings: (
								<section title='Settings' class='placeholder'>
									TODO: settings
								</section>
							),
						})}
					/>
				</div>
			</div>
		</div>
	);
}
