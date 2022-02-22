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

// encode the JSON message into protobuf
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
        res.status(404).send('Not implemented yet');
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
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "buyer", mean_ratings: 0, num_ratings: 0, cart: []};
    logger.info(user_data.body);
    client.register(encodeMessage(user_data, messages.userRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
/* 
    DBO.collection("user").insertOne(user_data, function(db_err, db_resp) {
        if (db_err) {
            return res.json({'reg': false, 'msg': `Registration failed with error: ${db_err}`});
        }
        logger.debug(`User inserted with user_id ${db_resp.insertedId}`);
        res.json({'reg': true, 'msg': `Registration successful for ${req.body.username}`});
    });*/
});

// Login

app.post('/login', (req, res, next) => { // params: {username, passwd}
    logger.info(req.body);
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "buyer", mean_ratings: 0, num_ratings: 0, cart: []};
    client.login(encodeMessage(user_data, messages.userRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*authenticate(req.body.username, req.body.passwd, (err, user) => {
        if (err){
            err_msg = `Auth failed for user ${req.body.username}`;
            logger.error(`${err_msg}`);
            res.json({'auth': false, 'msg': 'Auth failed'});
        }
        else if(user) {
            logger.info(`Auth successful for user ${req.body.username}`);
            app.locals[req.body.username] = user;
            res.json({'auth': true, 'msg': 'Auth successful'});
        }
        next();
    });*/
});

// Logout

app.post('/logout', (req, res) => {  // params: {username}
    delete app.locals[req.body.username];
    res.json({'auth': false, 'msg': 'Logout successful'});
});

// Search

app.post('/search', restrict, (req, res) => { // params: {username, category, keywords}
    logger.info(req.body);
    user_data = {username: req.body.username, category: req.body.category, keywords: keywords};
    client.login(encodeMessage(user_data, messages.searchItemsForSaleRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    
    /* var keywords = req.body.data.keywords;
    var itemCategory = req.body.data.category;

    logger.debug(`Searching for items with keywords ${keywords} and category: ${itemCategory}`);
    var query = { "category" : itemCategory, "keywords" : { "$in": keywords }};
    const options = { sort : { name:1 }, projection:{_id:0} }
    var cursor = DBO.collection("item").find(query, options).toArray();
    cursor.then((result) => {
        logger.debug(result);
        res.json(result);
    }).catch((err) => {
        logger.info(`Search failed for items with keywords ${keywords} and category: ${itemCategory}`);
    });*/
});

// Add item to cart

app.post('/add_item', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    logger.info(req.body);
    user_data = {username: req.body.username, data: req.body.data};
    client.login(encodeMessage(user_data, messages.addItemsRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*var username = req.body.username;
    db_get_user(username, (err, user) => {
            if(err){
                logger.error(err);
                return res.send(500);
            }
            user.cart.push([ObjectId(req.body.data.item_id), req.body.data.qty || 0]);
            DBO.collection("user").updateOne({username: req.body.username}, {$set: {cart: user.cart}}, function(_err, _resp){
                if(_err) {
                    logger.error(`Adding item failed for buyer: ${req.body.username} ${_err}`);
                    return res.sendStatus(500);
                }
                logger.debug(`New item added for buyer ${req.body.username}`);
                return res.json({"msg": "New item added to the cart"});
            });
    });
    logger.debug(`Item added to cart`);*/
});

// display cart

app.get('/display_cart', restrict, (req, res, next) => { // param {username}
    logger.info(req.body);
    user_data = {username: req.body.username};
    client.login(encodeMessage(user_data, messages.displayCartRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*
      db_get_user(req.query.username, (user_err, user_resp) => {
        if(user_err){
            logger.error(`Error fetching user info for user ${req.query.username} error: ${user_err}`);
            return res.sendStatus(500);
        }

        item_ids = user_resp.cart.map(item_tuple => item_tuple[0]); // choose item id only
        logger.debug(`Found item_ids in cart: ${item_ids}`);
        var query = {"_id": { "$in": item_ids } }
        var docs = DBO.collection("item").find(query, {projection: {_id: 0}}).toArray();
        docs.then((result) => {
            logger.debug(JSON.stringify(result, null, 4));
            res.json({"info" : result, "cart": user_resp.cart});
        }).catch((item_err) => {
            logger.error(`Error fetching items: ${item_err}`);
            res.sendStatus(500);
        });
    });*/
});

// clear cart

app.post('/clear_cart', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    logger.info(req.body);
    user_data = {username: req.body.username, data: req.body.data};
    client.login(encodeMessage(user_data, messages.clearCartRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*
    var username = req.body.username;
    db_get_user(username, (err, user) => {
        if(err){
            logger.error(err);
            return res.send(500);
        }
        user.cart = []
        DBO.collection("user").updateOne({username: req.body.username}, {$set: {cart: user.cart}}, function(_err, _resp){
            if(_err) {
                logger.error(`Clearing cart failed for buyer: ${req.body.username} ${_err}`);
                return res.sendStatus(500);
            }
            logger.debug(`Cart cleared for buyer ${req.body.username}`);
            return res.json({"msg": "Cart cleared"});
        });
    });
    logger.debug(`Cart cleared`);
    */
});

// update cart

app.post('/remove_item', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    logger.info(req.body);
    user_data = {username: req.body.username, data: req.body.data};
    client.login(encodeMessage(user_data, messages.rmvItemsRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*
    var username = req.body.username;
    var qty = req.body.data.qty;

    db_get_user(username, (err, user) => {
        if(err){
            logger.error(err);
            return res.send(500);
        }

        user.cart = user.cart.map(id => id[0] === ObjectId(req.body.data.item_id) ? [id[0], qty] : id);
        user.cart = user.cart.filter(id => id[1] != 0);

        DBO.collection("user").updateOne({username: req.body.username}, {$set: {cart: user.cart}}, function(_err, _resp){
            if(_err) {
                logger.error(`Removing cart item failed for buyer: ${req.body.username} ${_err}`);
                return res.sendStatus(500);
            }
            logger.debug(`Cart item removed for buyer ${req.body.username}`);
            return res.json({"msg": "Cart item removed"});
        });
    });
    logger.debug(`Item removed from cart`);
    */
});

app.get('/ratings', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    logger.info(req.body);
    user_data = {username: req.body.username, data: req.body.data};
    client.login(encodeMessage(user_data, messages.getSellerRatingRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*
    var username = req.body.username;
    var qty = req.body.data.qty;

    db_get_user(username, (err, user) => {
        if(err){
            logger.error(err);
            return res.send(500);
        }

        user.rating.push(req.body.data.rating || 10);
        DBO.collection("user").updateOne({username: req.body.username}, {$set: {rating: user.rating}}, function(_err, _resp){
            if(_err) {
                logger.error(`Update ratings failed for buyer: ${req.body.username} ${_err}`);
                return res.sendStatus(500);
            }
            logger.debug(`Rating updated for buyer ${req.body.username}`);
            return res.json({"msg": "Rating updated"});
        });
    });
    logger.debug(`Rating added`);
    */
});

app.get('/history', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    logger.info(req.body);
    user_data = {username: req.body.username, data: req.body.data};
    client.login(encodeMessage(user_data, messages.getBuyerHistoryRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*
    var username = req.body.username;

    var query = { "username": username } // username is a unique index
    var history = DBO.collection("history").find(query).toArray();
    history.then((result) => {
        logger.debug(JSON.stringify(result, null, 4));
        return res.json(result);
    }).catch((err) => {
        res.json({"msg": `Fetching history failed with error: ${err}`});
    });*/
});

app.post('/feedback', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    logger.info(req.body);
    user_data = {username: req.body.username, data: req.body.data};
    client.login(encodeMessage(user_data, messages.provideFeedbackRequest) , function(err, response) {
      console.log("called: " );  
      console.log(response);
    }); 
    /*
    var username = req.body.username;
    db_get_user(username, (err, user) => {
            if(err){
                logger.error(err);
                return res.send(500);
            }
            user.feedback.push(req.body.data.feedback || 10);
            DBO.collection("item").updateOne({username: req.body.username}, {$set: {feedback: user.feedback}}, function(_err, _resp){
                if(_err) {
                    logger.error(`Adding feedback failed for item: ${req.body.username} ${_err}`);
                    return res.sendStatus(500);
                }
                logger.debug(`New feedback added for item ${req.body.username}`);
                return res.json({"msg": "New feedback added to the item"});
            });
    });
    logger.debug(`Feedback added`);*/
});

app.post('/purchase', restrict, (req, res) => {
    var cardname = req.body.username;
    var cardnumber = req.body.cardnumber;
    var exp_date = req.body.exp_date;

    // Create client
  soap.createClient(url, function (err, client) {
    if (err){
      throw err;
    }
    /*  
    * Parameters of the service call: they need to be called as specified
    * in the WSDL file
    */
    credit_card={"name" : cardname , "number" : cardnumebr, "exp_date" : exp_date};
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
