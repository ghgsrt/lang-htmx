// import Html from '@kitajs/html';
// import {
// 	ChatMessage,
// 	Room,
// 	Actor,
// 	User,
// } from './types/types';
// import { addBaseRoute, addRoomRoute, dataMap, storage } from '.';
// import { ArrayKeys } from './types/utils';
// import { timestamp } from './utils';









// export const SetDisplayName = ValidatedInput({
// 	action: '/set-display-name',
// 	validatorAction: '/validate/display-name',
// 	target: '#app',
// 	swap: 'innerHTML',
// 	name: 'name',
// 	placeholder: 'Display Name',
// 	buttonText: 'Set Display Name',
// });

// export function CreateRoom({
// 	isValid,
// 	value,
// 	children,
// }: {
// 	isValid: boolean;
// 	value?: string;
// 	children?: JSX.Element;
// }) {
// 	return (
// 		<form
// 			class='col mb-2'
// 			hx-post='/create-room'
// 			hx-target={isValid ? '#app' : 'this'}
// 			hx-swap={isValid ? 'innerHTML' : 'outerHTML'}
// 		>
// 			<div class='row'>
// 				<input
// 					type='text'
// 					name='roomId'
// 					placeholder='Room Id'
// 					value={value ?? ''}
// 					aria-invalid={!isValid}
// 					hx-post='/validate/set-roomId'
// 				/>
// 				<button type='submit' disabled={!isValid}>
// 					Create Room
// 				</button>
// 			</div>
// 			{children}
// 		</form>
// 	);
// }














