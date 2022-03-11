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

  // registers the user and add an entry into the "user" database
  // receives the binary data from server front end
  register = (call, callback) => {
    console.log("Received a GRPC request for Register API");
    const users = this.db.collection("user");

    var user_request = call.request;
    console.log(user_request);

    let user_data = {username: user_request.getUsername(), passwd: user_request.getPassword(), type:"seller", ratings: [], items:[]};
    var out = "";
    users.insertOne(user_data, function(db_err, db_resp) {
        let resp = new messages.registerResponse();
        if (db_err) {
          logger.info(db_err);
            out = {'reg': false, 'msg': `Registration failed with error: ${db_err}`};
            resp.setRes(JSON.stringify(out));
            return callback(db_err, resp);
        }
        out = {'reg': true, 'msg': `Registration successful for ${user_data.username}`};
        logger.info(db_resp);
        resp.setRes(JSON.stringify(out));
        console.log(resp);
        callback(null, resp);
    });
  }

  // authenticates the user and lets you access to the apis
  login = (call, callback) => {
    console.log("Received a GRPC request for Login API");
    const users = this.db.collection("user");
    var user_request = call.request;
    console.log(user_request);

    let user_data = {username: user_request.getUsername(), passwd: user_request.getPassword(), type:"seller", ratings: [], cart: []};
    console.log(user_data);
    authenticate(user_data.username, user_data.passwd, (err, user) => {
        let resp = new messages.authenticateResponse();
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

  // gets the seller rating for this seller and access "user" database
  getSellerRating = (call, callback) => {
    logger.info("Get Seller Rating API :"+call.request);
    var seller_request = call.request;
    console.log(seller_request);
    
    let resp = new messages.rating();
    
/*
    db_get_user(seller_request.getUsername(), (user_err, user_resp) => {
        if(user_err){
          var err_msg = `Error fetching user info for user ${req.query.username} error: ${user_err}`;
          logger.error(`${err_msg}`);
          logger.error(user_err);
          resp.setRes(err_msg);
          callback(err, resp);
        }
        resp.setRes({"ratings": user_resp.mean_ratings });
        callback(null, resp);
    });  */
    callback(null, resp);
  }

  // puts an item for sale and interacts with both "items" and "users" database
  putAnItemForSale = (call, callback) => {
    console.log("Received a GRPC request for AputAnItemForSale API");
    var add_items_request = call.request;
    console.log(add_items_request);

    const users = this.db.collection("user");
    var username = add_items_request.getUsername();
    var item_id = add_items_request.getId();
    var qty = add_items_request.getQty();
    // @tushar check with him 
    var data = {"item_id":item_id, "qty":qty}
    
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

  }

  // puts an item for sale and interacts with only "items" database
  changeSalePrice = (call, callback) => {
    console.log("Called changeSalePrice API");
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
  }

  // remove an item from sale and interacts with 
  rmvAnItem = (call, callback) => {
    console.log("Called rmvAnItem API");
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

  }

  // display the items put for sale by the seller and access the "user" database  
  displayItems = (call, callback) => {
    logger.info("Called Display Cart API");
    var display_item_request = call.request;
    console.log(display_item_request);

    const users = this.db.collection("user");
    var username = display_item_request.getUsername();
    let resp = new messages.displayItemResponse();

    var list = [];
    db_get_user(username, (user_err, user_resp) => {
        if(user_err){
            var err_msg = `Failed to display cart for ${username}`;
            logger.error(`${err_msg}`);
            logger.error(user_err);
            resp.setItemslistList(list);
            callback(err, resp);
        }

        var item_ids = user_resp.items;
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
            callback(item_err, resp);
        });
    }); 
  }

};
