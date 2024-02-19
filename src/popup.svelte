<script lang="ts">
	import { sendToBackground, sendToContentScript } from '@plasmohq/messaging';
	import { Storage } from '@plasmohq/storage';
	import { writable } from 'svelte/store';
	import './style.css';
	import { onMount } from 'svelte';
	import type { AddBookmarkRequestBody } from '~types/add-bookmark.type';

	let token: string = '';
	let configuration: {
		grimoireApiUrl: string;
	} = {
		grimoireApiUrl: ''
	};

	const categories = writable<any[]>([]);

	const tags = writable<any[]>([]);

	const storage = new Storage();

	const isDev = process.env.NODE_ENV === 'development';

	const currentTab = writable({
		url: '',
		title: '',
		favIconUrl: '',
		mainImage: '',
		contentHtml: '',
		description: '',
		category: '',
		tags: [],
		note: '',
		importance: 0,
		flagged: false
	});

	const updatedUrl = writable('');

	const credentials = writable({
		emailOrUsername: null,
		password: null
	});

	const updatedConfiguration = writable({
		grimoireApiUrl: ''
	});

	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		if (!tabs[0]) {
			return;
		}

		$currentTab = {
			...$currentTab,
			url: tabs[0].url,
			title: tabs[0].title,
			favIconUrl: tabs[0].favIconUrl
		};
	});

	onMount(async () => {
		const theme = await storage.get('theme');
		token = await storage.get('token');
		configuration = await storage.get('configuration');

		$updatedConfiguration = { ...configuration };

		if (token && configuration.grimoireApiUrl) {
			const categoriesAndTags = await sendToBackground<
				{
					token: string;
					grimoireApiUrl: string;
				},
				{
					categories: any[];
					tags: any[];
				}
			>({
				name: 'fetch-categories-tags',
				body: {
					token,
					grimoireApiUrl: configuration.grimoireApiUrl
				}
			});

			if (categoriesAndTags.categories && categoriesAndTags.tags) {
				$categories = categoriesAndTags.categories;
				$tags = categoriesAndTags.tags;
			}
		}

		if (theme) {
			document.documentElement.setAttribute('data-theme', themes[theme]);
		}

		const contentScriptResponse = await sendToContentScript<
			any,
			{
				html: string;
				description: string;
			}
		>({
			name: 'get-webpage-content'
		});

		if (contentScriptResponse) {
			$currentTab = {
				...$currentTab,
				contentHtml: contentScriptResponse.html,
				description: contentScriptResponse.description
			};
		}
	});

	$: $updatedUrl = $currentTab.url;

	enum themes {
		light = 'fantasy',
		dark = 'dracula'
	}

	function handleThemeChange(theme: keyof typeof themes) {
		document.documentElement.setAttribute('data-theme', themes[theme]);
		storage.set('theme', theme);
	}

	async function signIn() {
		const { token: newToken } = await sendToBackground<
			{
				emailOrUsername: string;
				password: string;
				grimoireApiUrl: string;
			},
			{
				token: string;
			}
		>({
			name: 'sign-in',
			body: {
				emailOrUsername: $credentials.emailOrUsername,
				password: $credentials.password,
				grimoireApiUrl: $updatedConfiguration.grimoireApiUrl ?? configuration.grimoireApiUrl
			}
		});

		if (newToken) {
			token = newToken;
			storage.set('token', newToken);
		}
	}

	function signOut() {
		storage.remove('token');
		token = '';
	}

	async function onAddBookmark() {
		const response = await sendToBackground<
			{
				token: string;
				grimoireApiUrl: string;
				bookmark: AddBookmarkRequestBody;
			},
			{
				bookmark: any;
			}
		>({
			name: 'add-bookmark',
			body: {
				token,
				grimoireApiUrl: $updatedConfiguration.grimoireApiUrl ?? configuration.grimoireApiUrl,
				bookmark: {
					url: $currentTab.url,
					title: $currentTab.title,
					icon_url: $currentTab.favIconUrl,
					main_image_url: $currentTab.mainImage,
					content_html: $currentTab.contentHtml,
					description: $currentTab.description,
					category: $currentTab.category,
					tags: $currentTab.tags,
					note: $currentTab.note,
					importance: $currentTab.importance,
					flagged: $currentTab.flagged
				}
			}
		});

		if (response.bookmark) {
			console.log('Bookmark added:', response.bookmark);
		}
	}

	async function onConfigurationChange() {
		// const grimoireApiUrlValidation = {
		// 	isDifferentThanBefore: $updatedConfiguration.grimoireApiUrl !== configuration.grimoireApiUrl,
		// 	hasValidStructure:
		// 		$updatedConfiguration.grimoireApiUrl !== '' &&
		// 		/^(http|https):\/\/.*\/$/.test($updatedConfiguration.grimoireApiUrl)
		// };

		storage.set('configuration', $updatedConfiguration);
		configuration = { ...configuration, ...$updatedConfiguration };
	}

	/**
	 * Clear the updated URL
	 */
	function clearUrl() {
		const url = new URL($updatedUrl);
		url.search = '';
		url.hash = '';
		$updatedUrl = url.toString();
	}
</script>

<div class="drawer drawer-end min-h-max min-w-80 max-w-80">
	<input id="my-drawer-4" type="checkbox" class="drawer-toggle" />
	<div class="drawer-content">
		<div
			class={`container flex flex-col min-h-max min-w-80 max-w-80 ${isDev ? 'border border-dotted border-red-600' : ''}`}
		>
			<!-- navbar -->
			<div class="flex items-center bg-base-100 px-2">
				<div class="flex-1">
					<span class="text-lg font-semibold normal-case"> grimoire </span>
					<span class="text-lg normal-case"> companion </span>
				</div>
				<div class="flex-none">
					<label class="swap swap-rotate">
						<input
							type="checkbox"
							class="theme-controller"
							on:change={(e) => handleThemeChange(e.target.checked ? 'dark' : 'light')}
						/>
						<svg
							class="swap-on fill-current w-6 h-6"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							><path
								d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"
							/></svg
						>
						<svg
							class="swap-off fill-current w-6 h-6"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							><path
								d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"
							/></svg
						>
					</label>
					<label class="btn btn-square btn-ghost" for="my-drawer-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							class="inline-block w-5 h-5 stroke-current"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
							></path></svg
						>
					</label>
				</div>
			</div>
			<!-- hero -->
			<h2 class="text-2xl font-semibold text-center mt-1 mb-4">Add current tab</h2>
			<!-- form -->
			<div
				class="flex flex-col items-center justify-center space-y-4 card rounded-box py-2 px-2 w-full"
			>
				<!-- url -->
				<div class="flex w-full items-center justify-between space-x-4">
					<span>URL:</span>
					<div class="flex items-center w-full max-w-60 space-x-2">
						<label
							for="url_input_modal"
							class="input input-bordered input-sm w-full max-w-60 text-left overflow-hidden whitespace-nowrap overflow-ellipsis"
						>
							{$currentTab.url}
						</label>

						{#if $currentTab.favIconUrl}
							<div class="tooltip tooltip-left" data-tip="Favicon">
								<img src={$currentTab.favIconUrl} alt="icon" class="w-6 h-6" />
							</div>
						{:else}
							<div class="tooltip tooltip-left" data-tip="Missing icon">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="icon icon-tabler icon-tabler-camera-off"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
										d="M8.297 4.289a.997 .997 0 0 1 .703 -.289h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v8m-1.187 2.828c-.249 .11 -.524 .172 -.813 .172h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h1c.298 0 .58 -.065 .834 -.181"
									/><path d="M10.422 10.448a3 3 0 1 0 4.15 4.098" /><path d="M3 3l18 18" /></svg
								>
							</div>
						{/if}
					</div>
				</div>
				<!-- title -->
				<div class="flex w-full items-center justify-between space-x-4">
					<span>Title:</span>
					<input
						type="text"
						class="input input-bordered input-sm w-full max-w-60"
						bind:value={$currentTab.title}
					/>
				</div>
				<!-- category -->
				<div class="flex w-full items-center justify-between space-x-4">
					<span>Category:</span>
					{#if $categories}
						<select
							class="select select-bordered select-sm w-full max-w-60"
							bind:value={$currentTab.category}
						>
							{#each $categories as category (category.id)}
								<option
									value={category.id}
									style="background-color: {category.color}"
									selected={category.initial === true}>{category.name}</option
								>
							{/each}
						</select>
					{/if}
				</div>
				<!-- tags -->
				<div class="flex w-full items-center justify-between space-x-4">
					<span>Tags:</span>
					<input
						type="text"
						class="input input-bordered input-sm w-full max-w-60"
						placeholder="Comma separated tags..."
					/>
				</div>
				<!-- note -->
				<div class="flex w-full items-center justify-between space-x-4">
					<span>Note:</span>
					<textarea
						class="textarea textarea-bordered textarea-sm w-full max-w-60"
						placeholder="Add a note to self..."
						bind:value={$currentTab.note}
					></textarea>
				</div>

				<!-- attributes -->
				<div class="flex w-full items-center justify-end space-x-8">
					<!-- importance 0-3 -->
					<div class="flex flex-col w-fit">
						<label for="importance" class="label">Importance</label>
						<div class="rating rating-md">
							<input type="radio" name="importance" class="rating-hidden" value="" checked />
							<input
								type="radio"
								name="importance"
								class="mask mask-star-2 bg-orange-400"
								value="1"
							/>
							<input
								type="radio"
								name="importance"
								class="mask mask-star-2 bg-orange-400"
								value="2"
							/>
							<input
								type="radio"
								name="importance"
								class="mask mask-star-2 bg-orange-400"
								value="3"
							/>
						</div>
					</div>
					<!-- flag it -->
					<label class="cursor-pointer">
						<label for="flag" class="label">Flagged</label>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							bind:checked={$currentTab.flagged}
						/>
						<span class="toggle-mark"></span>
					</label>
				</div>
				<!-- submit -->
				<div class="flex w-full items-center justify-between space-x-4">
					<button class="btn btn-primary btn-md w-full text-lg" on:click={onAddBookmark}
						>Add Bookmark</button
					>
				</div>

				<!-- 'Show more details' collapsed  -->
				<div class="collapse collapse-arrow bg-base-200">
					<input type="checkbox" />
					<div class="collapse-title text-lg font-medium">Show more details</div>
					<div class="collapse-content space-y-1">
						<!-- icon url -->
						<div class="flex w-full items-center justify-between space-x-4">
							<span>Icon:</span>
							<div class="flex space-x-1 items-center">
								{#if $currentTab.favIconUrl}
									<div class="tooltip" data-tip="Favicon preview">
										<img src={$currentTab.favIconUrl} alt="icon" class="w-6 h-6" />
									</div>
								{/if}
								<input
									type="text"
									bind:value={$currentTab.favIconUrl}
									placeholder="Icon URL..."
									class="input input-bordered input-sm w-full max-w-44"
								/>
							</div>
						</div>
						<!-- main-image -->
						<div class="flex w-full items-center justify-between space-x-4">
							<span class="min-w-fit">Main Image:</span>
							<input
								type="text"
								class="input input-bordered input-sm w-full max-w-44"
								placeholder="Main image URL..."
								bind:value={$currentTab.mainImage}
							/>
						</div>
						<!-- description -->
						<div class="flex w-full items-center justify-between space-x-4">
							<span>Description:</span>
							<textarea
								class="textarea textarea-bordered textarea-sm w-full max-w-44"
								placeholder="Website's description (if available)"
								bind:value={$currentTab.description}
							/>
						</div>
						<!-- debug -->
						<div class="flex w-full items-center justify-between space-x-4">
							<span>HTML:</span>
							<label
								for="html_content_modal"
								class="btn btn-secondary btn-sm cursor-pointer w-full max-w-44"
							>
								Preview
							</label>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="drawer-side">
		<label for="my-drawer-4" aria-label="close sidebar" class="drawer-overlay"></label>
		<ul class="menu p-4 w-72 min-h-full bg-base-100 text-base-content">
			<!-- Sidebar content here -->
			<div class="w-full h-full flex flex-col space-y-4">
				<div class="collapse collapse-arrow bg-base-200">
					<input type="radio" name="my-accordion-2" checked={true} />
					<div class="collapse-title text-xl font-medium">Connection Details</div>
					<div class="collapse-content">
						<label class="form-control w-full max-w-xs">
							<div class="label">
								<span class="label-text">Grimoire API URL</span>
							</div>
							<input
								type="text"
								placeholder="https://<GRIMOIRE_URL>/api"
								class="input input-sm input-bordered w-full max-w-xs"
								bind:value={$updatedConfiguration.grimoireApiUrl}
							/>

							{#if !token}
								<label class="form-control w-full max-w-xs">
									<div class="label">
										<span class="label-text">Username / e-mail</span>
									</div>
									<input
										type="text"
										placeholder="Type here"
										class="input input-sm input-bordered w-full max-w-xs"
										bind:value={$credentials.emailOrUsername}
									/>
								</label><label class="form-control w-full max-w-xs">
									<div class="label">
										<span class="label-text">Password</span>
									</div>
									<input
										type="password"
										placeholder="Type here"
										class="input input-sm input-bordered w-full max-w-xs"
										bind:value={$credentials.password}
									/>
								</label>
								<!-- Sign in button -->
								<button class="btn btn-primary btn-sm w-full max-w-xs my-4" on:click={signIn}
									>Sign in</button
								>
							{:else}
								<button class="btn btn-secondary btn-sm w-full max-w-xs my-4" on:click={signOut}
									>Sign out</button
								>
								<!-- Token: {token} -->
							{/if}
						</label>
					</div>

					<!-- <div class="collapse collapse-arrow bg-base-200">
					<input type="radio" name="my-accordion-2" /> 
					<div class="collapse-title text-xl font-medium">
					  Click to open this one and close others
					</div>
					<div class="collapse-content"> 
					  <p>hello</p>
					</div>
				  </div> -->
				</div>
				<button class="btn btn-primary btn-sm w-20 mt-auto ml-auto" on:click={onConfigurationChange}
					>Save</button
				>
			</div>
		</ul>
	</div>
</div>

<!-- URL modal -->
<input type="checkbox" id="url_input_modal" class="modal-toggle" />
<div class="modal" role="dialog">
	<div class="modal-box">
		<textarea
			class="textarea textarea-bordered textarea-sm w-full"
			placeholder="URL cannot be empty!"
			bind:value={$updatedUrl}
		/>
		<div class="modal-action">
			<button class="btn btn-secondary btn-sm" on:click={clearUrl}>Clear it!</button>
			<label
				for="url_input_modal"
				class="btn btn-primary btn-sm"
				on:click={() => ($currentTab.url = $updatedUrl)}>Update</label
			>
		</div>
	</div>
</div>

<!-- HTML content modal -->
<input type="checkbox" id="html_content_modal" class="modal-toggle" />
<div class="modal" role="dialog">
	<div class="modal-box p-2 rounded-sm">
		<iframe
			srcdoc={$currentTab.contentHtml}
			class="w-full h-full min-h-96"
			frameborder="0"
			scrolling="yes"
			title="HTML content"
		/>

		<div class="modal-action">
			<label for="html_content_modal" class="btn btn-primary btn-sm mr-2 mb-2">Close</label>
		</div>
	</div>
</div>
