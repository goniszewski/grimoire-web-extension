import { sendToBackground } from '@plasmohq/messaging';

export async function handleSignIn(
	grimoireApiUrl: string,
	emailOrUsername: string,
	password: string
) {
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
			emailOrUsername: emailOrUsername,
			password: password,
			grimoireApiUrl
		}
	});

	return token;
}
