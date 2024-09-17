import Html from '@kitajs/html';
import { base } from '../controller';
import { Safe } from '../types/types';

const iota = () => {
	let i = 0;
	return () => i++;
};
const dropIota = iota();
const groupIota = iota();
export const dropMap: Record<number, JSX.Element> = {};
export const dropGroups: Record<number, number> = {};

export function Tab({
	title,
	children,
}: {
	title: string;
	children: JSX.Element;
}) {
	return [title, children] as unknown as JSX.Element;
}

export async function TabGroup({
	id,
	title,
	children,
}: {
	id: string;
	title?: string;
	children: JSX.Element[];
}) {
	const _children: [string, JSX.Element][] = (
		Array.isArray(children[0]) ? children : [children]
	) as [string, JSX.Element][];

	return (
		<section class='tab-group' data-title={title ?? ''} hx-swap='innerHTML'>
			<summary id={`tab-${id}-header`} class='tab-header' role='tablist'>
				{_children.map(([title], i) => (
					<button
						data-title={title}
						class={`tab ${i === 0 ? 'selected' : ''}`}
						onclick={`selectTab(${id}, ${i});`}
						role='tab'
						safe
					>
						{title}
					</button>
				))}
			</summary>
			<br />
			{_children.map(([title, child], i) => (
				<article
					data-title={title}
					class={`tab-content ${i === 0 ? 'selected' : ''}`}
					role='tabpanel'
					hx-swap='innerHTML'
				>
					{child as Safe}
				</article>
			))}
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
			<summary safe>{title}</summary>
			<div>{children as Safe}</div>
		</details>
	);
}
