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
export const status = writable({
	isGrimoireApiReachable: true
});
export const loading = writable({
	isFetchingCategoriesAndTags: false,
	isSigningIn: false,
	isAddingBookmark: false,
	justAddedBookmark: false
});

loading.subscribe((value) => {
	if (value.justAddedBookmark) {
		setTimeout(() => {
			loading.update((value) => ({ ...value, isAddingBookmark: false, justAddedBookmark: false }));
		}, 1650);
	}
});
