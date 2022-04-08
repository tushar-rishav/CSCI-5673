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

    client.authenticate(user_request, function(err, response) {
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
    console.log("Logout Successful at Server front-end" );  
});

// Ratings
app.get('/ratings', restrict, (req, res) => { // display seller rating
    user_data = {username: req.query.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};

    let user_name = new messages.rating_request();
    user_name.setUsername(user_data.username);
    console.log(user_name);

    client.getSellerRating(user_name, function(err, response) {
        var grpc_response = response.getVal();
        console.log("Got response from GRPC server: "+grpc_response);
        if(err ){
            res.json({"msg":`Ratings retrieval for seller failed:${user_data.username} ${grpc_response}`});
            console.log(err);
        }
        else{
            res.json({"msg":`Ratings retrieval Success: ${user_data.username} ${grpc_response}`});
            console.log(`Ratings retrieval Success: ${user_data.username} ${grpc_response}`);
        }
    }); 
});

// Display Items
app.get('/display_item', restrict, (req, res, next) => { // param {username}
    logger.info(req.query);
    user_data = {username: req.query.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, item: []};
    
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

        // populate the items list
        var itemsList = response.getItemslistList();
        
        // @tushar check with him 
        dataList = [];
        itemsList.forEach( function(item, index){
            var data={ "name": item.getName(), "category": item.getCatergory(), "keywords": item.getKeywordlistList(),"condition": item.getCondition(), "price": item.getPrice(), "qty": item.getQty(), "mean_feedback": item.getMeanfeedback(), "num_feedback": item.getFeedbackcount() };
            dataList.push(data);
        });
        
        if(err ){
            res.json({"msg":"Display Items for sale by this seller failed"});
            console.log(err);
        }
        else{
            var dataListStr= JSON.stringify(dataList,null,4);
            res.json({"msg":dataListStr});
            console.log("Display Items for sale by this seller Success:"+dataListStr);
        }
    });
});

// Add Item 
app.post('/add_item', restrict, (req, res) => { // param: {username, data}
    logger.info(req.body);
    user_data = {username: req.body.username, item_id: req.body.data.item_id, qty: req.body.data.qty};

    // populate the item value based on req.body.data
    var data_req = req.body.data;
    console.log(data_req);
    
    let item = new messages.Item();
    item.setName(data_req.name);
    item.setCatergory(data_req.category);
    item.setCondition(data_req.condition);
    item.setPrice(data_req.price);
    item.setQty(data_req.qty);
    
    console.log(data_req.mean_feedback);
    item.setMeanfeedback(data_req.mean_feedback);
    console.log(data_req.num_feedback);
    item.setFeedbackcount(data_req.num_feedback);
    
    // loop through the string array
    data_req.keywords.forEach(function(elem, index) {
        item.addKeywordlist(elem);
        console.log("Adding element: "+elem);
    });
    
    // populate the grpc request as a proto file
    console.log(user_data.username+" : "+user_data.item_id+" : "+user_data.qty);
    let add_items_sale_request = new messages.putAnItemForSaleRequest();
    add_items_sale_request.setUsername(user_data.username);
    add_items_sale_request.setItemId(user_data.item_id);
    add_items_sale_request.setItem(item);
    
    console.log("Printing the protobuf:"+add_items_sale_request);

    // serialize the structure to binary data
    var binary_data = add_items_sale_request.serializeBinary();
    console.log(binary_data);
    
    client.putAnItemForSale(add_items_sale_request, function(err, response) {
        logger.debug(response);
        logger.debug(err);
        var grpc_response = response;
        console.log("Got response from GRPC server: "+grpc_response);
        if(err ){
            res.json({"msg":"Adding Item for Sale failed"});
            console.log(err);
        }
        else{
            res.json({"msg":"Adding Item for Sale Success"});
            console.log("Adding Item for Sale Success");
        }
    }); 
});

// Change Price
app.post('/change_price', restrict, (req, res) => { // params: username, data: {item_id: <>, price: <>}
    logger.info(req.body);

    let change_price_request = new messages.changeSalePriceRequest();
    change_price_request.setItemid(req.body.data.item_id);
    change_price_request.setPrice(req.body.data.price);
    
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};
    client.changeSalePrice(change_price_request, function(err, response) {
        var grpc_response = response;
        console.log("Got response from GRPC server: "+grpc_response);
        if(err ){
            res.json({"msg":"Change Item for Sale failed"});
            console.log(err);
        }
        else{
            res.json({"msg":"Change Item for Sale Success"});
            console.log("Change Item for Sale Success");
        }
    }); 
});

// Remove Item 
app.post('/remove_item', restrict, (req, res, next) => { // params: username, data: {item_id: <>, qty: <> }
    logger.info(req.body);

    let rmv_item_request = new messages.rmvAnItemRequest();
    rmv_item_request.setUsername(req.body.username);
    rmv_item_request.setItemid(req.body.data.item_id);
    rmv_item_request.setQty(req.body.data.qty);

    user_data = {username: req.body.username, passwd: req.body.passwd, type: "seller", mean_ratings: 0, num_ratings: 0, cart: []};
    client.rmvAnItem(rmv_item_request , function(err, response) {
        var grpc_response = response;
        console.log("Got response from GRPC server: "+grpc_response);
        if(err ){
            res.json({"msg":"Removed Item Quantity failed"});
            console.log(err);
        }
        else{
            res.json({"msg":"Removed Item Quantity  Success"});
            console.log("Removed Item Quantity Success");
        }
    }); 
});

app.use(error);
app.listen(PORT, HOST, () => {
    logger.info('Seller Server is up');
});


