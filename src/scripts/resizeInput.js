function measureTextWidth(txt, font) {
	const element = document.createElement('canvas');
	const context = element.getContext('2d');
	context.font = font;
	return context.measureText(txt).width;
}

function resizeInput(input) {
	const style = window.getComputedStyle(input, null);
	const text = input.value || input.placeholder;
	const width = measureTextWidth(text, style.font);

	const desiredWidth =
		parseInt(style.borderLeftWidth) +
		parseInt(style.paddingLeft) +
		Math.ceil(width) +
		1 + // extra space for cursor
		parseInt(style.paddingRight) +
		parseInt(style.borderRightWidth);
	input.style.width = desiredWidth + 'px';
}
