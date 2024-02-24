<script lang="ts">
	import MultiSelect from 'svelte-multiselect/dist/MultiSelect.svelte';
	import { currentTab } from '~shared/stores';

	export let fetchedTags;
	export let selectedTags;
</script>

<MultiSelect
	options={fetchedTags}
	allowUserOptions={true}
	duplicates={false}
	bind:selected={$selectedTags.tags}
/>
