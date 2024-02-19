import { type PlasmoMessaging } from '@plasmohq/messaging';

export {};

const handler: PlasmoMessaging.MessageHandler<{
    grimoireApiUrl: string;
}> = async (req, res) => {
	const {grimoireApiUrl} = {
        ...req.body
    }

    try {
        await fetch(`${grimoireApiUrl}/health`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        res.send({
            valid: true
        });
    } catch (error) {
        res.send({
            valid: false
        });
    }
};

export default handler;
