import { type PlasmoMessaging } from '@plasmohq/messaging';
import { logger } from '~shared/debug-logs';

export {};

const handler: PlasmoMessaging.MessageHandler<{
	grimoireApiUrl: string;
	token: string;
}> = async (req, res) => {
	const { grimoireApiUrl, token } = req.body;

	logger.debug('background.messages.fetch-categories-tags', 'Fetching categories and tags', {
		grimoireApiUrl
	});

	try {
		const { categories } = await fetch(`${grimoireApiUrl}/categories`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		}).then((response) => response.json());

		logger.debug('background.messages.fetch-categories-tags', 'Fetched categories', categories);

		const { tags } = await fetch(`${grimoireApiUrl}/tags`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		}).then((response) => response.json());

		logger.debug('background.messages.fetch-categories-tags', 'Fetched tags', tags);

		res.send({
			categories,
			tags
		});
	} catch (error) {
		logger.error(
			'background.messages.fetch-categories-tags',
			'Error fetching categories and tags',
			error
		);

		res.send({
			categories: null,
			tags: null
		});
	}
};

export default handler;
