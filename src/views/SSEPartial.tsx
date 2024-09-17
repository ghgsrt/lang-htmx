import Html from '@kitajs/html';
import { SSEEvent } from '..';
import { RoomController } from '../controller';
import { Safe } from '../types/types';

export function SSEPartial(room: RoomController) {
	return (props: {
		event: SSEEvent | SSEEvent[];
		id?: string;
		class?: string;
		'hx-get'?: string;
		tag?: string;
		name?: string;
		scroll?: 'top' | 'bottom';
	}) => {
		const Tag = (props.tag as any) ?? 'div';

		return (
			<Tag
				id={props.id}
				class={props.class}
				sse-swap={
					!props['hx-get'] &&
					(Array.isArray(props.event) ? props.event.join(', ') : props.event)
				}
				hx-get={props['hx-get']}
				hx-trigger={
					props['hx-get'] &&
					`load, sse:${
						Array.isArray(props.event)
							? props.event.join(', sse:')
							: props.event
					}`
				}
				hx-target='this'
				hx-swap={`innerHTML ${props.scroll ? `scroll:${props.scroll}` : ''}`}
				name={props.name}
			>
				{!props['hx-get'] &&
					(room.ssePartial(
						Array.isArray(props.event) ? props.event[0] : props.event
					) as Safe)}
			</Tag>
		);
	};
}
