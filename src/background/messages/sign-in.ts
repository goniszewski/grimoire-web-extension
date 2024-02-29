import { type PlasmoMessaging } from '@plasmohq/messaging';
import { logger } from '~shared/utils/debug-logs';

export {};

const handler: PlasmoMessaging.MessageHandler<{
	emailOrUsername: string;
	password: string;
	grimoireApiUrl: string;
}> = async (req, res) => {
	const { emailOrUsername, password, grimoireApiUrl } = req.body;

	logger.debug('background.messages.sign-in', 'Signing in', {
		grimoireApiUrl,
		emailOrUsername,
		password: `${password.slice(0, 2)}***${password.slice(-2)}`
	});

	try {
		const response = await fetch(`${grimoireApiUrl}/auth`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				login: emailOrUsername,
				password
			})
		}).then((res) => res.json());

		const { token, ...responseWithoutToken } = response;

		if (!response.success) {
			logger.error('background.messages.sign-in', 'Error signing in', responseWithoutToken);

			return res.send({
				token: null
			});
		}

		return res.send({
			token
		});
	} catch (error) {
		logger.error('background.messages.sign-in', 'Error signing in', error?.message);

		res.send({
			token: null
		});
	}
};

export default handler;
