const fs = require('fs');
const udp = require('dgram');

const { NTPPacket, MODES } = require('./packet');

// seconds between NTP epoch 1900 - Unix epoch 1970
const NTP_DELTA = 2208988800;

class Measurement {
	constructor(
		fpath='measurement.json'
	){
		this.fpath = fpath;
		this.data = {};

		return this;
	}

	dumpToDisk() {
		fs.writeFile(this.fpath, JSON.stringify(this.data, null, 4), (err) => console.error);
	}

	record(data) {
		this.data[data.id] = data;
	}
}

class Client {
	constructor(
		server = 'pool.ntp.org',
		port = 123,
		options = { timeout: 3000 },
		burst_id = 0,
		msg_id = 0
	) {
		this.server = server;
		this.port = port;
		this.socket = udp.createSocket('udp4');
		this.options = options;
		this.burst_id = burst_id;
		this.msg_id = msg_id;

		return this;
	}

	createPacket() {
		const packet = new NTPPacket(MODES.CLIENT);
	
		packet.originateTimestamp = Date.now() / 1000;
		if(this.msg_id) // txTimestamp is 0 fir first messgae in burst
			packet.txTimestamp = Date.now() / 1000;
	
		//console.log('Created NTP packet', packet);
		return packet.bufferize(packet);
	}

	parse(buffer) {
		const message = NTPPacket.parse(buffer);
		//console.log('Received NTP packet from server: ', message);
		message.destinationTimestamp = (Date.now() / 1000) + NTP_DELTA;
		message.time = new Date(Math.floor((message.rxTimestamp - NTP_DELTA) * 1000));
	
		// Timestamp Name          ID   When Generated
		// ------------------------------------------------------------
		// Originate Timestamp     T1   time request sent by client
		// Receive Timestamp       T2   time request received by server
		// Transmit Timestamp      T3   time reply sent by server
		// Destination Timestamp   T4   time reply received by client
		const T1 = message.originateTimestamp;
		const T2 = message.rxTimestamp;
		const T3 = message.txTimestamp;
		const T4 = message.destinationTimestamp;
	
		// The roundtrip delay d and system clock offset t are defined as:
		// -
		// d = (T4 - T1) - (T3 - T2)     t = ((T2 - T1) + (T3 - T4)) / 2
		message.d = (T4 - T1) - (T3 - T2);
		message.t = (T2 - T1 + (T3 - T4)) / 2;
	
		return message;
	}

	async syncTime() {
		return new Promise((resolve, reject) => {
			this.socket = udp.createSocket('udp4');

			const {
				server,
				port,
				options: { timeout }
			} = this;

			const packet = this.createPacket();
			//console.log('Sending NTP packet: ', NTPPacket.parse(packet));

			this.socket.send(packet, 0, packet.length, port, server, err => {
				if (err) return reject(err);

				const timer = setTimeout(() => {
					const error = new Error(
						"NTP request timed out, server didn't answer"
					);

					return reject(error);
				}, timeout);

				this.socket.once('message', data => {
					clearTimeout(timer);

					const message = this.parse(data);

					this.socket.close();
					message.id = `${this.burst_id}:${this.msg_id}`;
					return resolve(message);
				});
			});
		});
	}
}

module.exports = {Client, Measurement};
