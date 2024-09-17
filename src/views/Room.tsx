import Html from '@kitajs/html';
import { Tab, TabGroup } from '../components/Containers';
import { RoomController } from '../controller';
import { SSEPartial } from './SSEPartial';
import { AutoResizeInput } from '../components/AutoResizeInput';
import { byId } from '../utils';
import { BaseRoute, URLs } from '..';

export function Languages({ room }: { room: RoomController }) {
	return (
		<>
			{room.actors
				.find(byId(room.user.sendingFrom))
				?.knownLanguages.map((language) => (
					<option safe>{language}</option>
				))}
		</>
	);
}

export function RoomView({ room }: { room: RoomController }) {
	const SSE = SSEPartial(room);

	const roomURL = URLs.room(room.id);

	return (
		<div
			hx-ext='sse'
			sse-connect={`/listen/${room.id}` satisfies BaseRoute}
			hx-swap='none'
		>
			<SSE event='update:roomSettings' hx-get={roomURL('/styles')} />
			<SSE event='update:userSettings' hx-get={roomURL.user('/styles')} />

			<div class='room' hx-swap='innerHTML'>
				<div class='row hidden'>
					<div class='col'>
						<SSE event='update:title' tag='h2' />
						<SSE event='update:id' tag='small' />
					</div>
					<div
						title='force refresh the room'
						hx-get={roomURL('/init' as any)}
						hx-trigger='click'
						hx-swap='none'
					>
						<div class='reload'></div>
					</div>
				</div>
				<br />
				<div class='flex'>
					<TabGroup id='0'>
						<Tab title='chat'>
							<section data-title='Chat'>
								<form
									class='chat-form'
									hx-post={roomURL('/send')}
									hx-trigger='submit'
									hx-swap='none'
									hx-on:htmx-after-request="if (event.detail.successful) document.getElementById('message-area').value = ''"
								>
									<div class='hidden'>
										<div class='row flex'>
											<SSE
												event='update:chatFromActors'
												class='active-actors'
											/>
											<SSE
												event='update:chat'
												scroll='bottom'
												tag='main'
												class='chat'
											/>
											<SSE event='update:chatToActors' class='active-actors' />
										</div>
										<div class='message-container'>
											<div class='message-header'>
												<SSE
													event='update:chatFromActors'
													id='selected-from-actor'
													hx-get={roomURL('/sending-from-item')}
												/>
												<span style={{ display: 'flex' }}>
													<AutoResizeInput
														id='message-intro'
														name='intro'
														placeholder='intro'
														colorByValue={false}
														oninput={`setMessageColor(this)`}
													/>
												</span>
												<SSE
													event='update:chatToActors'
													id='selected-to-actor'
													hx-get={roomURL('/sending-to-item')}
													tag='span'
												/>
											</div>
											<div class='message'>
												<textarea
													id='message-area'
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
							</section>
						</Tab>
						<Tab title='actors'>
							<section data-title='Actors' class='row'>
								<SSE event='update:actors' class='actors' />
								<SSE
									id='actor-settings'
									event='update:actors'
									hx-get={roomURL('/placeholder/actor-settings')}
								/>
							</section>
						</Tab>
						<Tab title='users'>
							<section data-title='Chat'>
								<SSE event='update:users' />
							</section>
						</Tab>
						<Tab title='settings'>
							<TabGroup id='1'>
								<Tab title='user'>
									<section data-title='User Settings'>
										<SSE
											id='user-settings'
											event='update:userSettings'
											class='settings'
										/>
									</section>
								</Tab>
								<Tab 
									title={room.user.id === room.hostId ? 'host' : 'room'}
								>
									<section data-title='Room Settings'>
										<SSE
											id='room-settings'
											event='update:roomSettings'
											class='settings'
										/>
									</section>
								</Tab>
							</TabGroup>
						</Tab>
					</TabGroup>
				</div>
			</div>
		</div>
	);
}
