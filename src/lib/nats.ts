import { connect } from 'nats.ws';

export async function connectNATSWS() {
	const nc = await connect({
		servers: 'demo.nats.io:4222'
	});
	return nc;
}
