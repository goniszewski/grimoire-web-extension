<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { handleGrimoireApiCheck } from '~shared/handlers/handle-grimoire-api-check.handler';

	export let status: Writable<Record<string, any>>;
	export let grimoireApiUrl: string;
</script>

<div class="flex items-center justify-center bg-red-600 text-white text-lg font-semibold">
	<span class=" text-base-100">Grimoire API is not reachable!</span>
	<button class="btn btn-link" on:click={() => handleGrimoireApiCheck(grimoireApiUrl, $status)}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="icon icon-tabler icon-tabler-refresh"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
			><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
				d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"
			/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg
		>
	</button>
</div>
