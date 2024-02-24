import { validateGrimoireApiUrl } from '~shared/helpers/validate-grimoire-api-url';

export async function handleGrimoireApiCheck(grimoireApiUrl: string, $status: any) {
	const isGrimoireApiReachable = await validateGrimoireApiUrl(grimoireApiUrl);

	$status = {
		...$status,
		isGrimoireApiReachable
	};
}
