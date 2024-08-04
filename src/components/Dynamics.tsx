import Html from '@kitajs/html';
import { addBaseRoute } from '..';
import { Room } from '../types/types';
import { ArrayKeys } from '../types/utils';
import { RoomController } from '../controller';

export function Editable(
	prop: Exclude<keyof Room, ArrayKeys<Room>>,
	children: (src: RoomController) => JSX.Element,
	options?: {
		inputTrigger?: string;
		inputTarget?: string;
		inputDefault?: string;
	}
) {
	// addRoomRoute('get', `/action/edit-${prop}`, ({ room }) => (
	// 	<Edit room={room} />
	// ));
	// addRoomRoute('post', `/action/edit-${prop}`, ({ room, body }) => {
	// 	if (
	// 		room.get(prop) &&
	// 		!Array.isArray(room.get(prop)) &&
	// 		room.get(prop) !== (body as any)[prop]
	// 	) {
	// 		room.set(prop as any, (body as any)[prop]);
	// 	}
	// 	return <Base room={room} />;
	// });

	const Base = ({ room }: { room: RoomController }) => {
		console.log(room.URL.generated(`/edit-${prop}`));
		addBaseRoute('get', room.URL.generated(`/edit-${prop}`), () => {
			return (
				<div>HELLE</div>
				// <Edit room={room} />
			);
		});

		return (
			<div
				hx-get={room.URL.generated(`/edit-${prop}`)}
				hx-trigger='click'
				hx-swap='outerHTML'
			>
				<div hx-swap='innerHTML'>{children(room)}</div>
			</div>
		);
	};

	const Edit = ({ room }: { room: RoomController }) => {
		addBaseRoute(
			'post',
			room.URL.generated(`/edit-${prop}`),
			({ body }) => {
				if (
					room.get(prop) &&
					!Array.isArray(room.get(prop)) &&
					room.get(prop) !== (body as any)[prop]
				) {
					room.set(prop as any, (body as any)[prop]);
				}
				return <Base room={room} />;
			}
		);

		return (
			<input
				type='text'
				name={prop as string}
				value={options?.inputDefault ?? room.get(prop)}
				autofocus='true'
				hx-post={room.URL.generated(`/edit-${prop}`)}
				hx-trigger={options?.inputTrigger ?? 'blur, submit'}
				hx-target={options?.inputTarget ?? 'this'}
				hx-swap='outerHTML'
			/>
		);
	};

	return [Base, Edit];
}

// export function Searchable(prop: ArrayKeys<Room>) {
// 	addRoomRoute('post', `/search-${prop}`, ({ room, body }) => {});

// 	const [Search, EditSearch] = Editable(prop, (room) => '');

// 	return '';
// }
