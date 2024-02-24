import { listen } from '@plasmohq/messaging/message';
import { logger } from '~shared/debug-logs';

listen(async (_req, res) => {
	logger.debug('background.messages.get-webpage-content', 'Fetching webpage content');

	const html = window.document.documentElement.innerHTML;
	const description = window.document
		.querySelector("meta[name='description']")
		?.getAttribute('content');

	logger.debug('background.messages.get-webpage-content', 'Fetched webpage content', {
		html,
		description
	});

	res.send({
		html,
		description
	});
});
