require('dotenv').config();
const log4js = require('log4js');

const grpc = require('@grpc/grpc-js');
const protobuf = require('protobufjs');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const hash = require('pbkdf2-password')();

const messages = require('../../buyerService/proto/buyer_pb');
const services = require('../../buyerService/proto/buyer_grpc_pb');
const res = require('express/lib/response');
//const protoFile = require('../../protos/buyer/buyer.proto');
//const buyerItemList = protoFile.lookupType('buyer.itemList');

var logger = log4js.getLogger();
logger.level = "debug";

var DBO;

function db_get_user(name, callback) {
    var query = {"username": name} // name is unique index
    var user = DBO.collection("user").find(query).toArray();
    user.then((result) => {
        logger.debug("db_get_user"+JSON.stringify(result, null, 4));
        callback(null, result[0]);
    }).catch((err) => {callback(err)});
}

function error(err, req, res, next) {
    if (app.get('prod'))
        logger.error(err.stack);
  
    res.status(500);
    res.send('Internal Server Error');
}

function authenticate(name, passwd, fn) {
    logger.debug(`Authenticating ${name}:${passwd}`);
    db_get_user(name, (db_err, user) => {
        if(db_err){
            logger.error(`Authentication DB failure for user: ${name} with error: ${db_err}`);
            fn(null, null);
        }
        else{
            if(user.username == name && user.passwd == passwd){
                console.log(user.username+" : "+name);
                console.log(user.passwd+" : "+passwd);
                return fn(null, user);
            } else {
                return fn(Error('Auth failed'));
            }
        }
    }); 
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

module.exports = class API {
  constructor(db, grpc) {
    this.db = db;
    DBO=this.db;
    this.grpc = grpc;
  }

  // registers the user and add an entry into the "user" database
  // receives the binary data from server front end
  register = (call, callback) => {
    console.log("Received a GRPC request for Register API");
    const users = this.db.collection("user");

    var user_request = call.request;
    console.log(user_request);

    let user_data = {username: user_request.getUsername(), passwd: user_request.getPassword(), type:"buyer", ratings: [], cart:[]};
    var out = "";
    console.log(user_data);
    users.insertOne(user_data, function(db_err, db_resp) {
        let resp = new messages.registerResponse();
        if (db_err) {
            out = res.json({'reg': false, 'msg': `Registration failed with error: ${db_err}`});
            resp.setRes(JSON.stringify(out));
            callback(null, resp);
        }
        out = {'reg': true, 'msg': `Registration successful for ${user_data.username}`};
        resp.setRes(JSON.stringify(out));
        console.log(resp);
        callback(null, resp);
    });
  }

  // authenticates and logs the user in
  login = (call, callback) => {
    console.log("Received a GRPC request for Login API");
    const users = this.db.collection("user");
    var user_request = call.request;
    console.log(user_request);

    let user_data = {username: user_request.getUsername(), passwd: user_request.getPassword(), type:"buyer", ratings: [], cart: []};
    console.log(user_data);
    authenticate(user_data.username, user_data.passwd, (err, user) => {
        let resp = new messages.loginResponse();
        if(user) {
            logger.info(`Auth successful for user ${user_data.username}`);
            var out = {'reg': true, 'msg': `Login successful for ${user_data.username}`};
            resp.setRes(JSON.stringify(out));
            callback(null, resp);
        }
        else if (err){
            var err_msg = {'reg': false, 'msg': `Login failed with error: ${err}`};
            logger.error(`${err_msg}`);
            resp.setRes(JSON.stringify(err_msg));
            callback(null, resp);
        }
    });
  }
 
  // searches the "items" database  
  searchItemsForSale = (call, callback) => {  
    console.log("Received a GRPC request for Login API");
    var search_request = call.request;
    console.log(search_request);
    
    var keywords = search_request.getKeywordlistList();
    var itemCategory = search_request.getCategory();
    logger.debug(`Searching for items with keywords ${keywords} and category: ${itemCategory}`);

    var query = { "category" : itemCategory, "keywords" : { "$in": keywords }}; 
    const options = { sort : { username:1 }, projection:{_id:0} }
    var cursor = DBO.collection("item").find(query, options).toArray();
    let search_response = new messages.searchItemsForSaleResponse();
    cursor.then((result) => {
        logger.debug(result);
        
        //search_response.setItemlistList(result);
        result.forEach(function(item, index) {
            var item_protobuf = new messages.Item();
            item_protobuf.setName(item["name"]);
            item_protobuf.setCatergory(item["category"]);
            
            // set the keyword list
            item_protobuf.setKeywordlistList(item["keywords"]);            
            item_protobuf.setCondition(item["condition"]);
            item_protobuf.setPrice(parseInt(item["price"]));
            item_protobuf.setQty(item["qty"]);
            
            search_response.addItemlist(item_protobuf);
            logger.debug(item_protobuf);
        });

        logger.debug(search_response);
        
        // serialize the structure to binary data
        var binary_data = search_response.serializeBinary();
        console.log(binary_data);

        callback(null, search_response);
    }).catch((err) => {
        logger.info((err));
        logger.info(`Search failed for items with keywords ${keywords} and category: ${itemCategory}`);
        callback(err, search_response);
    });  
  }
  
  // adds items to the cart and interacts with the "users" database  
  addItemsToCart = (call, callback) => {
    console.log("Received a GRPC request for Add Items to Cart API");
    var add_items_request = call.request;
    console.log(add_items_request);

    const users = this.db.collection("user");
    var username = add_items_request.getUsername();
    var item_id = add_items_request.getId();
    var qty = add_items_request.getQty();

    db_get_user(username, (err, user) => {
        let resp = new messages.addItemsResponse();
        if (err){
            var err_msg = `Failed adding item to cart for ${username}`;
            logger.error(`${err_msg}`);
            logger.error(err);
            resp.setRes("Failed adding item to cart for "+username);
            callback(err, resp);
        }
        else if(user) {
            user.cart.push([ObjectId(item_id), qty || 0]);
            DBO.collection("user").updateOne({username: username}, {$set: {cart: user.cart}}, function(_err, _resp){
                if(_err) {
                    logger.error(`Adding item failed for buyer: ${username} ${_err}`);
                    resp.setRes("Failed adding item to cart for "+username);
                    callback(_err, resp);
                }
                logger.debug(`New item added for buyer ${username}`);
                return resp.setRes("New item added to the cart");
            });
            logger.info(`Added item for user ${username}`);
            resp.setRes("Successfully added item to cart for "+username);
            callback(null, resp);
        }
    });
    logger.debug(`Item added to cart`);    
  }

  // removes the cart and interacts with the "user" database
  rmvItemsToCart = (call, callback) => {
    logger.info(call.request);
    logger.info("Received a GRPC request for Remove Items From Cart API");
    var rmv_items_request = call.request;
    console.log(rmv_items_request);

    const users = this.db.collection("user");
    var username = rmv_items_request.getUsername();
    var item_id = rmv_items_request.getId();
    var qty = rmv_items_request.getQty();

    let resp = new messages.rmvItemsResponse();
    console.log("Remove Items: "+rmv_items_request);

    db_get_user(username, (err, user) => {
        if (err){
            var err_msg = `Failed removing item from cart for ${username}`;
            logger.error(`${err_msg}`);
            logger.error(err);
            resp.setRes("Failed removing item from cart for "+username);
            callback(err, resp);
        }
        else if(user) {
            console.log("Before");
            console.log(user.cart);
            var new_cart=[];

            // @Sai Akhil: using new one
            user.cart.forEach(function(value, key){
                //new_cart.push();
                console.log(item_id+ " :: " +value[0]);
                if(value[0] == item_id){
                    value[1] = qty;
                    console.log(value[1]+" :in: "+qty);
                }
            });

            // @Tushar: commenting your approach
            //user.cart = user.cart.map(id => {if(id[0]==ObjectId(item_id)){id = [ObjectId(item_id), qty];console.log(id);}});
            console.log("After");
            console.log(user.cart);
            user.cart = user.cart.filter(id => id[1] != 0);
            
            DBO.collection("user").updateOne({username: username}, {$set: {cart: user.cart}}, function(_err, _resp){
                if(_err) {
                    logger.error(`Removing cart item failed for buyer: ${username} ${_err}`);
                    resp.setRes("Failed to remove item from cart for "+username);
                    callback(_err, resp);
                }
                logger.debug(`Cart item removed for buyer ${username}`);
                resp.setRes({"msg": "Cart item removed"})
                callback(null, resp);
            });
            callback(null, resp);
        }
    });
    logger.debug(`Item removed from cart`);
  }

  // clears the cart and interacts with the "user" database
  clearCart = (call, callback) => {
    console.log("Received a GRPC request for clearing Cart API");
    var clear_cart_request = call.request;
    console.log(clear_cart_request);

    const users = this.db.collection("user");
    var username = clear_cart_request.getUsername();
    var resp = new messages.clearCartResponse();

    console.log("Called Clear Cart API");
    db_get_user(username, (err, user) => {
        if(err){
            var err_msg = `Failed clearing cart for ${username}`;
            logger.error(`${err_msg}`);
            logger.error(err);
            resp.setRes(err_msg);
            callback(err, resp);
        }

        user.cart = [];
        DBO.collection("user").updateOne({username: username}, {$set: {cart: user.cart}}, function(_err, _resp){
            if(_err) {
                logger.error(`Clearing cart failed for buyer: ${username} ${_err}`);
                callback(null, resp);
            }
            var out = `Cart cleared for buyer ${username}`;
            logger.debug(out);
            resp.setRes(out);
            callback(null, resp);
        });
    });
    logger.debug(`Cart cleared`);
  }

  // displays the cart and interacts with the "user" database
  displayCart = (call, callback) => {
    logger.info("Called Display Cart API");
    var display_cart_request = call.request;
    console.log(display_cart_request);

    const users = this.db.collection("user");
    var username = display_cart_request.getUsername();
    let resp = new messages.displayCartResponse();

    db_get_user(username, (user_err, user_resp) => {
        if(user_err){
            var err_msg = `Failed to display cart for ${username}`;
            logger.error(`${err_msg}`);
            logger.error(user_err);
            //resp.setRes(err_msg);
            callback(err, resp);
        }

        var item_ids = user_resp.cart.map(item_tuple => item_tuple[0]); // choose item id only
        logger.debug(`Found item_ids in cart: ${item_ids}`);
        var query = {"_id": { "$in": item_ids } }
        var docs = DBO.collection("item").find(query, {projection: {_id: 0}}).toArray();
        docs.then((result) => {
            logger.debug(JSON.stringify(result, null, 4));

            //search_response.setItemlistList(result);
            result.forEach(function(item, index) {
            var item_protobuf = new messages.Item();
            item_protobuf.setName(item["name"]);
            item_protobuf.setCatergory(item["category"]);
            
            // set the keyword list
            item_protobuf.setKeywordlistList(item["keywords"]);            
            item_protobuf.setCondition(item["condition"]);
            item_protobuf.setPrice(parseInt(item["price"]));
            item_protobuf.setQty(item["qty"]);
            
            resp.addItemlist(item_protobuf);
            logger.debug(item_protobuf);
        });
        logger.debug(resp);
            
        //res.setRes({"info" : result, "cart": user_resp.cart});
        callback(null, resp);
        }).catch((item_err) => {
            logger.error(`Error fetching items: ${item_err}`);
            callback(item_err, res);
        });
    });
  }

  // provides feedback and interacts with the "items" database
  provideFeedback = (call, callback) => {
    logger.info("Called provide Feedback API");
    var feedback_request = call.request;
    var item_id = feedback_request.getItemid(); 
    var feedback = feedback_request.getFb();

    let response = new messages.provideFeedbackResponse();

    var cursor = DBO.collection("item").find({"_id": ObjectId(item_id)}).toArray();
    cursor.then((_resp) => {
        var mean_feedback = _resp[0].mean_feedback || 0;
        var num_feedback = _resp[0].num_feedback || 0;
        var new_feedback = (mean_feedback*num_feedback) + feedback;

        logger.debug(mean_feedback, num_feedback, new_feedback, feedback);
        var update = { mean_feedback: new_feedback/(num_feedback+1), num_feedback: num_feedback+1 };
        logger.debug(update);

        DBO.collection("item").updateOne({"_id": ObjectId(item_id)}, {$set: update}, function(err, resp){
            if(err) {
                logger.error(`Add item feedback failed by buyer ${err}`);
                response.setRes("500");
                callback(null, response);
            }
            logger.debug(`New feedback added for user `);
            var out_msg = "New feedback added to the item";
            response.setRes(out_msg);
            callback(null, response);
        });
    }).catch(_err => {
        if(_err) {
            logger.error(`Adding feedback failed by buyer: ${_err}`);
            response.setRes("Adding feedback failed by buyer");
            callback(null, response);
        }
    });
    logger.debug(`Feedback added`);

  }  
  
  makePurchase = (call, callback) => {
    logger.info("Called Purchase API");
    var purchase_request = call.request;
    var user_name = purchase_request.getUsername();
    var card_number =  purchase_request.getCardnumber();
    var exp_date = purchase_request.getCardexpirydate();
    
    var data = {cardnumber:card_number, expdate:exp_date };
    let response = new messages.makePurchaseResponse();
    DBO.collection("history").insertOne({username: user_name, data: data}, function(db_err, db_resp) {
        if (db_err) {
            logger.error(`Saving purchase transaction failed by buyer ${err}`);
            response.setRes("Failed adding purchased transaction to DB");
            callback(db_err, response);
        }
        logger.debug(`Purchase transaction saved`);
        response.setRes(`Purchase transaction saved ${user_name}`);
        callback(null, response);
    });
    logger.debug(`Purchase transaction saved`);

    /*
    const history = this.db.collection("history");
    let response = new messages.provideFeedbackResponse();

    var cursor = DBO.collection("history").find({"username": ObjectId(user_name)}).toArray();
    cursor.then((_resp) => {

        if(!_resp.length){
            DBO.collection("history").insertOne({"username": user_name}, {$set: {history:_history}}, function(err, resp){
                
            });    
        }

        // update the history 
        _history = _resp[0].history;
        _history.push(112211);
        logger.debug(_history);        
        DBO.collection("history").updateOne({"username": user_name}, {$set: {history:_history}}, function(err, resp){
            if(err) {
                logger.error(`Purchase failed by buyer ${err}`);
                response.setRes("500");
                callback(null, response);
            }
            logger.debug(`Completed the purchase`);

            var out_msg = "Completed the purchase";
            response.setRes(out_msg);
            callback(null, response);
        });
    }).catch(_err => {
        if(_err) {
            logger.error(`Adding feedback failed by buyer: ${_err}`);
            response.setRes("Adding feedback failed by buyer");
            callback(null, response);
        }
    });
    */

    logger.debug(`Purchase recorded ${user_name}`);
  }

  getSellerRating = (call, callback) => {
    logger.info("Get Seller Rating API :"+call.request);
    var seller_request = call.request;
    console.log(seller_request);

    var seller_id = seller_request.getUsername();    
    let resp = new messages.rating();
    
    console.log(seller_id);
    db_get_user(seller_id, (err, user) => {
        if(err){
            var err_msg = `Get Seller Ratings Failed at DB for seller id: ${seller_id}`;
            logger.error(`${err_msg}`);
            logger.error(err);
            resp.setVal(-1);
            callback(err, resp);
        }
        var mean_ratings = user.mean_ratings || 0;
        logger.debug(`Returning seller rating ${(user.mean_ratings || 0)}`)
        resp.setVal( parseInt(mean_ratings));
        callback(null, resp);
    });
  }
  
  getBuyerHistory = (call, callback) => {
    console.log("Called getBuyerHistory API");

    var buyer_history_request = call.request;
    var user_name = buyer_history_request.getUsername();
    console.log(buyer_history_request);
    var query = {"username":user_name};

    var buyer_history_response = new messages.getBuyerHistoryResponse();

    var history = DBO.collection("history").find(query).toArray();
    history.then((result) => {
        logger.debug(JSON.stringify(result, null, 4));
        //buyer_history_response.setRes("Done Deal");
        callback(null, buyer_history_response);
    }).catch((err) => {
        //buyer_history_response.setRes("Failed Deal");
        callback(err, buyer_history_response);
    });
  }
};
