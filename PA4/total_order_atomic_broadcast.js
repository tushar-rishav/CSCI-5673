const express = require('express');
const log4js = require('log4js');
const bodyParser = require('body-parser');
const udp = require('dgram');
const EventEmitter = require('events');

const SERVER_ID = process.env.SERVER_ID || 0;

const app = express(); app.set('prod', process.env.prod);

var logger = log4js.getLogger();
logger.level = app.get('prod')==1 ? "info" : "debug";

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

const PEERS = require('./PEERS.json');
const ms = require('ms');
const e = require('express');

class Client extends EventEmitter {
	constructor(){
		super();
	}
	send(port, server, packet) {
		this.socket = udp.createSocket('udp4');
		this.socket.send(packet, 0, packet.length, port, server, err => {
			if(err) return console.error(err);

			this.socket.on('message', (data) => {
				logger.info(`Received response: ${data}`);
	
				this.socket.close();
			});
		});
	}
}

class Server extends EventEmitter {
	constructor() {
		super();
		this.socket = udp.createSocket('udp4');
		this.socket.on('message', this.receive.bind(this));
		this.id = process.env.SERVER_ID;

		this.pending_local_buffer = {}; // to store msgs per peer which has missing previous local_seq
		this.pending_global_buffer = {}; // to store msgs with global seq which has missing previous global_seq
		this.delivered_buffer = {};	// to store msgs which have been delivered
		
		this.send_local_buffer = {}; // buffer sent message by msg_id;
		this.send_global_buffer = {}; // buffer global message by global_seq;

		this.global_seq_to_msg_id = {}; // find message for given global seq
		
		for(var i = 0; i < PEERS.length; i++){
			this.pending_local_buffer[i] = {'local_seq': []}
		}

		this.local_seq = 0;
		this.last_global_seq = -1; // last delivered global seq
		this.curr_global_seq = -1; // most recent global seq seen

		return this;
	}

	get_msg_id(){
		return `${this.id}:${this.local_seq}`;
	}

	send(packet, port, host, cb){
		if(cb == undefined)
			cb = (err) => {logger.error(err)};
		
		this.socket.send(packet, 0, packet.length, port, host, cb);
	}

	check_if_global_seq_broadcast_required(msg){
		// if it is this node's turn to generate global sequence number
		if(!('global_seq' in msg) && this.if_my_global_seq()){
			let broadcast_msg = Buffer.from(JSON.stringify(msg));
			this.broadcast(broadcast_msg, true);
		}
	}

	receive(msg, rinfo){
		logger.info(`Received message: ${msg} from ${rinfo.address}:${rinfo.port}`);
		msg = JSON.parse(msg);
		
		if('missing' in msg){ // handle negative ack request
			if(msg.missing == 'global'){
				let packet = this.send_global_buffer[msg.global_seq];
				this.send(packet, rinfo.port, rinfo.host);
			} else if(msg.missing == 'local') {
				let packet = this.send_local_buffer[msg.msg_id];
				this.send(packet, rinfo.port, rinfo.host);
			}
		}
		else { // check if to deliver the message received
			this.deliver_or_buffer(msg);
			this.check_if_global_seq_broadcast_required(msg); // if it's this member's turn to generate global sequence
		}
	}

	deliver_or_buffer(msg){
		let _local_seq = msg.local_seq;
		let _msg_id = msg.msg_id;
		let _peer_id = msg.peer_id;

		if('global_seq' in msg){ // msg with global sequence number
			this.curr_global_seq = Math.max(this.curr_global_seq, msg.global_seq);
			this.global_seq_to_msg_id[msg.global_seq] = _msg_id;

			if( _msg_id in this.pending_local_buffer ) // if seen msg with local_seq before
			{
				if(msg.global_seq == this.last_global_seq+1){ // if most recent global_seq
					if(!(msg.msg_id in this.delivered_buffer)){ // handle duplicate msgs
						this.deliver(msg);
						setImmediate(this.check_for_pending_delivery, 0); // check for pending msg
					}
				} else if(msg.global_seq > this.last_global_seq+1){ // missing previous global
					// send negative ack and buffer
					this.send_negative_ack_global(this.last_global_seq+1, msg.global_seq-1); // send negative ack to all the messages
					this.pending_global_buffer[_msg_id] = msg;
				}
			} else { // missing previous local
				// send negative ack to peer_id and buffer
				this.pending_global_buffer[_msg_id] = msg;
				this.send_negative_ack_local(_peer_id, _msg_id);
			}
		} else { // handle local_seq broadcast msg
			if(_msg_id in this.pending_global_buffer) { // if seen corresponding global_seq before
				let _global_seq = this.pending_global_buffer[_msg_id].global_seq; 
				if(_global_seq == this.last_global_seq+1){
					if(!(msg.msg_id in this.delivered_buffer)){ // handle duplicate msgs
						this.deliver(msg);
						setImmediate(this.check_for_pending_delivery, 0); // check for pending msg
					}
				}  // no need to send -ve ack for missing global here as it's handled in global_seq `if` case
			} else { // not received global seq for this msg yet, add to buuffer
				this.pending_local_buffer[_msg_id] = msg;
			}
		}
	}

	send_negative_ack_global(start, end){
		for(var g = start; g <= end; g++){ // send req for each global seq peers
			let _peer_id = (g % PEERS.length);
			let req = {'missing': 'global', 'global_seq': g};
			let packet = Buffer.from(JSON.stringify(req));
			
			this.send(packet, PEERS[_peer_id].port, PEERS[_peer_id].host);
		}
	}

	send_negative_ack_local(peer_id, msg_id){
		var req = {'missing': 'local', 'msg_id': msg_id };
		var packet = Buffer.from(JSON.stringify(req));

		this.send(packet, PEERS[peer_id].port, PEERS[peer_id].host);
	}

	deliver(msg){
		
		logger.info(`Delivering msg_id: ${msg.msg_id} with global_seq: ${msg.global_seq}`);

		this.delivered_buffer[msg.msg_id] = msg;
		this.last_global_seq = msg.global_seq; // or just increment by one would be same?
		
		// remove message from pending buffers
		delete this.pending_local_buffer[msg.msg_id];
		delete this.pending_global_buffer[msg.msg_id];
	}

	check_for_pending_delivery(){ // FIXME
		// here we check if there are pending messages to deliver
		for(let g = this.last_global_seq; g <= this.curr_global_seq; g++){
			let msg = this.pending_global_buffer[ this.global_seq_to_msg_id[g] ];

			if( msg.msg_id in this.pending_local_buffer ) // if seen msg with local_seq before
			{
				if(g == this.last_global_seq+1 && !(msg.msg_id in this.delivered_buffer)){ // handle duplicate msgs
					this.deliver(msg);
				} else if(g > this.last_global_seq+1){ // missing previous global
					logger.info(`Preempting check_for_pending_delivery for g > last_global_seq+1 (${g} > ${this.last_global_seq+1})`)
					break; // can't attempt further delivery as some packets are still missing.
				}
			}
		}
	}

	if_my_global_seq(){
		return ((this.last_global_seq + 1)%PEERS.length == this.id);
	}

	listen(port, address){
		this.socket.bind(port, address);
		return this;
	}

	prepare_local_packet(msg) {
		msg.peer_id = this.id; // add member id
		msg.msg_id = this.get_msg_id();
		msg.local_seq = this.local_seq; // add local_seq
		this.local_seq += 1; // increment local_seq
	}

	prepare_global_packet(msg){
		this.last_global_seq += 1
		msg.coord_id = this.id;
		msg.global_seq = this.last_global_seq; // add global seq
	}

	broadcast(msg, prepare_global=false){ // msg: Type Buffer
		msg = JSON.parse(msg);
		
		if(prepare_global)
			this.prepare_global_packet(msg);
		else
			this.prepare_local_packet(msg);
		
		let msg_buff = Buffer.from(JSON.stringify(msg));

		// add to send buffer to later retrieve for negative acks
		if(prepare_global)
			this.send_global_buffer[msg.global_seq] = msg_buff;
		else
			this.send_local_buffer[msg.msg_id] = msg_buff;

		// broadcast to all peers
		PEERS.forEach((peer, i) => {
			logger.info(`Sent client request ${i}`);
			setTimeout(this.send.bind(this), 0, msg_buff, peer.port, peer.host);
		});
	}
	
}

// UDP server
const udp_server = new Server();
udp_server.listen(PEERS[udp_server.id].port, PEERS[udp_server.id].host);

function error(err, req, res, next) {
    //if (app.get('prod'))
    logger.error(err.stack);
	
    res.status(500);
    res.send('Internal Server Error');
}

// REST server
app.post('/consensus', (req, res) => {
	var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);

	res.json({'msg': 'All is well!'});
});

app.use(error);
app.listen(PEERS[udp_server.id].rest_port, PEERS[udp_server.id].host, () => {
	logger.info('Rest endpoint is up');
})