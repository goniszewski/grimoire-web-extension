import { sendToBackground } from '@plasmohq/messaging';
import { logger } from '~shared/utils/debug-logs';
import { showToast } from '~shared/utils/show-toast';

export async function handleSignIn(
	grimoireApiUrl: string,
	emailOrUsername: string,
	password: string
) {
	if (!emailOrUsername || !password) {
		showToast.error('Please enter your email/username and password');

		return null;
	}

	try {
		logger.debug('shared.handlers.handle-sign-in', 'Signing in', {
			grimoireApiUrl,
			emailOrUsername,
			password: `${password.slice(0, 2)}***${password.slice(-2)}`
		});

		const { token } = await sendToBackground<
			{
				emailOrUsername: string;
				password: string;
				grimoireApiUrl: string;
			},
			{
				token: string;
			}
		>({
			name: 'sign-in',
			body: {
				emailOrUsername,
				password,
				grimoireApiUrl
			}
		});

		if (!token) {
			showToast.error('Error signing in. Are your credentials correct? 🤔');

			return null;
		}

		showToast.success('Signed in successfully! 🎉');

		return token;
	} catch (error) {
		logger.error('shared.handlers.handle-sign-in', 'Error signing in', error?.message);

		showToast.error('Error signing in. Are your credentials correct?');

		return null;
	}
}
