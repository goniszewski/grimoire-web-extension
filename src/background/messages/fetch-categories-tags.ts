import { type PlasmoMessaging } from '@plasmohq/messaging';

export {};

const handler: PlasmoMessaging.MessageHandler<{
	grimoireApiUrl: string;
	token: string;
}> = async (req, res) => {
	const { grimoireApiUrl, token } = {
		...req.body
	};

	try {
		const { categories } = await fetch(`${grimoireApiUrl}/categories`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		}).then((response) => response.json());

		const { tags } = await fetch(`${grimoireApiUrl}/tags`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		}).then((response) => response.json());

		res.send({
			categories,
			tags
		});
	} catch (error) {
		res.send({
			categories: null,
			tags: null
		});
	}
};

export default handler;
