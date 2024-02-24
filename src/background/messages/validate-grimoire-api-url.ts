import { type PlasmoMessaging } from '@plasmohq/messaging';
import { logger } from '~shared/debug-logs';

export {};

const handler: PlasmoMessaging.MessageHandler<{
	grimoireApiUrl: string;
}> = async (req, res) => {
	const { grimoireApiUrl } = req.body;

	logger.debug('background.messages.validate-grimoire-api-url', 'Validating Grimoire API URL', {
		grimoireApiUrl
	});

	try {
		await fetch(`${grimoireApiUrl}/health`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		logger.debug(
			'background.messages.validate-grimoire-api-url',
			'Connection to Grimoire API established'
		);

		res.send({
			valid: true
		});
	} catch (error) {
		logger.error(
			'background.messages.validate-grimoire-api-url',
			'Error validating Grimoire API URL',
			error
		);

		res.send({
			valid: false
		});
	}
};

export default handler;
