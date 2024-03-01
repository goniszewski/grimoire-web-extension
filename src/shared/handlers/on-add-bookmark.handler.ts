import { sendToBackground } from '@plasmohq/messaging';
import { logger } from '~shared/utils/debug-logs';
import type { AddBookmarkRequestBody } from '~shared/types/add-bookmark.type';

export async function onAddBookmark(
	$currentTab: any,
	token: string,
	grimoireApiUrl: string,
	capturePageScreenshot?: boolean
) {
	logger.debug('onAddBookmark', 'init', $currentTab);
	let screenshot: string | null = null;

	if (capturePageScreenshot) {
		await new Promise((resolve) => {
			chrome.tabs.captureVisibleTab(function (screenshotDataUrl) {
				const screenshotImage = new Image();
				screenshotImage.src = screenshotDataUrl;
				screenshotImage.onload = function () {
					const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');

					ctx.imageSmoothingEnabled = true;

					canvas.height = 800;
					canvas.width = (screenshotImage.width / screenshotImage.height) * 800;
					ctx.drawImage(screenshotImage, 0, 0, canvas.width, canvas.height);

					// Safari doesn't currently support converting to webp :(
					// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL#browser_compatibility
					const resizedScreenshotDataUrl = canvas.toDataURL(
						isSafari ? 'image/jpeg' : 'image/webp',
						0.8
					);

					screenshot = resizedScreenshotDataUrl;

					resolve(null);
				};
			});
		});
	}
	logger.debug('onAddBookmark', 'Bookmark body', {
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
		flagged: $currentTab.flagged,
		screenshot
	});

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
				flagged: $currentTab.flagged,
				screenshot
			}
		}
	});

	if (response.bookmark) {
		logger.debug('onAddBookmark', 'Bookmark added', response.bookmark);
	}
}
