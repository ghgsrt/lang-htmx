import Html from '@kitajs/html';
import { AutoResizeInput } from './AutoResizeInput';
import { Safe } from '../types/types';
import sanitizeHTML from 'sanitize-html';

//! ALL CHILDREN MUST BE SAFE

const getProperty = (el: JSX.Element, property: string) =>
	(el as string).split(`${property}=`)[1].split('"')[1];

type SelectWithChildren = {
	children: JSX.Element[];
	options?: never;
};
type SelectWithOptions = {
	children?: never;
	options: string[] | [string, string][];
};

type SelectWithClient = {
	clientOnly: true;
	URL?: never;
};
type SelectWithServer = {
	clientOnly?: false;
	URL: string;
};

type SelectOpenUp = {
	openUp: true;
	openDown?: never;
};
type SelectOpenDown = {
	openUp?: never;
	openDown?: true;
};

type SelectSettings = {};
export function Select({
	children,
	options,
	name,
	selected = 0,
	id,
	URL,
	openUp,
	customSelected,
	teleport,
	clientOnly,
	containerStyle = {},
	selectedStyle = {},
	dropdownStyle = {},
	readonly,
}: {
	selected?: number;
	id: string;
	name: string;
	customSelected?: {
		datasetOnly?: true;
	};
	teleport?: boolean;
	settings?: SelectSettings;
	containerStyle?: JSX.CSSProperties;
	selectedStyle?: JSX.CSSProperties;
	dropdownStyle?: JSX.CSSProperties;
	readonly?: boolean;
} & (SelectWithChildren | SelectWithOptions) &
	(SelectWithClient | SelectWithServer) &
	(SelectOpenUp | SelectOpenDown)) {
	const values =
		options ?? children!.map((child) => getProperty(child, 'data-value'));

	const toggle = readonly
		? ''
		: `toggleSelect('select-dropdown-${id}', ${teleport}, '${id}', ${!openUp});`;

	const optionsDiff = options && Array.isArray(options[selected]); // pls give better name my god

	return (
		<div
			style={containerStyle}
			class={`select ${readonly ? 'readonly' : ''}`}
			hx-swap='none'
		>
			<div
				style={selectedStyle}
				id={`select-${id}`}
				class={`select-selected ${customSelected ? 'hide' : ''}`}
				onclick={customSelected ? undefined : toggle}
			>
				{customSelected ? (
					<script>{`document.getElementById('${id}').onclick = () => ${toggle}`}</script>
				) : options ? (
					(sanitizeHTML(
						optionsDiff ? options[selected][1] : (options[selected] as string)
					) as Safe)
				) : (
					(children![selected] as Safe)
				)}
				{!readonly && (
					<input
						role='value-slave'
						name={name}
						value={
							optionsDiff ? values[selected][0] : (values[selected] as string)
						}
					/>
				)}
			</div>
			{teleport ? (
				<script>{`teleportSelectDropdown('select-dropdown-${id}')`}</script>
			) : (
				''
			)}
			<div
				style={dropdownStyle}
				id={`select-dropdown-${id}`}
				class={`select-dropdown hide ${openUp ? 'up' : ''}`}
			>
				{
					(options ?? children!).map((item, i) => (
						<div
							data-value={optionsDiff ? values[i][0] : (values[i] as string)}
							class={`select-option ${i === selected ? 'selected' : ''}`}
							onclick={
								URL
									? ''
									: customSelected
									? `setCustomSelected(this, '${id}', ${customSelected.datasetOnly});`
									: `setSelectSelected(this, 'select-${id}');`
							}
							hx-patch={!readonly && URL}
							hx-trigger={!readonly && URL ? 'click' : ''}
							hx-target='this'
							hx-include="find [role='value-slave']"
						>
							{options
								? (sanitizeHTML(
										optionsDiff
											? (item as [string, string])[1]
											: (item as string)
								  ) as Safe)
								: (item as Safe)}
							{!readonly && URL ? (
								<input
									role='value-slave'
									name={name}
									value={optionsDiff ? values[i][0] : (values[i] as string)}
								/>
							) : (
								''
							)}
						</div>
					)) as Safe
				}
			</div>
		</div>
	);
}

type MultiselectSettings = {};
export async function Multiselect({
	options,
	children,
	selected,
	id,
	action,
	name,
	openUp,
	readonly,
	settings,
}: {
	selected: string[];
	id: string;
	action: string;
	name?: string;
	readonly?: boolean;
	settings?: MultiselectSettings;
} & (SelectWithChildren | SelectWithOptions) &
	(SelectOpenUp | SelectOpenDown)) {
	const values =
		options ??
		(await Promise.all(
			children!.map(async (child) => await getProperty(child, 'data-value'))
		));

	const inSelected: any[] = [];
	const inDropdown: any[] = [];

	for (let i = 0; i < values.length; i++) {
		const value = values[i];
		const valueDiff = Array.isArray(value);
		(selected.includes(valueDiff ? value[0] : value)
			? inSelected
			: inDropdown
		).push(
			options ? (valueDiff ? value : [value, value]) : [children![i], value]
		);
	}

	return (
		<div
			class={`multiselect ${readonly ? 'readonly' : ''}`}
			hx-swap='none'
			onclick={readonly ? '' : `document.getElementById("${id}").focus();`}
		>
			<div class='multiselect-input'>
				{inSelected.map(([item, id]) => (
					<div class='multiselect-selected'>
						<small safe={!!options ?? false}>{item as Safe}</small>
						<div class='vr'></div>
						<button
							role=''
							hx-delete={`${action}/${id}`}
							hx-target='this'
							onclick='event.stopPropagation()'
						>
							X
						</button>
					</div>
				))}
				<AutoResizeInput id={id} name={name ?? 'search'} needsExtra />
				{/* <input
					id={`${id}`}
					type='text'
					name='search'
					oninput={`resizeInput(this)`}
					hx-post='/search/options'
					hx-include={`#ms-so-${id}`}
					hx-trigger='input changed, search'
					hx-target={`#ms-dd-${id}`}
					hx-swap='innerHTML'
				/>
				<input
					role='search-context-slave'
					id={`ms-so-${id}`}
					name='options'
					value={`${action}:::${inDropdown.toString()}`}
				/>
				<input
					role='resize-input-on-load-slave'
					name='inputId'
					value={`${id}`}
					hx-post={base.URL('/resizeInput')}
					hx-trigger='load'
					hx-target='this'
					hx-swap='outerHTML'
				/> */}
			</div>
			<div
				id={`ms-dd-${id}`}
				class={`multiselect-dropdown ${openUp ? 'up' : ''}`}
				onmousedown={`document.getElementById("${id}").focus()`}
			>
				{inDropdown.map(([item, id]) => (
					<div
						class='multiselect-option'
						hx-post={`${action}/${id}`}
						hx-trigger='click'
						hx-target='this'
						safe={!!options ?? false}
					>
						{item as Safe}
					</div>
				))}
			</div>
		</div>
	);
}
