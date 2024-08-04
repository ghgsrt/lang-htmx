export function parseTimestamp(
	isoDate: string,
	today: string,
	yesterday: string
) {
	const timestamp = new Date(isoDate);

	const date = timestamp.toLocaleDateString();
	const time = timestamp.toLocaleTimeString().split(':');
	const suffix = time.pop()!.split(' ')[1];

	return {
		group: date,
		date:
			date === today
				? 'Today at '
				: date === yesterday
				? 'Yesterday at '
				: date
						.split('/')
						.map((piece) => piece.padStart(2, '0'))
						.join('/'),
		time: `${time.join(':')} ${suffix}`,
	};
}

const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

export function toPrettyDate(date: string) {
	const pieces = date.split('/');
	return `${months[Number(pieces[0]) - 1]} ${pieces[1]}, ${pieces[2]}`;
}

export function padRandom(
	str: string,
	maxLength: number,
	fillChoices: (string | number)[]
) {
	for (let i = str.length; i < maxLength; i++) {
		str += fillChoices[Math.random() * fillChoices.length];
	}

	return str;
}
