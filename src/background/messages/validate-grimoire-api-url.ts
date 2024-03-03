import { type PlasmoMessaging } from '@plasmohq/messaging';
import { logger } from '~shared/utils/debug-logs';

export {};

const handler: PlasmoMessaging.MessageHandler<{
	grimoireApiUrl: string;
}> = async (req, res) => {
	const { grimoireApiUrl } = req.body;

	logger.debug('background.messages.validate-grimoire-api-url', 'Validating Grimoire API URL', {
		grimoireApiUrl
	});

	try {
		const response = await fetch(`${grimoireApiUrl}/health`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		}); // todo: it always returns empty object

		response.ok
			? logger.debug(
					'background.messages.validate-grimoire-api-url',
					'Connection to Grimoire API established'
				)
			: logger.error(
					'background.messages.validate-grimoire-api-url',
					'Error validating Grimoire API URL',
					{
						status: response.status,
						statusText: response.statusText
					}
				);

		res.send({
			valid: response.ok
		});
	} catch (error) {
		logger.error(
			'background.messages.validate-grimoire-api-url',
			'Error validating Grimoire API URL',
			error?.message
		);
		res.send({
			valid: false
		});
	}
};

export default handler;
