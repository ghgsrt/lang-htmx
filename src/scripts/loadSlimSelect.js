setTimeout(() => {
	const actorSettingsElement = document.getElementById('actor-settings');
	const actorSettings = {
		contentLocation: actorSettingsElement,
		closeOnSelect: false,
		hideSelected: true,
		maxValuesShown: Infinity
	}
	
	
	new SlimSelect({
		select: '#known-languages',
		settings: actorSettings,
	});
	new SlimSelect({
		select: '#familiar-languages',
		settings: actorSettings,
	});
});
