import Html from '@kitajs/html';
import { User } from '../types/types';
import { RoomController } from '../controller';

export function UserItem({ room, user }: { room: RoomController; user: User }) {
	return <option class='user-item'>{user.name}</option>;
}

export function UsersView({ room }: { room: RoomController }) {
	const users = room.get('users');

	return (
		<select class='users-view'>
			{users.map((user) => (
				<UserItem room={room} user={user} />
			))}
		</select>
	);
}
