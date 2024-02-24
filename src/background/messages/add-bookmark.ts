import { type PlasmoMessaging } from '@plasmohq/messaging';
import type { AddBookmarkRequestBody } from '~shared/types/add-bookmark.type';
import { logger } from '~shared/debug-logs';

export const handler: PlasmoMessaging.MessageHandler<{
	grimoireApiUrl: string;
	token: string;
	bookmark: AddBookmarkRequestBody;
}> = async (req, res) => {
	const { grimoireApiUrl, token, bookmark } = {
		...req.body
	};
	logger.debug('background.messages.add-bookmark', 'Adding bookmark', {
		grimoireApiUrl,
		bookmark
	});

	try {
		const res = await fetch(`${grimoireApiUrl}/bookmarks`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(bookmark)
		}).then((response) => response.json());

		logger.debug('background.messages.add-bookmark', 'Grimoire API response', res);

		res.send({
			res
		});
	} catch (error) {
		logger.error('background.messages.add-bookmark', 'Error adding bookmark', error);

		res.send({
			res: null
		});
	}
};

export default handler;
