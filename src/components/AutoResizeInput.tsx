import Html from '@kitajs/html';
import { escape } from '../utils';

export function AutoResizeInput(props: {
	id?: string;
	value?: string | boolean;
	type?: 'boolean' | 'number' | 'string';
	name?: string;
	placeholder?: string;
	URL?: string;
	configRequest?: string;
	oninput?: string;
	onchange?: string;
	class?: string;
	style?: JSX.CSSProperties;
	colorByValue?: boolean;
	readonly?: boolean;
	needsExtra?: boolean;
}) {
	props.type ??= 'string';

	const value =
		typeof props.value === 'string'
			? props.value
			: props.value?.toString() ?? '';

	return (
		<>
			<input
				id={props.id ?? props.URL}
				class={'inline ' + (props.class ?? '')}
				type={props.type === 'boolean' ? 'checkbox' : 'text'}
				value={props.value ?? ('' as any)}
				checked={
					props.type === 'boolean' ? (props.value as boolean) : undefined
				}
				placeholder={props.placeholder}
				name={props.name ?? 'value'}
				spellcheck='false'
				style={{
					//@ts-ignore -- silly ts don't know about css variables
					'--chars': `${(value || props.placeholder)?.length ?? 0}ch`,
					color: escape(value),
					...(props.style ?? {}),
					width:
						props.type !== 'boolean'
							? `calc(var(--chars) + ${props.needsExtra ? '1ch' : '0.0625rem'})`
							: '',
				}}
				readonly={props.readonly}
				onchange={props.onchange}
				oninput={`${props.oninput ?? ''};${
					props.colorByValue || props.colorByValue === undefined
						? 'this.style.color = "inherit"; this.style.color = `${this.value}`;'
						: ''
				}${
					props.type !== 'boolean'
						? 'this.style.setProperty("--chars", `${this.value.toString().length}ch`); this.parentElement.dataset.value = this.value'
						: ''
				}`}
				data-type={props.type}
				hx-patch={props.URL}
				hx-swap='none'
				hx-include='next input'
				hx-on:htmx-config-request={props.configRequest ?? ''}
			/>
			<input role='type-slave' name='type' value={props.type} />
		</>
	);
}
