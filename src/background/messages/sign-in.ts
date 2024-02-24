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
		emailOrUsername
	});

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

		logger.debug('background.messages.sign-in', 'Grimoire API response', {
			grimoireApiUrl,
			emailOrUsername
		});

		res.send({
			token
		});
	} catch (error) {
		logger.error('background.messages.sign-in', 'Error signing in', error);

		res.send({
			token: null
		});
	}
};

export default handler;
