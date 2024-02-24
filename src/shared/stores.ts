import { writable } from 'svelte/store';

export const categories = writable<any[]>([]);
export const tags = writable<any[]>([]);
export const currentTab = writable({
	url: '',
	title: '',
	icon_url: '',
	mainImage: '',
	contentHtml: '',
	description: '',
	category: '',
	tags: [],
	note: '',
	importance: 0,
	flagged: false
});
export const updatedUrl = writable('');
export const credentials = writable({
	emailOrUsername: null,
	password: null
});
export const updatedConfiguration = writable({
	grimoireApiUrl: ''
});
export const status = writable({
	isSignedIn: true,
	isGrimoireApiReachable: true
});
