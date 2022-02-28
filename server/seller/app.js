/** 
 * Author: Sai Akhil / Tushar Gautam
 * API Implemented
 * 
 * 
 *  1. Create an account: sets up userusername and password 
    2. Login: provide userusername and password 
    3. Logout 
    4. Get seller rating 
    5. Put an item for sale: provide all item characteristics and quantity 
    6. Change the sale price of an item: provide item id and new sale price 
    7. Remove an item from sale: provide item id and quantity 
    8. Display items currently on sale put up by this seller
 */

const express = require('express');
const log4js = require('log4js');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const hash = require('pbkdf2-password')();
const session = require('express-session');
const bodyParser = require('body-parser');
const { response } = require('express');
const messages = require('../../sellerService/proto/seller_pb');
const services = require('../../sellerService/proto/seller_grpc_pb');
const grpc = require('@grpc/grpc-js');
const protobuf = require("protobufjs");
const client = new services.SellerSvcClient('localhost:50052', grpc.credentials.createInsecure());

const HOST = '0.0.0.0';
const PORT = 6969;

const app = express();

app.set('prod', process.env.prod);

/* encode the JSON message into protobuf
async function encodeMessage(payload, messageName) {
  const root = await protobuf.load("buyer.proto");
  const testMessage = root.lookupType(messageName);
  const message = testMessage.create(payload);
  return testMessage.encode(message).finish();
}

async function decodeMessage(buffer, messageName) {
  const root = await protobuf.load("buyer.proto");
  const testMessage = root.lookupType(messageName);
  const err = testMessage.verify(buffer);
  if (err) {
    throw err;
  }
  const message = testMessage.decode(buffer);
  return testMessage.toObject(message);
}
*/

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

const DB_URL = "mongodb://localhost:27017";
var DBO; // db object

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
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, items: []};
    logger.info(user_data.body);

    var name = req.body.username;
    var passwd = req.body.passwd;
    var type = "seller";
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
        res.json({"msg":"Seller Registration failed"});
      }
      else{
        res.json({"msg":"Seller Registration success"});
      }
    }); 
});

// Login
app.post('/login', (req, res, next) => { // params: {username, passwd}
    logger.info(req.body);
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};
    var name = req.body.username;
    var passwd = req.body.passwd;
    var type = "seller";
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
            res.json({"msg":"Seller Login failed"});
            console.log(err);
        }
        else{
            res.json({"msg":"Seller Login success"});
            app.locals[name] = name;
        }
    }); 
});

// Logout

app.post('/logout', (req, res) => {  // params: {username}
    delete app.locals[req.body.username];
    res.json({'auth': false, 'msg': 'Logout successful'});
});

// Ratings
app.get('/ratings', restrict, (req, res) => { // display seller rating
    logger.info(req.body);
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};
    res.json({"msg":"Not required to implement"});

    /* populate the grpc request as a proto file
    console.log(user_data.username+" : "+user_data.item_id+" : "+user_data.qty);
    
    let seller_request = new messages.userName();
    seller_request.setUsername(seller_id);
    console.log("Printing the protobuf:"+seller_request);

    // serialize the structure to binary data
    var binary_data = seller_request.serializeBinary();
    console.log(binary_data);
    var grpc_response = "";

    client.getSellerRating(seller_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = response.getRes();
        console.log("Got response from GRPC server: "+grpc_response);
        if(err){
            res.json({"msg":"Seller Rating failed"});
        }
        else{
            res.json({"msg":"Seller Rating success"+});
        }
    }); */
});

// Display Items
app.get('/display_item', restrict, (req, res, next) => { // param {username}
    logger.info(req.query);
    user_data = {username: req.query.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};
    
    // populate the grpc request as a proto file
    console.log(user_data.username);
    
    let display_item_request = new messages.displayItemsRequest();
    display_item_request.setUsername(user_data.username);        
    console.log("Printing the protobuf:"+display_item_request);

    // serialize the structure to binary data
    var binary_data = display_item_request.serializeBinary();
    console.log(binary_data);
    
    var grpc_response="";
    client.displayItems(display_item_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        grpc_response = JSON.stringify(response, null, 4);
        console.log("Got response from GRPC server: "+grpc_response);
    });
});

// Add Item 
app.post('/add_item', restrict, (req, res) => { // param: {username, data}
    logger.info(req.body);
    user_data = {username: req.body.username, item_id: req.body.data.item_id, qty: req.body.data.qty};
    
    // populate the grpc request as a proto file
    console.log(user_data.username+" : "+user_data.item_id+" : "+user_data.qty);
    let add_items_salerequest = new messages.putAnItemForSaleRequest();
    add_items_sale_request.setUsername(user_data.username);
    add_items_sale_request.setId(user_data.item_id);
    add_items_sale_request.setQty(user_data.qty);
    
    console.log("Printing the protobuf:"+add_items_sale_request);

    // serialize the structure to binary data
    var binary_data = add_items_sale_request.serializeBinary();
    console.log(binary_data);
    
    client.putAnItemForSale(add_items_sale_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        var grpc_response = response;
        console.log("Got response from GRPC server: "+grpc_response);
    }); 

    /*
    DBO.collection("item").insertOne(req.body.data, function(item_err, item_resp) {
        if(item_err){
            logger.error(`Error fetching user info for user ${req.body.username} error: ${item_err}`);
            return res.sendStatus(500);
        }
        // FIXME Add item ID to seller item id list
        db_get_user(username, (err, user) => {
            if(err){
                logger.error(err);
                return res.send(500);
            }
            user.items.push([item_resp.insertedId, req.body.data.qty]);
            DBO.collection("user").updateOne({username: req.body.username}, {$set: {items: user.items}}, function(_err, _resp){
                if(_err) {
                    logger.error(`Adding item failed for seller: ${req.body.username} ${_err}`);
                    return res.sendStatus(500);
                }
                logger.debug(`New item added for seller ${req.body.username}`);
                return res.json({"msg": "Item added successfully"});
            });
        });
        logger.debug(`Item inserted with item_id ${item_resp.insertedId}`);
    });
    */
});

// Change Price

app.post('/change_price', restrict, (req, res) => { // params: username, data: {item_id: <>, price: <>}
    logger.info(req.body);
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};
    client.login(encodeMessage(user_data, messages.changeItemsRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /* 
    var query = { "_id": ObjectId(req.body.data.item_id)};
    var values = { $set: {price: req.body.data.price} };

    DBO.collection("item").updateOne(query, values, function(item_err, item_res) {
        if (item_err){
            logger.error(`Item updated failed: ${item_err}`);
            return res.sendStatus(500);
        }

        logger.debug(`Item price updated by seller ${req.body.username}`);
        res.sendStatus(200);
    });
    */
});

// Remove Item

app.post('/remove_item', restrict, (req, res, next) => { // params: username, data: {item_id: <>, qty: <> }
    logger.info(req.body);
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};
    client.login(encodeMessage(user_data, messages.rmvItemsRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*
    var query = { "_id": ObjectId(req.body.data.item_id) };
    var cursor = DBO.collection('item').find(query);
    cursor.forEach(doc => {
        let qty = req.body.data.qty;
        if(qty == 0){
            DBO.collection("item").deleteOne(query, function(item_err, item_resp){ // delete item from item collection
                if(item_err) {
                    logger.error(`Remove item failed ${item_err}`);
                    return res.sendStatus(500);
                }

                db_get_user(req.body.username, (user_err, user) => {    // delete item_id from corresponding seller
                    if(user_err){
                        logger.error(`Error reading user info ${user_err}`);
                        return res.sendStatus(500);
                    }

                    user_items = user.items.filter(id => id[0] !== ObjectId(req.body.data.item_id));
                    DBO.collection("user").updateOne({username: req.body.username}, {$set: {items: user_items}}, function(_err, _resp){
                        if(_err) {
                            logger.error(`Remove item failed for seller: ${req.body.username} ${_err}`);
                            return res.sendStatus(500);
                        }
                        logger.debug(`No left over quantity. Item deleted for seller ${req.body.username}`);
                        return res.json({"msg": "Item removed successfully"});
                    });
                });
            });            
        }
        else {
            let value = {$set: {qty: qty}}; 
            DBO.collection("item").updateOne(query, value, function(item_err, item_res){
                if(item_err) {
                    logger.error(`Remove item failed for seller: ${req.body.username} ${item_err}`);
                    return res.sendStatus(500);
                }
                
                logger.debug(`Item quantity reduced by seller: ${req.body.username}`);
                return res.json({"msg": "Item quantity reduced by seller"});
            });
        }
    });
    */
});

app.use(error);
app.listen(PORT, HOST, () => {
    logger.info('Seller Server is up');
});


