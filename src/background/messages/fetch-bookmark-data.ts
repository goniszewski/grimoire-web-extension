import { sendToContentScript, type PlasmoMessaging } from '@plasmohq/messaging';

export {};

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
	const content = {
        ...req.body
    }

	res.send({
		content
	});
};

export default handler;
