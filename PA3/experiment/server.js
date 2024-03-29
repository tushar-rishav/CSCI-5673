const Server = require('../index').Server;
const server = new Server();

server.handle((message, response) => {
	message.txTimestamp = Date.now() / 1000;
	console.log('Packet sent by server:', message);
	response(message, (err, resp) => {
		if(err) console.error(err);
	});
});

server.listen(123, err => {
	if (err) throw err;

	console.log('Server listening on:', 123);
});

