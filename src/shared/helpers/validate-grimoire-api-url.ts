import { sendToBackground } from '@plasmohq/messaging';

export async function validateGrimoireApiUrl(url: string) {
	const healthCheck = await sendToBackground<
		{
			grimoireApiUrl: string;
		},
		{
			valid: boolean;
		}
	>({
		name: 'validate-grimoire-api-url',
		body: {
			grimoireApiUrl: url
		}
	});

	return healthCheck.valid;
}
