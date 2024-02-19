import { type PlasmoMessaging } from '@plasmohq/messaging';
import type { AddBookmarkRequestBody } from '~types/add-bookmark.type';

export const handler: PlasmoMessaging.MessageHandler<{
	grimoireApiUrl: string;
	token: string;
	bookmark: AddBookmarkRequestBody;
}> = async (req, res) => {
	const { grimoireApiUrl, token, bookmark } = {
		...req.body
	};

	try {
		const res = await fetch(`${grimoireApiUrl}/bookmarks`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(bookmark)
		}).then((response) => response.json());

		res.send({
			res
		});
	} catch (error) {
		res.send({
			res: null
		});
	}
};

export default handler;
