import Html from '@kitajs/html';
import { storage, URLs } from '..';
import { EditableVariable, Error, S } from './EditableVariable';
import { RoomController } from '../controller';
import { byId, byName } from '../utils';

export function RoomSettingsView({ room }: { room: RoomController }) {
	const defaultLanguageChoices = room.settings.languages.filter(
		(lang) => !room.settings.defaultLanguages.includes(lang)
	);

	return (
		<EditableVariable
			id='room-settings-thing'
			declaration='const'
			name='roomSettings'
			readonly={room.user.id !== room.hostId}
			value={room.settings}
			schema={(s) =>
				s.Object({
					roomName: s.String({
						validate: (value) => value !== '',
						validateClient: [
							[
								Error.Validate.valueIsNotEmpty,
								Error.Message.propertyMustNotBeEmpty,
							],
						],
						sync: () => room.broadcast('update:title'),
					}),
					roomId: s.String({
						validate: (value) => value !== '' && !storage[value],
						validateClient: [
							[
								Error.Validate.valueIsNotIncludedIn(
									Object.keys(storage).filter((key) => key !== room.id)
								),
								Error.Message('a room already exists with that id'),
							],
							[
								Error.Validate.valueIsNotEmpty,
								Error.Message.propertyMustNotBeEmpty,
							],
						],
						sync: room.setId,
					}),
					host: s.String({
						restrict: room.users
							.filter((user) => user.id !== room.hostId)
							.map((user) => user.settings.displayName),
						confirm: (value) => ({
							message: `give "host" to ${value}?`,
							alert: 'this action cannot be undone',
						}),
						sync: room.setHost,
					}),
					onlyHostMayDeleteActorGroups: s.Boolean(),
					defaultLanguages: s.Array(
						s.String({
							default: defaultLanguageChoices[0],
							restrict: defaultLanguageChoices,
							tooltip: 'only affects newly created actors',
						}),
						{
							noDuplicates: true,
							syncChildren: true,
							sync: () => room.broadcast('update:actors'),
						}
					),
					languages: s.Array(s.String(), {
						deleteOnEmpty: true,
						tooltip: 'languages available to all actors',
						noDuplicates: true,
						syncChildren: true,
						sync: (value, oldValue) => {
							room.broadcast('update:actors');

							if (oldValue === undefined) return;

							const idx = room.settings.defaultLanguages.indexOf(oldValue);
							if (idx !== -1 && value === '')
								room.settings.defaultLanguages.splice(idx, 1);
							else room.settings.defaultLanguages[idx] = value;
						},
					}),
					defaultIntro: s.String(),
					verbs: s.VarObject(
						s.Object({
							color: s.String(),
							asPrefix: s.Boolean({
								tooltip:
									'a word only has to start with the verb or an alias to count as a match',
							}),
							aliases: s.Array(s.String(), {
								tooltip: 'additional verbs to apply the chosen color',
								noDuplicates: true,
							}),
						}),
						{
							noSpecialInProps: true,
							tooltip:
								'keywords matched in the message intro will color the message text accordingly',
						}
					),
				})
			}
			baseURL={URLs.room(room.id).roomSettings}
			updateValue={() => {
				room.broadcast('update:roomSettings');
				room.broadcast('update:chat');
			}}
		/>
	);
}

export const defaultUserStyles = {
	'--clr-accent': '#e78a4e',
	'--clr-sys': '#d8a654',
	'--clr-error': '#e72b2b',
	'--clr-error-bg': '#e72b2b22',
	'--clr-background': '#181818',
	'--clr-foreground': '#282828',
	'--clr-text': '#e6cda3',
	'--clr-text-disabled': '#e6cda355',
	'--clr-text-select': '#606060',

	'--clr-settings-declaration': 'var(--clr-accent)',
	'--clr-settings-bracket': '#a9b665',
	'--clr-settings-property': 'var(--clr-text)',
	'--clr-settings-quote': 'var(--clr-sys)',
	'--clr-settings-text': 'var(--clr-sys)',
	'--clr-settings-variable': 'var(--clr-text)',
	'--clr-settings-special': '#e6cda399',
	'--clr-settings-number': '#d3869b',
	'--clr-settings-boolean': '#d3869b',
};

const styles = (s: S) =>
	s.Object(
		Object.entries(defaultUserStyles).reduce((acc, [key, value]) => {
			acc[key] = s.String({ default: value });
			return acc;
		}, {} as any)
	);

export function UserSettingsView({ room }: { room: RoomController }) {
	return (
		<EditableVariable
			id='user-settings-thing'
			declaration='const'
			name='userSettings'
			value={room.user.settings}
			schema={(s) =>
				s.Object({
					displayName: s.String({
						validate: (value) =>
							value !== '' && !room.users.find(byName(value)),
						validateClient: [
							[
								Error.Validate.valueIsNotIncludedIn(
									room.users
										.filter((user) => user.id !== room.user.id)
										.map((user) => user.settings.displayName)
								),
								Error.Message('another user already has that name'),
							],
							[
								Error.Validate.valueIsNotEmpty,
								Error.Message.propertyMustNotBeEmpty,
							],
						],
						sync: (value) => {
							if (room.user.id === room.hostId) room.settings.host = value;

							room.broadcast('update:usersChatUsers');
							room.broadcast('update:usersChat');
							room.broadcast('update:chat');
							room.broadcast('update:actors');
							room.broadcast('update:roomSettings');
							room.broadcast('update:userSettings');
						},
					}),
					color: s.String({
						sync: () => {
							room.broadcast('update:usersChatUsers');
							room.broadcast('update:usersChat');
						},
					}),
					img: s.String({
						type: 'file',
						sync: () => {
							room.broadcast('update:usersChatUsers');
							room.broadcast('update:usersChat');
						},
					}),
					defaultIntro: s.String(),
					styles: styles(s),
				})
			}
			baseURL={URLs.room(room.id).user(`/${room.user.id}/settings` as any)}
			updateValue={() => {
				room.send('update:userSettings');
			}}
		/>
	);
}
