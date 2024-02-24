import { sendToBackground } from '@plasmohq/messaging';
import { logger } from '~shared/utils/debug-logs';
import type { AddBookmarkRequestBody } from '~shared/types/add-bookmark.type';

export async function onAddBookmark($currentTab: any, token: string, grimoireApiUrl: string) {
	logger.debug('onAddBookmark', 'init', $currentTab);

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
			grimoireApiUrl,
			bookmark: {
				url: $currentTab.url,
				title: $currentTab.title,
				icon_url: $currentTab.icon_url,
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
		logger.debug('onAddBookmark', 'Bookmark added', response.bookmark);
	}
}
