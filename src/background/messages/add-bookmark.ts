import { type PlasmoMessaging } from '@plasmohq/messaging';
import type { AddBookmarkRequestBody } from '~shared/types/add-bookmark.type';
import { logger } from '~shared/utils/debug-logs';

export const handler: PlasmoMessaging.MessageHandler<{
	grimoireApiUrl: string;
	token: string;
	bookmark: AddBookmarkRequestBody;
}> = async (req, res) => {
	const { grimoireApiUrl, token, bookmark } = req.body;

	logger.debug('background.messages.add-bookmark', 'Adding bookmark', {
		grimoireApiUrl,
		bookmark
	});

	try {
		const response = await fetch(`${grimoireApiUrl}/bookmarks`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(bookmark)
		}).then((data) => data.json());

		logger.debug('background.messages.add-bookmark', 'Grimoire API response', response);

		res.send({
			bookmark: response?.bookmark
		});
	} catch (error) {
		logger.error('background.messages.add-bookmark', 'Error adding bookmark', error?.message);

		res.send({
			bookmark: null
		});
	}
};

export default handler;
