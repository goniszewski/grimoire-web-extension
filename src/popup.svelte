<script lang="ts">
	import { sendToBackground, sendToContentScript } from '@plasmohq/messaging';
	import { Storage } from '@plasmohq/storage';
	import { onDestroy, onMount } from 'svelte';
	import Navbar from '~shared/components/Navbar.component.svelte';
	import TagsInput from '~shared/components/TagsInput.component.svelte';
	import { themes } from '~shared/enums';
	import { handleSignIn } from '~shared/handlers/handle-sign-in.handler';
	import { onAddBookmark } from '~shared/handlers/on-add-bookmark.handler';
	import { validateGrimoireApiUrl } from '~shared/helpers/validate-grimoire-api-url';
	import {
		categories,
		credentials,
		currentTab,
		loading,
		status,
		tags,
		updatedUrl
	} from '~shared/stores';
	import { clearUrl } from '~shared/utils/clear-url.util';
	import { logger } from '~shared/utils/debug-logs';
	import { ToastNode, showToast } from '~shared/utils/show-toast';
	import './style.css';

	const isDev = process.env.NODE_ENV === 'development';
	const storage = new Storage();

	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		if (!tabs[0]) {
			logger.error('chrome.tabs.query', 'No active tab found');

			return;
		}

		$currentTab = {
			...$currentTab,
			url: tabs[0].url,
			title: tabs[0].title,
			icon_url: tabs[0].favIconUrl
		};

		logger.debug('chrome.tabs.query', 'active tab', $currentTab);
	});

	let token: string = '';
	let configuration: {
		grimoireApiUrl: string;
		saveScreenshot: boolean;
	} = {
		grimoireApiUrl: '',
		saveScreenshot: false
	};
	let validationInterval: NodeJS.Timeout;

	$: $updatedUrl = $currentTab.url;

	async function onValidateGrimoireApiUrl() {
		if (!configuration.grimoireApiUrl) {
			$status.isGrimoireApiReachable = false;

			showToast.error('Grimoire API URL is empty!');
		}

		const isGrimoireApiReachable = await validateGrimoireApiUrl(configuration.grimoireApiUrl).catch(
			(error) => {
				logger.error('onValidateGrimoireApiUrl', 'Error validating Grimoire API URL', error);
				showToast(`Grimoire API is ${isGrimoireApiReachable}!`);

				return false;
			}
		);

		if ($status.isGrimoireApiReachable && !isGrimoireApiReachable) {
			showToast.error('Grimoire API is not reachable!');
		} else if (!$status.isGrimoireApiReachable && isGrimoireApiReachable && $categories.length) {
			showToast.success('Reconnected to Grimoire API!');
		} else if (!$status.isGrimoireApiReachable && isGrimoireApiReachable && !$categories.length) {
			showToast.success('Connected to Grimoire API!');
			fetchUserData();
		}

		$status = {
			...$status,
			isGrimoireApiReachable
		};
	}

	async function fetchUserData() {
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

		logger.debug('onMount', 'fetching categories and tags response', { categoriesAndTags });

		if (!categoriesAndTags.categories || !categoriesAndTags.tags) {
			logger.error('onMount', 'fetching categories and tags', 'No categories or tags found');

			return;
		}
		$categories = categoriesAndTags.categories;
		$tags = categoriesAndTags.tags;

		$currentTab.category = $categories.find((category) => category.initial === true)?.id;

		logger.debug('onMount', 'categories and tags', { categories: $categories, tags: $tags });

		return true;
	}

	onMount(async () => {
		logger.debug('popup.onMount', 'init');

		const theme = await storage.get('theme');
		token = await storage.get('token');
		configuration = await storage.get('configuration');

		if (theme) {
			document.documentElement.setAttribute('data-theme', themes[theme]);
		}

		logger.debug('onMount', 'loaded storage data', { theme, token: !!token, configuration });

		await onValidateGrimoireApiUrl();

		if (token && $status.isGrimoireApiReachable) {
			const userSignedIn = await fetchUserData();

			if (!userSignedIn) {
				signOut();
			}
		}

		logger.debug(
			'onMount',
			'Grimoire API status',
			$status.isGrimoireApiReachable ? 'reachable' : 'not reachable'
		);

		try {
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

				logger.debug('onMount', 'contentScriptResponse', contentScriptResponse);
			}
		} catch (error) {
			logger.error('onMount', 'contentScriptResponse', 'Could not get content from content script');
		}

		logger.debug('onMount', 'validationInterval', 'initiating');

		validationInterval = setInterval(() => {
			onValidateGrimoireApiUrl();
		}, 5000);
	});

	onDestroy(() => {
		clearInterval(validationInterval);
	});

	async function signIn() {
		$loading.isSigningIn = true;

		const newToken = await handleSignIn(
			configuration.grimoireApiUrl,
			$credentials.emailOrUsername,
			$credentials.password
		);

		if (newToken) {
			token = newToken;
			storage.set('token', newToken);
			$status = {
				...$status,
				isGrimoireApiReachable: true
			};

			logger.debug('signIn', 'User signed in');

			await fetchUserData();
		}
		$loading.isSigningIn = false;
	}

	function signOut() {
		storage.remove('token');
		token = '';

		logger.debug('signOut', 'User signed out');
	}

	async function onConfigurationChange() {
		storage.set('configuration', configuration);

		logger.debug('onConfigurationChange', 'Configuration changed', configuration);
		showToast.success('Configuration saved! 🪶');
	}
</script>

<div class="drawer drawer-end min-h-max min-w-80 max-w-80">
	{#if !$status.isGrimoireApiReachable}
		<div class="container flex flex-col min-w-80 max-w-80 min-h-96 p-8">
			<h2 class="text-2xl font-semibold text-center mt-1 mb-4">Sign in</h2>
			<p class="text-accent text-center mb-4">
				{#if token}
					Oh snap! Grimoire API went dark. Please check the URL and try again.
				{:else}
					First things first! Let's connect to your Grimoire instance!
				{/if}
			</p>
			<div class="label">
				<span class="label-text">Grimoire API URL</span>
			</div>
			<input
				type="text"
				placeholder="https://<GRIMOIRE_URL>/api"
				class="input input-sm input-bordered w-full max-w-xs"
				bind:value={configuration.grimoireApiUrl}
				on:keyup={(e) => {
					if (e.key === 'Enter') {
						onValidateGrimoireApiUrl();
					}
				}}
			/>
			{#if !$status.isGrimoireApiReachable}
				<p class="text-red-600 py-2">Grimoire API is not reachable!</p>
			{/if}
			<button
				class="btn btn-primary btn-sm w-full max-w-xs my-4"
				on:click={() => onValidateGrimoireApiUrl()}>Try to connect</button
			>
		</div>
	{:else if !token}
		<div class="container flex flex-col min-w-80 max-w-80 min-h-96 p-8">
			<h2 class="text-2xl font-semibold text-center mt-1 mb-4">Sign in</h2>
			<p class="text-accent text-center mb-4">Signed out! Please sign in to continue.</p>
			<label class="form-control w-full max-w-xs">
				<div class="label">
					<span class="label-text">Username / e-mail</span>
				</div>
				<input
					type="text"
					placeholder="Type here"
					class="input input-sm input-bordered w-full max-w-xs"
					bind:value={$credentials.emailOrUsername}
					on:keyup={(e) => {
						if (e.key === 'Enter') {
							signIn();
						}
					}}
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
					on:keyup={(e) => {
						if (e.key === 'Enter') {
							signIn();
						}
					}}
				/>
			</label>
			<button
				class="btn btn-primary btn-sm w-full max-w-xs my-4"
				on:click={signIn}
				disabled={$loading.isSigningIn}
			>
				{#if $loading.isSigningIn}
					<span class="loading loading-spinner" />
					Signing in...
				{:else}
					Sign in
				{/if}
			</button>
		</div>
	{:else if !$categories.length}
		<div class="container flex flex-col justify-center items-center min-w-80 max-w-80 min-h-96 p-8">
			<span class="text-md font-semibold text-center mt-1 mb-4">
				Fetching categories and tags...
			</span>
			<span class="loading loading-infinity loading-lg"></span>
		</div>
	{:else}
		<input id="my-drawer-4" type="checkbox" class="drawer-toggle" />
		<div class="drawer-content">
			<div
				class={`container flex flex-col min-h-max min-w-80 max-w-80 ${isDev ? 'border border-dotted border-red-600' : ''}`}
			>
				<!-- navbar -->
				<Navbar {storage} />
				<!-- form -->
				<div
					class="flex flex-col items-center justify-center space-y-3 card rounded-box py-2 px-2 w-full"
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

							{#if $currentTab.icon_url}
								<div class="tooltip tooltip-left" data-tip="Favicon">
									<img src={$currentTab.icon_url} alt="icon" class="w-6 min-w-6 h-6 min-h-6" />
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
							placeholder="Title..."
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
						<TagsInput fetchedTags={$tags.map((tag) => tag.name)} selectedTags={currentTab} />
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
					<div class="flex w-full max-w-60 items-center justify-between ml-auto pr-12">
						<!-- importance 0-3 -->
						<div class="flex flex-col w-fit">
							<label for="importance" class="label">Importance</label>
							<div class="rating rating-md">
								<input
									type="radio"
									name="importance"
									class="rating-hidden"
									value=""
									checked
									on:change={() => ($currentTab.importance = 0)}
								/>
								<input
									type="radio"
									name="importance"
									class="mask mask-star-2 bg-orange-400"
									value="1"
									on:change={() => ($currentTab.importance = 1)}
								/>
								<input
									type="radio"
									name="importance"
									class="mask mask-star-2 bg-orange-400"
									value="2"
									on:change={() => ($currentTab.importance = 2)}
								/>
								<input
									type="radio"
									name="importance"
									class="mask mask-star-2 bg-orange-400"
									value="3"
									on:change={() => ($currentTab.importance = 3)}
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
						<button
							class={`btn btn-primary btn-md w-full text-lg ${$loading.justAddedBookmark ? 'btn-success animate-pulse' : ''}`}
							on:click={() =>
								onAddBookmark(
									$currentTab,
									token,
									configuration.grimoireApiUrl,
									configuration.saveScreenshot
								)}
							disabled={$loading.isAddingBookmark && !$loading.justAddedBookmark}
						>
							{#if $loading.justAddedBookmark}
								Bookmark added!
							{:else if $loading.isAddingBookmark}
								<span class="loading loading-spinner" />
								Sending...
							{:else}
								Add Bookmark
							{/if}
						</button>
					</div>

					<!-- 'Show more details' collapsed  -->
					<div class="collapse collapse-arrow bg-base-200">
						<input type="checkbox" />
						<div class="collapse-title text-lg font-medium">Show more details</div>
						<div class="collapse-content space-y-2">
							<!-- icon url -->
							<div class="flex w-full items-center justify-between space-x-4">
								<span>Icon:</span>
								<div class="flex space-x-1 items-center">
									{#if $currentTab.icon_url}
										<div class="tooltip" data-tip="Favicon preview">
											<img src={$currentTab.icon_url} alt="icon" class="w-6 h-6" />
										</div>
									{/if}
									<input
										type="text"
										bind:value={$currentTab.icon_url}
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
									class={`input input-sm input-bordered w-full max-w-xs ${
										!$status.isGrimoireApiReachable ? 'input-error' : 'input-success'
									}`}
									bind:value={configuration.grimoireApiUrl}
								/>
								{#if !$status.isGrimoireApiReachable}
									<p class="text-red-600 py-2">Grimoire API is not reachable!</p>
								{/if}

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

						<div class="collapse collapse-arrow bg-base-200">
							<input type="radio" name="my-accordion-2" />
							<div class="collapse-title text-xl font-medium">Other options</div>
							<div class="collapse-content">
								<label class="label cursor-pointer">
									<span class="label-text">Send webpage screenshot</span>
									<input
										type="checkbox"
										class={`toggle toggle-primary`}
										bind:checked={configuration.saveScreenshot}
									/>
								</label>
							</div>
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
					<button
						class="btn btn-primary btn-sm w-20 mt-auto ml-auto"
						on:click={onConfigurationChange}>Save</button
					>
				</div>
			</ul>
		</div>
	{/if}
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
			<button
				class="btn btn-secondary btn-sm"
				on:click={() => ($updatedUrl = clearUrl($updatedUrl))}>Clear it!</button
			>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
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
<ToastNode
	toastOptions={{
		position: 'top-center'
	}}
/>

<style>
	:global(div.multiselect) {
		min-width: 15rem;
		max-width: 15rem !important;
		border: 1px solid oklch(var(--bc) / 0.2) !important;
		border-radius: 0.5rem !important;
	}

	:global(div.multiselect > ul.options) {
		background-color: oklch(var(--b1)) !important;
	}

	:global(div.multiselect > ul.options > li) {
		color: oklch(var(--bc)) !important;
	}
</style>
