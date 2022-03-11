const Server = require('../index').Server;
const server = new Server();

server.handle((message, response) => {
	message.txTimestamp = Math.floor(Date.now() / 1000);
	console.log('Packet sent by server:', message);
	response(message);
});

server.listen(123, err => {
	if (err) throw err;

	console.log('Server listening on:', 123);
});

