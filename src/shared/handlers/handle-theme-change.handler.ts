import { themes } from '~shared/enums';

export function handleThemeChange(storage: any, theme: keyof typeof themes) {
	document.documentElement.setAttribute('data-theme', themes[theme]);
	storage.set('theme', theme);
}
