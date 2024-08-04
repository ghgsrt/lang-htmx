import Html from '@kitajs/html';
import { addBaseRoute } from '..';
import { base } from '../controller';

const iota = () => {
	let i = 0;
	return () => i++;
};
const dropIota = iota();
const groupIota = iota();
export const dropMap: Record<number, JSX.Element> = {};
export const dropGroups: Record<number, number> = {};

export function TabGroup({
	tabs,
	title,
	selected,
	group,
}: {
	tabs: () => Record<string, JSX.Element>;
	title?: string;
	selected?: number;
	group?: number;
}) {
	const groupId = group ?? groupIota();
	const _tabs = tabs();

	if (group === undefined)
		addBaseRoute('get', base.URL.generated.tab(groupId), ({ params }) => (
			<TabGroup
				tabs={tabs}
				title={title}
				selected={Number(params.tab!)}
				group={groupId}
			/>
		));

	return (
		<section
			class='tab-group'
			title={title ?? ''}
			hx-target='this'
			hx-swap='outerHTML'
		>
			<summary id={`tab-${groupId}-header`} class='tab-header' role='tablist'>
				{Object.keys(_tabs).map((tab, i) => (
					<button
						hx-get={base.URL.generated.tab(groupId, i)}
						hx-trigger='click'
						class={`tab ${i === (selected ?? 0) ? 'selected' : ''}`}
						role='tab'
						aria-selected={i === selected}
						aria-controls={`tab-${groupId}-content`}
					>
						{tab}
					</button>
				))}
			</summary>
			<br />
			<article
				id={`tab-${groupId}-content`}
				class='tab-content'
				role='tabpanel'
				hx-swap='innerHTML'
			>
				{Object.values(_tabs)[selected ?? 0]}
			</article>
		</section>
	);
}

export function DropDown({
	title,
	isOpen,
	id,
	group,
	children,
}: {
	title: string;
	isOpen: boolean;
	id?: number;
	group?: number;
	children?: JSX.Element;
}) {
	if (id === undefined) {
		id = dropIota();
		dropMap[id] = children!;
	} else children = dropMap[id];

	return (
		<details id={`dropdown-${id}`} class={`dropdown absolute`} open={isOpen}>
			<summary>{title}</summary>
			<div>{children}</div>
		</details>
	);
}
