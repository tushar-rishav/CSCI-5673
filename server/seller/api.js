require('dotenv').config();
const log4js = require('log4js');
const messages = require('../../sellerService/proto/seller_pb');
const grpc = require('@grpc/grpc-js');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
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

module.exports = class API {
  constructor(db, grpc) {
    this.db = db;
    DBO=this.db;
    this.grpc = grpc;
  }

  // registers the user into the database
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

  // authenticates the user and lets you access to the apis
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
 
  // gets the seller rating for this seller and access "user" database
  getSellerRating = (call, callback) => {
    console.log("Called get Seller Rating API");
    logger.debug('Not Implemented');
    db_get_user(req.query.username, (user_err, user_resp) => {
        if(user_err){
            logger.error(`Error fetching user info for user ${req.query.username} error: ${user_err}`);
            return res.sendStatus(500);
        }

        res.json({"ratings": user_resp.mean_ratings }); 
    });  
  }

  // puts an item for sale and interacts with both "items" and "users" database
  putAnItemForSale = (call, callback) => {
    console.log("Called putAnItemForSale API");

  }
  
  // puts an item for sale and interacts with only "items" database
  changeSalePrice = (call, callback) => {
    console.log("Called changeSalePrice API");

  }

  // remove an item from sale and interacts with 
  rmvAnItem = (call, callback) => {
    console.log("Called rmvAnItem API");

  }
  
  // display the items put for sale by the seller and access the "user" database  
  displayItems = (call, callback) => {
    console.log("Called Display Items API");
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

};
