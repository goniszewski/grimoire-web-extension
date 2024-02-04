<script lang="ts">
	import './style.css';

	export let currentTab = {
		url: 'https://daisyui.com/components/input/',
		title: 'Tailwind Text Input Component — Tailwind CSS Components ( version 4 update is here )',
		favIconUrl: ''
	};

	export let categories = [
		{
			id: 1,
			name: 'Uncategorized',
			color: '#f3f4f6'
		},
		{
			id: 2,
			name: 'Programming',
			color: '#F87171'
		}
	];

	// chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
	// 	currentTab = {
	// 		url: tabs[0].url,
	// 		title: tabs[0].title,
	// 		favIconUrl: tabs[0].favIconUrl
	// 	};
	// });
</script>

<div class="container flex flex-col min-w-80 min-h-96 max-w-80 border border-dotted border-red-600">
	<!-- navbar -->
	<div class="navbar bg-base-100">
		<div class="flex-1">
			<span class=" text-lg font-semibold normal-case"> grimoire companion </span>
		</div>
		<div class="flex-none">
			<label class="swap swap-rotate">
				<input type="checkbox" class="theme-controller" value="fantasy" />
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
			<button class="btn btn-square btn-ghost">
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
			</button>
		</div>
	</div>
	<!-- hero -->
	<h2 class="text-2xl font-semibold text-center mt-2 mb-4">Add current tab</h2>
	<!-- form -->
	<div
		class="flex flex-col items-center justify-center space-y-4 card rounded-box py-8 px-2 w-full border"
	>
		<!-- url -->
		<div class="flex w-full items-center justify-center space-x-4">
			<span>URL:</span>
			<input
				type="text"
				value={currentTab.url}
				disabled
				class="input input-bordered input-sm w-full max-w-xs"
			/>
		</div>
		<!-- title -->
		<div class="flex w-full items-center justify-center space-x-4">
			<span>Title:</span>
			<input
				type="text"
				value={currentTab.title}
				class="input input-bordered input-sm w-full max-w-xs"
			/>
		</div>
		<!-- category -->
		<div class="flex w-full items-center justify-center space-x-4">
			<span>Category:</span>
			<select class="select select-bordered select-sm w-full max-w-xs">
				{#each categories as category}
					<option value={category.id} style="background-color: {category.color}"
						>{category.name}</option
					>
				{/each}
			</select>
		</div>
		<!-- tags -->
		<div class="flex w-full items-center justify-center space-x-4">
			<span>Tags:</span>
			<input
				type="text"
				class="input input-bordered input-sm w-full max-w-xs"
				placeholder="Comma separated tags..."
			/>
		</div>
		<!-- note -->
		<div class="flex w-full items-center justify-center space-x-4">
			<span>Note:</span>
			<textarea
				class="textarea textarea-bordered textarea-sm w-full max-w-xs"
				placeholder="Add a note to self..."
			></textarea>
		</div>

		<!-- attributes -->
		<div class="flex w-full items-center justify-center space-x-4">
			<!-- importance 0-3 -->
			<div class="flex flex-col w-fit">
				<label for="importance" class="label">Importance</label>
				<div class="rating rating-md">
					<input type="radio" name="importance" class="rating-hidden" value="" checked />
					<input type="radio" name="importance" class="mask mask-star-2 bg-orange-400" value="1" />
					<input type="radio" name="importance" class="mask mask-star-2 bg-orange-400" value="2" />
					<input type="radio" name="importance" class="mask mask-star-2 bg-orange-400" value="3" />
				</div>
			</div>
			<!-- flag it -->
			<label class="cursor-pointer">
				<label for="flag" class="label">Flagged</label>
				<input type="checkbox" class="toggle toggle-primary" />
				<span class="toggle-mark"></span>
			</label>
			<!-- unread -->
			<label class="cursor-pointer">
				<label for="unread" class="label">Unread</label>
				<input type="checkbox" class="toggle toggle-primary" />
				<span class="toggle-mark"></span>
			</label>
		</div>

		<!-- collapse -->
		<div class="collapse collapse-arrow bg-base-200">
			<input type="checkbox" />
			<div class="collapse-title text-lg font-medium">Show more details</div>
			<div class="collapse-content">
				<!-- icon url -->
				<div class="flex w-full items-center justify-center space-x-4">
					<span>Icon:</span>
					<input
						type="text"
						value={currentTab.favIconUrl}
						class="input input-bordered input-sm w-full max-w-xs"
					/>
				</div>
        <!-- main-image -->
        <div class="flex w-full items-center justify-center space-x-4">
          <span>Main Image:</span>
          <input
            type="text"
            class="input input-bordered input-sm w-full max-w-xs"
          />
        </div>
				<!-- description -->
				<div class="flex w-full items-center justify-center space-x-4">
					<span>Description:</span>
					<textarea class="textarea textarea-bordered textarea-sm w-full max-w-xs"></textarea>
				</div>
			</div>
		</div>
	</div>
</div>
