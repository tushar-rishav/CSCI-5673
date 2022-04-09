/* ---------------------------------------------------------------------------------------------
 Authors: Sai Akhil / Tushar Gautam
 Item:{Item Name(32), Item Category(0-9), Item Id(unique id), Keywords, Condition, Sale Price} 
 Keywords: up to five keywords, assigned by the seller, each keyword string up to 8 characters 
 Condition: New or Used, assigned by the seller 
 Sale price: decimal number, assigned by the seller 
 ---------------------------------------------------------------------------------------------
*/

const express = require('express');
const log4js = require('log4js');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const hash = require('pbkdf2-password')();
const session = require('express-session');
const bodyParser = require('body-parser');
const { response } = require('express');
const udp = require('dgram');
const EventEmitter = require('events');
const SERVER_ID = process.env.SERVER_ID || 0;

const messages = require('../../buyerService/proto/buyer_pb');
const services = require('../../buyerService/proto/buyer_grpc_pb');

const grpc = require('@grpc/grpc-js');
const protobuf = require("protobufjs");
const client = new services.BuyerSvcClient('localhost:50051', grpc.credentials.createInsecure());

const HOST = '0.0.0.0';
const PORT = 8888;

const app = express();
var soap = require('soap');
var url = 'http://localhost:8000/wsdl?wsdl';

app.set('prod', process.env.prod);

/* encode the JSON message into protobuf
async function encodeMessage(payload, messageName) {
  const root = await protobuf.load("buyer.proto");
  const testMessage = root.lookupType(messageName);
  const message = testMessage.create(payload);
  return testMessage.encode(message).finish();
}*/

/*
async function decodeMessage(buffer, messageName) {
  const root = await protobuf.load("buyer.proto");
  const testMessage = root.lookupType(messageName);
  const err = testMessage.verify(buffer);
  if (err) {
    throw err;
  }
  const message = testMessage.decode(buffer);
  return testMessage.toObject(message);
}*/

var logger = log4js.getLogger();
logger.level = app.get('prod')==1 ? "info" : "debug";

// Add headers before the routes are defined for CORS
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

const DB_URL = "mongodb://34.67.69.44:27017";
var DBO; // db object

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

MongoClient.connect(DB_URL, function(err, db) {
    if (err)
        throw err;
    console.log("Database created!");
    DBO = db.db('ecommerce');
    //db.close();
});

function db_get_user(username, callback) {
    var query = { "username": username } // username is a unique index
    var user = DBO.collection("user").find(query).toArray();
    user.then((result) => {
        logger.debug(JSON.stringify(result, null, 4));
        callback(null, result[0]);
    }).catch((err) => {callback(err)});
}

function error(err, req, res, next) {
    if (app.get('prod'))
        logger.error(err.stack);
  
    res.status(500);
    res.send('Internal Server Error');
  }

function restrict(req, res, next) {
    username = req.query.username ? req.query.username : req.body.username;
    if (app.locals[username]) {
        logger.info(`Request granted for user ${username}`);
        next();
    } else {
        logger.info(`Request denied!`);
        res.json({msg: 'Request denied'});
    }
  }

function authenticate(username, passwd, fn) {
    logger.debug(`Authenticating ${username}:${passwd}`);
    db_get_user(username, (db_err, user) => {
        if(db_err){
            logger.error(`Authentication DB failure for user: ${username} with error: ${db_err}`);
            fn(null, null);
        }
        if(user.username == username && user.passwd == passwd){
            return fn(null, user);
        } else {
            return fn(Error('Auth failed'));
        }
    });
}

// Sign-up
app.post('/account', (req, res) => { // params: {username, passwd}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);
    
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "buyer", mean_ratings: 0, num_ratings: 0, cart: []};
    logger.info(user_data.body);
    var name = req.body.username;
    var passwd = req.body.passwd;
    var type = "buyer";
    var grpc_response = "";

    // populate the grpc request as a proto file
    let user_request = new messages.userRequest();
    user_request.setUsername(name);
    user_request.setPassword(passwd);
    console.log("Printing the protobuf:"+user_request);
    
    // serialize the structure to binary data
    var binary_data = user_request.serializeBinary();
    console.log(binary_data);

    client.register(user_request, function(err, response) {
      grpc_response = response.getRes();
      console.log("Got response from GRPC server: "+grpc_response );  
      console.log(err);
      if(err){
        res.json({"msg":"Registration failed"});
      }
      else{
        res.json({"msg":"Registration success"});
      }
    }); 
});

// Login
app.post('/login', (req, res, next) => { // params: {username, passwd}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);

    logger.info(req.body);
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "buyer", mean_ratings: 0, num_ratings: 0, cart: []};
    var name = req.body.username;
    var passwd = req.body.passwd;
    var type = "buyer";
    var grpc_response = "";

    // populate the grpc request as a proto file
    let user_request = new messages.userRequest();
    user_request.setUsername(name);
    user_request.setPassword(passwd);
    console.log("Printing the protobuf:"+user_request);

    // serialize the structure to binary data
    var binary_data = user_request.serializeBinary();
    console.log(binary_data);

    client.login(user_request, function(err, response) {
        grpc_response = response.getRes();
        console.log("Got response from GRPC server: "+grpc_response );  
        if(err ){
            console.log(err);
            res.json({"msg":"Error login failed"});
        }
        else{
            app.locals[name] = name;
            res.json({"msg":"Successful login"});
        }      
    }); 
});

// Logout
app.post('/logout', (req, res) => {  // params: {username}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);
    
    delete app.locals[req.body.username];
    res.json({'auth': false, 'msg': 'Logout successful'});
});

// Search
app.post('/search', restrict, (req, res) => { // params: {username, category, keywords}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);
    
    logger.info(req.body);
    user_data = {username: req.body.username, category: req.body.data.category, keywords: req.body.data.keywords};
    
    // populate the grpc request as a proto file
    console.log(user_data.category+" : "+user_data.keywords);
    let search_request = new messages.searchItemsForSaleRequest();
    search_request.setCategory(user_data.category);
    search_request.setKeywordlistList(user_data.keywords);
    console.log("Printing the protobuf:"+search_request);

    // serialize the structure to binary data
    var binary_data = search_request.serializeBinary();
    console.log(binary_data);

    client.searchItemsForSale(search_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = response.getItemlistList();
        console.log("Got response from GRPC server: "+JSON.stringify(grpc_response));
        if(err){
            res.json({"msg":"Search Failed"});
        }
        else{
            res.json({"msg":"Search Success: "+grpc_response});
        }
    }); 
});

// Add item to cart
app.post('/add_item', restrict, (req, res) => { // param: {username, data: {item_id, qty}}: addItemsRequest
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);
    
    logger.info(req.body);
    user_data = {username: req.body.username, item_id: req.body.data.item_id, qty: req.body.data.qty};
    
    // populate the grpc request as a proto file
    console.log(user_data.username+" : "+user_data.item_id+" : "+user_data.qty);
    let add_items_request = new messages.addItemsRequest();
    add_items_request.setUsername(user_data.username);
    add_items_request.setId(user_data.item_id);
    add_items_request.setQty(user_data.qty);
    
    console.log("Printing the protobuf:"+add_items_request);

    // serialize the structure to binary data
    var binary_data = add_items_request.serializeBinary();
    console.log(binary_data);
    
    client.addItemsToCart(add_items_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        var grpc_response = response.getRes();
        console.log("Got response from GRPC server: "+grpc_response);
        if(err){
            res.json({"msg":"Adding Item Failed"});
        }
        else{
            res.json({"msg":"Adding Item Success: "+grpc_response});
        }
    }); 
});

// update cart
app.post('/remove_item', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);
    
    logger.info(req.body);
    user_data = {username: req.body.username, item_id: req.body.data.item_id, qty: req.body.data.qty};
    
    // populate the grpc request as a proto file
    console.log(user_data.username+" : "+user_data.item_id+" : "+user_data.qty);
    var rmv_items_request = new messages.rmvItemsRequest();
    rmv_items_request.setUsername(user_data.username);
    rmv_items_request.setId(user_data.item_id);
    rmv_items_request.setQty(user_data.qty);
    console.log(rmv_items_request);
    console.log("Printing the protobuf:");

    // serialize the structure to binary data
    var binary_data = rmv_items_request.serializeBinary();
    console.log(binary_data); 
    
    try{
        client.rmvItemsToCart(rmv_items_request, function(err, response) {
            logger.debug(response);
            logger.debug(err);
            //var grpc_response = response.getRes();
            console.log("Got response from GRPC server: "+response);
            if(err){
                res.json({"msg":"Removing Item Failed"});
            }
            else{
                res.json({"msg":"Removing Item Success: "+response});
            }
        });
    }
    catch(err){
        logger.info(err);
    }
    console.log("Exiting the call");
});

// display cart
app.get('/display_cart', restrict, (req, res, next) => { // param {username}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);
    
    logger.info(req.query);
    user_data = {username: req.query.username};

    // populate the grpc request as a proto file
    console.log(user_data.username);
    
    let display_cart_request = new messages.displayCartRequest();
    display_cart_request.setUsername(user_data.username);        
    console.log("Printing the protobuf:"+display_cart_request);

    // serialize the structure to binary data
    var binary_data = display_cart_request.serializeBinary();
    console.log(binary_data);
    
    var grpc_response="";
    client.displayCart(display_cart_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = JSON.stringify(response.array, null, 4);
        console.log("Got response from GRPC server: "+grpc_response);
        if(err){
            res.json({"msg":"Displaying cart Item Failed"});
        }
        else{
            res.json({"msg":"Displaying cart Item Success: "+grpc_response});
        }
    }); 
});

// clear cart
app.post('/clear_cart', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);

    logger.info(req.body);
    user_data = {username: req.body.username, item_id: req.body.data.item_id, qty: req.body.data.qty};
    
    // populate the grpc request as a proto file
    console.log(user_data.username+" : "+user_data.item_id+" : "+user_data.qty);
    let clear_cart_request = new messages.clearCartRequest();
    clear_cart_request.setUsername(user_data.username);
    
    console.log("Printing the protobuf:"+clear_cart_request);

    // serialize the structure to binary data
    var binary_data = clear_cart_request.serializeBinary();
    console.log(binary_data);
    var grpc_response = "";

    client.clearCart(clear_cart_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = response.getRes();
        console.log("Got response from GRPC server: "+grpc_response);
        if(err){
            res.json({"msg":"Clear Cart Failed"});
        }
        else{
            res.json({"msg":"Clear Item Success: "+grpc_response});
        }
    }); 
});

app.get('/ratings', (req, res) => { // param: {username, data: {item_id, qty}}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);

    // populate the grpc request as a proto file
    // console.log(user_data.username+" : "+user_data.item_id+" : "+user_data.qty);
    var seller_id = req.query.username;
    
    let seller_request = new messages.getSellerRatingRequest();
    seller_request.setUsername(seller_id);
    console.log("Printing the protobuf:"+seller_request);

    // serialize the structure to binary data
    var binary_data = seller_request.serializeBinary();
    console.log(binary_data);
    var grpc_response = "";

    client.getSellerRating(seller_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = response.getVal();
        console.log("Got response from GRPC server: "+grpc_response);
        if(err){
            res.json({"msg":"Ratings Failed"});
        }
        else{
            res.json({"msg":"Ratings Success: "+grpc_response});
        }
    }); 
});

app.get('/history', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);

    logger.info(req.body);
    var username = req.query.username;
    var query = { "username": username } // username is a unique index
    logger.debug(username, query);

    let buyer_history_request  = new messages.getBuyerHistoryRequest();
    buyer_history_request.setUsername(username);
    console.log("Printing the protobuf:"+buyer_history_request);

    client.getBuyerHistory(buyer_history_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        //grpc_response = response.getRes();
        console.log("Got response from GRPC server: "+response);
    }); 
});

app.post('/feedback', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);

    logger.info(req.body);

    var item_id = req.body.data.item_id;
    var feedback = req.body.data.feedback; // +1 or -1

    let feedback_request = new messages.provideFeedbackRequest();
    feedback_request.setItemid(item_id);
    feedback_request.setFb(feedback);

    user_data = {username: req.body.username, data: req.body.data};
    console.log(user_data);
    client.provideFeedback( feedback_request , function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = response.getRes();
        console.log("Got response from GRPC server: "+grpc_response);
    }); 
});

app.post('/purchase', restrict, (req, res) => {
    var packet = Buffer.from(JSON.stringify({'msg': `Hello from ${udp_server.id}`}));
	udp_server.broadcast(packet);

    var cardname = req.body.username;
    var cardnumber = req.body.cardnumber;
    var exp_date = req.body.exp_date;

    let make_purchase_request  = new messages.makePurchaseRequest();
    make_purchase_request.setUsername(cardname);
    make_purchase_request.setCardnumber(cardnumber);
    make_purchase_request.setCardexpirydate(exp_date);

    console.log("Printing the protobuf:"+make_purchase_request);

    client.makePurchase( make_purchase_request , function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = response.getRes();
        console.log("Got response from GRPC server: "+grpc_response);
    });

    // Create client
    soap.createClient(url, function (err, client) {
        if (err){
            throw err;
        }
        /*  
        * Parameters of the service call: they need to be called as specified
        * in the WSDL file
        */
        credit_card={"name" : cardname , "number" : cardnumber, "exp_date" : exp_date};
        var args = { 
        message: JSON.stringify(credit_card),
        splitter: ":" 
        };  
        // call the service
        client.MessageSplitter(args, function (err, res) {
        if (err)
        throw err;
        // print the service returned result
        console.log(res); 
        }); 
    });

    db_get_user(username, (err, user) => {
        if(err){
        logger.error(err);
        return res.send(500);
        }
        user.cart.push([ObjectId(req.body.data.item_id), req.body.data.qty || 0]);
        DBO.collection("user").updateOne({username: req.body.username}, {$set: {cart: user.cart}}, function(_err, _resp){
            if(_err) {
            logger.error(`Item purchased failed for item: ${req.body.username} ${_err}`);
            return res.sendStatus(500);
            }
            logger.debug(`Purchase done for item ${req.body.username}`);
            return res.json({"msg": "New item purchased"});
            });
        });
    logger.debug(`New item purchased`);
    });

app.use(error);
app.listen(PORT, HOST, () => {
    logger.info('Buyer Server is up');
});
