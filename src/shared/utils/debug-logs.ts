// convert to fetch call
// curl -u cm9iZXJ0Z29uaXN6ZXdza2lAb3V0bG9vay5jb206OGgyWHBhY2U3aFNhM1lXWg== -k http://192.168.50.221:5080/api/default/default/_json -d '[{"level":"info","job":"test","log":"test message for openobserve"}]'

const sendRequestToLogger = (level: string, job: string, message: any) =>
	fetch(process.env.PLASMO_PUBLIC_LOGGER_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${process.env.PLASMO_PUBLIC_LOGGER_BASIC_AUTH}`
		},
		body: JSON.stringify({
			level,
			job,
			log: message
		})
	});

/**
 * Logger
 * @description
 * This is a simple logger that logs to the console and sends logs to external logger if the `PLASMO_PUBLIC_LOGGER_URL` environment variable is set.
 * @example
 * import { logger } from '~debug-logs';
 *
 * logger.info('job/scope', 'test message', { data: 'test', data2: 'test2'});
 *
 */
export const logger = {
	/**
	 *
	 * INFO message
	 * @param job Scope of this log. Example: function name, class name, etc.
	 * @param message Event message
	 * @param data Event data (optional)
	 */
	info: (job: string, message: string, data?: any) => {
		console.info(`[INFO] ${job} - ${message}${data ? `: ${JSON.stringify(data)}` : ''}`);

		if (process.env.PLASMO_PUBLIC_LOGGER_URL) {
			sendRequestToLogger('info', job, {
				message,
				data: JSON.stringify(data)
			});
		}
	},
	/**
	 *
	 * ERROR message
	 * @param job Scope of this log. Example: function name, class name, etc.
	 * @param message Event message
	 * @param data Event data (optional)
	 */
	error: (job: string, message: string, data?: any) => {
		console.error(`[ERROR] ${job} - ${message}${data ? `: ${JSON.stringify(data)}` : ''}`);

		if (process.env.PLASMO_PUBLIC_LOGGER_URL) {
			sendRequestToLogger('error', job, {
				message,
				data: JSON.stringify(data)
			});
		}
	},
	/**
	 *
	 * DEBUG message
	 * @param job Scope of this log. Example: function name, class name, etc.
	 * @param message Event message
	 * @param data Event data (optional)
	 */
	debug: (job: string, message: string, data?: any) => {
		console.debug(`[DEBUG] ${job} - ${message}${data ? `: ${JSON.stringify(data)}` : ''}`);

		if (process.env.PLASMO_PUBLIC_LOGGER_URL) {
			sendRequestToLogger('debug', job, {
				message,
				data: JSON.stringify(data)
			});
		}
	}
};
