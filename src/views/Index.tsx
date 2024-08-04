import Html from '@kitajs/html';
import { ValidatedInput } from '../components/Form';
import { base } from '../controller';

export function Index(props: { children: JSX.Element }) {
	return (
		<>
			{'<!DOCTYPE html>'}
			<html lang='en'>
				<head>
					<meta charset='UTF-8' />
					<link rel='icon' href='' />
					<meta
						name='viewport'
						content='width=device-width, initial-scale=1.0'
					/>
					<title>Lang</title>
					<link href={base.URL('/styles.css')} rel='stylesheet' />
					<link href={base.URL('/reset.css')} rel='stylesheet' />

					<script src={base.URL('/resizeInput.js')}></script>

					<script
						src='https://unpkg.com/htmx.org@2.0.1'
						integrity='sha384-QWGpdj554B4ETpJJC9z+ZHJcA/i59TyjxEPXiiUgN2WmTyV5OEZWCD6gQhgkdpB/'
						crossorigin='anonymous'
					></script>
					<script src='https://unpkg.com/htmx-ext-sse@2.2.1/sse.js'></script>
					<script src='/idiomorph.min.js'></script>
				</head>
				<body>
					<div id='app'>{props.children}</div>
				</body>
			</html>
		</>
	);
}

export function Header() {
	return <div class='header'>v0.0.0</div>;
}

export function Footer() {
	return <div class='footer'>© 2024 Alex Bosco</div>;
}

export const JoinRoom = ValidatedInput({
	action: base.URL('/join-room'),
	validatorAction: base.URL.validate('/roomId'),
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
				<main>
					<JoinRoom isValid={false} />
					<form
						hx-post={base.URL('/create-room')}
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
