import Html from '@kitajs/html';
import { ValidatedInput } from '../components/Form';
import { base } from '../controller';
import { Safe } from '../types/types';
import { BaseRoute, BaseValidatorRoute, URLs } from '..';

export function Index(props: { children: JSX.Element }) {
	return (
		<>
			{'<!DOCTYPE html>'}
			<html lang='en' onclick='focusMessage(event);'>
				<head>
					<meta charset='UTF-8' />
					<link rel='icon' href='' />
					<meta
						name='viewport'
						content='width=device-width, initial-scale=1.0'
					/>
					<title>Lang</title>
					<link href={'/styles.css' satisfies BaseRoute} rel='stylesheet' />
					<link href={'/reset.css' satisfies BaseRoute} rel='stylesheet' />

					<script src={'/clientJS.js' satisfies BaseRoute}></script>

					{/* <script
						src='https://unpkg.com/htmx.org@2.0.1'
						integrity='sha384-QWGpdj554B4ETpJJC9z+ZHJcA/i59TyjxEPXiiUgN2WmTyV5OEZWCD6gQhgkdpB/'
						crossorigin='anonymous'
					></script> */}
					<script src='/htmx.js'></script>
					<script src='https://unpkg.com/htmx-ext-sse@2.2.1/sse.js'></script>
					<script src={'/idiomorph.min.js' satisfies BaseRoute}></script>
				</head>
				<body>
					<div id='app'>{props.children as Safe}</div>
					<div id='modal-container'>
						<div id='modal'></div>
					</div>
					<div id='portal'></div>
				</body>
			</html>
		</>
	);
}

export function Header() {
	return <div class='header'>v1.0.0</div>;
}

export function Footer() {
	return <div class='footer'>© 2024 Alex Bosco</div>;
}

export const JoinRoom = ValidatedInput({
	action: '/join-room' satisfies BaseRoute,
	validatorAction: '/validate/roomId' satisfies BaseRoute,
	target: '#app',
	swap: 'innerHTML',
	name: 'roomId',
	placeholder: 'Room Id',
	buttonText: 'Join Room',
});

export function HomeView() {
	return (
		<Index>
			<>
				<Header />
				<main class='home'>
					<JoinRoom isValid={false} />
					<form
						hx-post={'/create-room' satisfies BaseRoute}
						hx-trigger='submit'
						hx-target='#app'
					>
						<button type='submit'>Create Room</button>
					</form>
				</main>
				<Footer />
			</>
		</Index>
	);
}
