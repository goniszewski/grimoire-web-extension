import { listen } from '@plasmohq/messaging/message';
import { logger } from '~shared/utils/debug-logs';

listen(async (_req, res) => {
	logger.debug('background.messages.get-webpage-content', 'Fetching webpage content');

	try {
		const html = window.document.documentElement.innerHTML;
		const description = window.document
			.querySelector("meta[name='description']")
			?.getAttribute('content');

		logger.debug('background.messages.get-webpage-content', 'Fetched webpage content', {
			html,
			description
		});

		return res.send({
			html,
			description
		});
	} catch (error) {
		logger.error(
			'background.messages.get-webpage-content',
			'Error fetching webpage content',
			error
		);

		return res.send({
			html: null,
			description: null
		});
	}
});
