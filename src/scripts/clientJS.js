const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
if (IS_IOS) document.documentElement.classList.add('is-mobile');

const SEL_TYPE_UNSELECTED = 'Caret';
const SEL_TYPE_SELECTED = 'Range';

const TAB_GROUP_MAIN = 0;
const TAB_CHAT = 0;
const TAB_ACTORS = 1;
const TAB_USERS = 2;
const TAB_SETTINGS = 3;

const TAB_GROUP_SETTINGS = 1;
const TAB_USER_SETTINGS = 0;
const TAB_ROOM_SETTINGS = 1;

//== CSS STUFF ==---------------------------------------------------------------------

let cssVariables = [];
let prefixedCssVariables = [];

const cssVarPrefix = '--clr-msg-type-';
const prefixedCssVarPrefix = cssVarPrefix + 'prefixed-';

function getMessageVariables() {
	const style = document.querySelector('style#message-colors');
	const cssText = style.sheet.cssRules[0].style;

	cssVariables = [];
	prefixedCssVariables = [];
	for (const variable of cssText) {
		if (variable.startsWith(prefixedCssVarPrefix)) {
			prefixedCssVariables.push(variable.slice(prefixedCssVarPrefix.length));
		} else cssVariables.push(variable.slice(cssVarPrefix.length));
	}
}

function determineMessageColor(value) {
	const tokens = value.split(' ');

	let pre;
	for (const token of tokens) {
		if (cssVariables.includes(token)) return `var(${cssVarPrefix}${token})`;
		if ((pre = prefixedCssVariables.find((pre) => token.startsWith(pre))))
			return `var(${prefixedCssVarPrefix}${pre})`;
	}

	return 'unset';
}

function setMessageColor(input) {
	if (input === undefined) input = document.getElementById('message-intro');
	const color = determineMessageColor(input.value);

	document.documentElement.style.setProperty('--clr-msg-to-send', color);
}

//== SELECT STUFF ==------------------------------------------------------------------

const DROPDOWN_MARGIN = '0.25rem';

function toggleSelect(id, teleport, targetId, openDown) {
	let dropdown = document.getElementById(teleport ? `teleported_${id}` : id);

	if (teleport) {
		const target = document.getElementById(targetId);

		const bb = target.getBoundingClientRect();
		dropdown.style.left = `${bb.left}px`;
		if (openDown)
			dropdown.style.top = `calc(${bb.bottom}px + ${DROPDOWN_MARGIN})`;
		else
			dropdown.style.bottom = `calc(100% - ${bb.top}px + ${DROPDOWN_MARGIN})`;
	}

	dropdown.classList.toggle('hide');

	if (!dropdown.classList.contains('hide'))
		setTimeout(() =>
			window.addEventListener('click', () => dropdown.classList.add('hide'), {
				once: true,
			})
		);
}

let selected;
function setSelectSelected(dd, id) {
	const select = document.getElementById(id);
	select.firstChild.remove();
	if (select.firstChild?.nodeName === 'INPUT')
		select.firstChild.value = dd.dataset.value;

	const clone = dd.firstChild.cloneNode(true);
	select.insertBefore(clone, select.firstChild);
	htmx.process(clone);

	selected?.classList.remove('selected');
	dd.classList.add('selected');
	selected = dd;
}

function setCustomSelected(dd, id, datasetOnly = false) {
	setSelectSelected(dd, `select-${id}`);
	if (!datasetOnly) {
		setSelectSelected(dd, id);
	} else {
		const customSelect = document.getElementById(id);
		customSelect.dataset.selected = dd.dataset.value;
	}
}

function teleportSelectDropdown(id) {
	const oldDropdown = document.getElementById(`teleported_${id}`)?.remove();

	const dropdown = document.getElementById(id);

	const clone = dropdown.cloneNode(true);
	dropdown.remove();
	clone.setAttribute('id', `teleported_${id}`);
	document.getElementById('portal').appendChild(clone);
	htmx.process(clone);
}

//== TAB STUFF =====------------------------------------------------------------------

const tabState = [];
const tabContentOffset = 2; // + 2 for the header and a break

function selectTab(group, idx) {
	const tabHeader = document.getElementById(`tab-${group}-header`);

	const tabs = tabHeader.children;
	tabs[tabState[group] ?? 0].classList.remove('selected');
	tabs[idx].classList.add('selected');

	const tabContents = tabHeader.parentElement.children;
	tabContents[(tabState[group] ?? 0) + tabContentOffset].classList.remove(
		'selected'
	);
	tabContents[idx + tabContentOffset].classList.add('selected');

	tabState[group] = idx;
}

//== TOOLTIP STUFF ==-----------------------------------------------------------------

function showTooltip(item, targetId, side) {
	item.setAttribute(
		'data-timeoutId',
		setTimeout(() => {
			const rect = item.getBoundingClientRect();
			const target = document.getElementById(targetId);

			target.style.display = 'block';
			target.style.top = rect.top + 'px';
			target.style[side] =
				side === 'right' ? `calc(100% - ${rect.left}px)` : rect.right + 'px';
		}, 100)
	);
}

function hideTooltip(item, targetId) {
	clearTimeout(item.getAttribute('data-timeoutId'));
	const target = document.getElementById(targetId);
	target.style.display = 'none';
}

//== ACTOR STUFF ==-------------------------------------------------------------------

function clickActorLink(id) {
	selectTab(0, 1);
	document.getElementById(`actor-${id}`).click();
}

//== CHAT STUFF ==--------------------------------------------------------------------

function reply(URL) {
	if (window.getSelection().type === SEL_TYPE_SELECTED) return;

	htmx.ajax('PATCH', URL, { swap: 'none', values: { usedCtrl: 'false' } });
}

//== MESSAGE STUFF ==-----------------------------------------------------------------

function focusMessage(event) {
	if (IS_IOS) return;

	const isChat = tabState[TAB_GROUP_MAIN] === TAB_CHAT;
	const isUsersChat = tabState[TAB_GROUP_MAIN] === TAB_USERS;

	if (!isChat && !isUsersChat) return;
	if (window.getSelection().type === SEL_TYPE_SELECTED) return;

	const targetId = event.target.id;

	if (isChat) {
		const intro = document.getElementById('message-intro');
		if (
			!intro.value &&
			targetId !== 'message-area' &&
			targetId !== 'message-to'
		)
			return intro.focus();
	}

	if (targetId !== 'message-intro' && targetId !== 'message-to')
		document
			.getElementById(isChat ? 'message-area' : 'users-message-area')
			.focus();
}

function resizeTextArea(event) {
	event.target.style.height = '1rem';
	event.target.style.height = event.target.scrollHeight + 'px';
}

//== MISC STUFF ==--------------------------------------------------------------------

function disableIOSTextFieldZoom() {
	if (!IS_IOS) return;

	const element = document.querySelector('meta[name=viewport]');
	let content = element.getAttribute('content');

	element.setAttribute('content', content + ', maximum-scale=1.0');
}
disableIOSTextFieldZoom();
