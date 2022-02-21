/** 
 * Author: Tushar Gautam (tuga2842)
 */

const express = require('express');
const log4js = require('log4js');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const hash = require('pbkdf2-password')();
const session = require('express-session');
const bodyParser = require('body-parser');
const { response } = require('express');

const HOST = '0.0.0.0';
const PORT = 6969;

const app = express();

app.set('prod', process.env.prod);

var logger = log4js.getLogger();
logger.level = app.get('prod')==1 ? "info" : "debug";

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

function restrict(req, res, next) {
    if (app.locals[req.query.name]) {
        logger.info(`Request granted for user ${req.query.name}`);
        next();
    } else {
        logger.info(`Request denied!`);
        res.sendStatus(404);
    }
  }

function authenticate(name, passwd, fn) {
    logger.debug(`Authenticating ${name}:${passwd}`);
    db_get_user(name, (db_err, user) => {
        if(db_err){
            logger.error(`Authentication DB failure for user: ${name} with error: ${db_err}`);
            fn(null, null);
        }
        if(user.name == name && user.passwd == passwd){
            return fn(null, user);
        } else {
            return fn(Error('Auth failed'));
        }
    });
}

app.post('/account', (req, res) => { // params: {name, passwd}
    user_data = {name: req.body.name, passwd: req.body.passwd, ratings: [], items: []};
    DBO.collection("user").insertOne(user_data, function(db_err, db_resp) {
        if (db_err) {
            return res.json({'reg': false, 'msg': `Registration failed with error: ${db_err}`});
        }
        logger.debug(`Item inserted with item_id ${db_resp.insertedId}`);
        res.json({'reg': true, 'msg': `Registration successful for ${req.body.name}`});
    });
});

app.post('/login', (req, res, next) => { // params: {name, passwd}
    authenticate(req.body.name, req.body.passwd, (err, user) => {
        if (err){
            err_msg = `Auth failed for user ${req.body.name}`;
            logger.error(`${err_msg}`);
            res.json({'auth': false, 'msg': 'Auth failed'});
        }
        else if(user) {
            logger.info(`Auth successful for user ${req.body.name}`);
            app.locals[req.body.name] = user;
            res.json({'auth': true, 'msg': 'Auth successful'});
        }
        next();
    });
});

app.post('/logout', (req, res) => {  // params: {name}
    delete app.locals[req.body.name];
    res.json({'auth': false, 'msg': 'Logout successful'});
});

/**
 * 
 *  Create an account: sets up username and password 
    Login: provide username and password 
    Logout 
    Get seller rating 
    Put an item for sale: provide all item characteristics and quantity 
    Change the sale price of an item: provide item id and new sale price 
    Remove an item from sale: provide item id and quantity 
    Display items currently on sale put up by this seller
 */


app.get('/ratings', restrict, (req, res) => { // display seller rating
    logger.debug('Not Implemented');
    res.json({"msg": "Not implemented yet"});
});

app.get('/display_items', restrict, (req, res, next) => { // param {name}
    db_get_user(req.body.name, (user_err, user_resp) => {
        if(user_err){
            logger.error(`Error fetching user info for user ${req.body.name} error: ${user_err}`);
            return res.sendStatus(500);
        }

        items = user_resp.items;
        var query = {"_id": { "$in": items } }
        var docs = DBO.collection("item").find(query, {projection: {_id: 0}}).toArray();
        docs.then((result) => {
            logger.debug(JSON.stringify(result, null, 4));
            res.json(result);
        }).catch((item_err) => {
            logger.error(`Error fetching items: ${item_err}`);
            res.sendStatus(500);
        });

    });
});

app.post('/add_items', restrict, (req, res) => { // param: {name, data}
    DBO.collection("item").insertOne(req.body.data, function(item_err, item_resp) {
        if(item_err){
            logger.error(`Error fetching user info for user ${req.body.name} error: ${item_err}`);
            return res.sendStatus(500);
        }
        
        res.sendStatus(200);
        logger.debug(`Item inserted with item_id ${item_resp.insertedId}`);
    });
});

app.post('/change_price', restrict, (req, res) => { // params: name, data: {item_id: <>, price: <>}
    
    var query = { "_id": ObjectId(req.body.data.item_id)};
    var values = { $set: {price: req.body.data.price} };

    DBO.collection("item").updateOne(query, values, function(err, res) {
        if (err){
            logger.error(`Item updated failed: ${err}`);
            res.sendStatus(500);
        }

        logger.debug(`Item price updated by seller ${req.body.name}`);
        res.sendStatus(200);
    });
});

app.post('/remove_item', restrict, (req, res, next) => { // params: name, data: {item_id: <>, qty: <> }
    var query = { "_id": ObjectId(req.body.data.item_id) };
    var cursor = DBO.collection('item').find(query);
    
    cursor.forEach(doc => {
        let qty = Math.max(doc.qty - req.body.data.qty, 0);
        if(qty == 0){
            DBO.collection("item").deleteOne(query, function(err, res){
                if(err) {
                    logger.error(`Remove item failed ${err}`);
                    return res.sendStatus(500);
                }

                db_get_user(req.body.name, (user_err, user) => {
                    if(user_err){
                        logger.error(`Error reading user info ${user_err}`);
                        return res.sendStatus(500);
                    }
                    // FIXME remove item_id from user
                    logger.debug(`No left over quantity. Item deleted for seller ${req.body.name}`);
                });
            });            
        }
        else {
            let value = {$set: {qty: qty}}; 
            DBO.collection("item").updateOne(query, value, function(err, res){
                if(err) {
                    logger.error(`Remove item failed for seller: ${req.body.name} ${err}`);
                    return res.sendStatus(500);
                }
                
                logger.debug(`Item quantity reduced by seller: ${req.body.name}`);
            });
        }
    });
    if(cursor.size() == 0) {
        res.json({ "msg": "No item matched to delete" });
    }
});

app.use(error);
app.listen(PORT, HOST, () => {
    logger.info('Seller Server is up');
});