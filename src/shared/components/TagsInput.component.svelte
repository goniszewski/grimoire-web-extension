<script lang="ts">
	import MultiSelect from 'svelte-multiselect/dist/MultiSelect.svelte';

	export let fetchedTags;
	export let selectedTags;
</script>

<MultiSelect
	options={fetchedTags}
	allowUserOptions={true}
	duplicates={false}
	bind:selected={$selectedTags.tags}
/>
