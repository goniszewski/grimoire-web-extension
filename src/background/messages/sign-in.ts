import { type PlasmoMessaging } from '@plasmohq/messaging';

export {};

const handler: PlasmoMessaging.MessageHandler<{
	emailOrUsername: string;
	password: string;
	grimoireApiUrl: string;
}> = async (req, res) => {
	const { emailOrUsername, password, grimoireApiUrl } = {
		...req.body
	};

	try {
		const { token } = await fetch(`${grimoireApiUrl}/auth`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				login: emailOrUsername,
				password
			})
		}).then((response) => response.json());

		res.send({
			token
		});
	} catch (error) {
		res.send({
			token: null
		});
	}
};

export default handler;
