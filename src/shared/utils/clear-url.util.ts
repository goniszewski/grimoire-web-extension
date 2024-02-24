/**
 * Clear the updated URL
 */
export function clearUrl(url: string) {
	const newUrl = new URL(url);
	newUrl.search = '';
	newUrl.hash = '';

	return newUrl.toString();
}
