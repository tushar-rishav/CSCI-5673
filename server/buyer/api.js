require('dotenv').config();
const log4js = require('log4js');
const messages = require('../../sellerService/proto/seller_pb');
const grpc = require('@grpc/grpc-js');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const hash = require('pbkdf2-password')();
const services = require('../../sellerService/proto/seller_grpc_pb');

var logger = log4js.getLogger();
logger.level = "debug";

var DBO;

function db_get_user(name, callback) {
    var query = {"name": name} // name is unique index
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

function authenticate(name, passwd, fn) {
    logger.debug(`Authenticating ${name}:${passwd}`);
    db_get_user(name, (db_err, user) => {
        if(db_err){
            logger.error(`Authentication DB failure for user: ${name} with error: ${db_err}`);
            fn(null, null);
        }
        else{
        if(user.name == name && user.passwd == passwd){
          return fn(null, user);
        } else {
            return fn(Error('Auth failed'));
        }}
    }); 
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

module.exports = class API {
  constructor(db, grpc) {
    this.db = db;
    DBO=this.db;
    this.grpc = grpc;
  }

  // registers the user and add an entry into the "user" database
  register = (call, callback) => {
    console.log("Called Register API");
    const users = this.db.collection("user");
    let user_data = {name: call.request.getUsername(), passwd: call.request.getPassword(), ratings: [], items: []};
    users.insertOne(user_data, function(db_err, db_resp) {
      let resp = new messages.registerResponse();
      if (db_err) {
        //return res.json({'reg': false, 'msg': `Registration failed with error: ${db_err}`});
        resp.setRes("Failed case scenario");
      }
      logger.debug(`Item inserted with item_id ${db_resp.insertedId}`);
      resp.setRes("Passed case scenario");
      callback(null, resp);
    });
  }

  // authenticates and logs the user in
  login = (call, callback) => {
    console.log("Called Login API");
    const users = this.db.collection("user");
    authenticate(call.request.getUsername(), call.request.getPassword(), (err, user) => {
        let resp = new messages.authenticateResponse();
        if (err){
            err_msg = `Auth failed for user ${call.request.getUsername()}`;
            logger.error(`${err_msg}`);
            resp.setRes("Failed case scenario");
            // res.json({'auth': false, 'msg': 'Auth failed'});
        }
        else if(user) {
            logger.info(`Auth successful for user ${call.request.getUsername()}`);
            //app.locals[call.request.getUsername()] = user;
            resp.setRes("Succesful authentication");
            // res.json({'auth': true, 'msg': 'Auth successful'});
        }
        //next();

        // populate the repsonse
      
    });
  }
 
  // searches the "items" database  
  searchItemsForSale = (call, callback) => {  
    console.log("Called SearchAPI");
    req = call.req;
    var keywords = req.body.data.keywords;
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
    });  
  }
  
  // adds items to the cart and interacts with the "users" database  
  addItemsToCart = (call, callback) => {
    console.log("Called Add Items API");
    const users = this.db.collection("user");
    const name = call.request.getUsername();   
    // this is a itemsList
    var list = [];
    let resp = new messages.displayItemResponse();
   
    db_get_user(name, (user_err, user_resp) => {
      if(user_err){
        logger.error(`Error fetching user info for user ${name} error: ${user_err}`);
        // set the list now
        resp.setItemslistList(list);
        return callback(user_err, resp);
      }

      console.log("I am Akhil: "+JSON.stringify(user_resp)+":"+name);
      items = user_resp.items;
      var query = {"_id": { "$in": items } }
      var docs = DBO.collection("item").find(query, {projection: {_id: 0}}).toArray();
      docs.then((result) => {
          logger.debug(JSON.stringify(result, null, 4));
          // result is a list of JSON objects of [item]
          result.forEach(function(item, index) {
            //item: <name, category, keywords:[], condition, price, qty>
            // repeated ItemQtyPair itemLists=1;
            //  Item item=1;
            //  int32 qty=2;
            // Item:     string name=1; int32 catergory=2; repeated string keywordList=3; string condition=4; int32 price=5; int32 qty=6;
            let item_protobuf = new messages.Item();
            item_protobuf.setName(item["name"]);
            item_protobuf.setCatergory(item["category"]);
            item_protobuf.setKeywordlistList(item["keywordList"]);
            item_protobuf.setCondition(item["condition"]);
            item_protobuf.setPrice(item["price"]);
            item_protobuf.setQty(item["qty"]);
       
            resp.addItemslist(item_protobuf); 
          }); 
          //res.json(result);
          return callback(null, resp);
      }).catch((item_err) => {
          logger.error(`Error fetching items: ${item_err}`);
          //res.sendStatus(500);
          return callback(item_err, resp);
      });
    }); 
  }

  // removes the cart and interacts with the "user" database
  rmvItemsFromCart = (call, callback) => {
    console.log("Called Remove Items From Cart API");
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

  }

  // clears the cart and interacts with the "user" database
  clearCart = (call, callback) => {
    console.log("Called Clear Cart API");
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
  }

  // displays the cart and interacts with the "user" database
  displayCart = (call, callback) => {
    console.log("Called Display Cart API");
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
    });
  }

  // provides feedback and interacts with the "items" database
  provideFeedback = (call, callback) {
    console.log("Called provide Feedback API");
    var username = req.body.username;
    db_get_user(username, (err, user) => {
            if(err){
                logger.error(err);
                return res.send(500);
            }
            user.cart.push([ObjectId(req.body.data.item_id), req.body.data.qty || 0]);
            DBO.collection("item").updateOne({username: req.body.username}, {$set: {feedback: user.feedback}}, function(_err, _resp){
                if(_err) {
                    logger.error(`Adding feedback failed for item: ${req.body.username} ${_err}`);
                    return res.sendStatus(500);
                }
                logger.debug(`New feedback added for item ${req.body.username}`);
                return res.json({"msg": "New feedback added to the item"});
            });
    });
    logger.debug(`Feedback added`);

  }  
  
  getSellerRating = (call, callback) {
    console.log("Called get Seller Rating API");
        var username = req.body.username;
    var qty = req.body.data.qty;

    db_get_user(username, (err, user) => {
        if(err){
            logger.error(err);
            return res.send(500);
        }

        user.cart = user.cart.map(id => id[0] === ObjectId(req.body.data.item_id) ? [id[0], qty] : id);
        user.cart = user.cart.filter(id => id[1] != 0);

        DBO.collection("user").updateOne({username: req.body.username}, {$set: {rating: user.rating}}, function(_err, _resp){
            if(_err) {
                logger.error(`Update ratings failed for buyer: ${req.body.username} ${_err}`);
                return res.sendStatus(500);
            }
            logger.debug(`Rating updated for buyer ${req.body.username}`);
            return res.json({"msg": "Rating updated"});
        });
    });
    logger.debug(`Item removed from cart`);

  }
  
  getBuyerHistory = (call, callback) {
    console.log("Called get Buyer History API");
    var username = req.body.username;

    var query = { "username": username } // username is a unique index
    var history = DBO.collection("history").find(query).toArray();
    history.then((result) => {
        logger.debug(JSON.stringify(result, null, 4));
        return res.json(result);
    }).catch((err) => {
        res.json({"msg": `Fetching history failed with error: ${err}`});
    });

  }
  
};
