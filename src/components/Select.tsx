import Html from '@kitajs/html';
import { base } from '../controller';

type MultiselectSettings = {};
export function Multiselect({
	options,
	selected,
	id,
	action,
	settings,
}: {
	options: string[];
	selected: string[];
	id: string;
	action: string;
	settings?: MultiselectSettings;
}) {
	const inDropdown = options.filter((option) => !selected.includes(option));

	return (
		<div
			class='multiselect'
			hx-swap='none'
			onclick={`document.getElementById("${id}").focus()`}
		>
			<div class='multiselect-input'>
				{selected.map((item) => (
					<div class='multiselect-selected'>
						<small>{item}</small>
						<div class='vr'></div>
						<button
							role=''
							hx-delete={`${action}/${item}`}
							hx-target='this'
							onclick='event.stopPropagation()'
						>
							X
						</button>
					</div>
				))}
				<input
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
				/>
			</div>
			<div
				id={`ms-dd-${id}`}
				class='multiselect-dropdown'
				onmousedown={`document.getElementById("${id}").focus()`}
			>
				{inDropdown.map((item) => (
					<p
						class='multiselect-option'
						hx-post={`${action}/${item}`}
						hx-trigger='click'
						hx-target='this'
					>
						{item}
					</p>
				))}
			</div>
		</div>
	);
}
