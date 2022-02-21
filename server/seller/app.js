/** 
 * Author: Tushar Gautam (tuga2842)
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

const HOST = '0.0.0.0';
const PORT = 6969;

const app = express();

app.set('prod', process.env.prod);

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

app.post('/account', (req, res) => { // params: {username, passwd}
    user_data = {username: req.body.username, passwd: req.body.passwd, mean_ratings: 0, num_ratings: 0, items: []};
    logger.info(user_data.body);
    DBO.collection("user").insertOne(user_data, function(db_err, db_resp) {
        if (db_err) {
            return res.json({'reg': false, 'msg': `Registration failed with error: ${db_err}`});
        }
        logger.debug(`User inserted with user_id ${db_resp.insertedId}`);
        res.json({'reg': true, 'msg': `Registration successful for ${req.body.username}`});
    });
});

app.post('/login', (req, res, next) => { // params: {username, passwd}
    authenticate(req.body.username, req.body.passwd, (err, user) => {
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
    });
});

app.post('/logout', (req, res) => {  // params: {username}
    delete app.locals[req.body.username];
    res.json({'auth': false, 'msg': 'Logout successful'});
});

app.get('/ratings', restrict, (req, res) => { // display seller rating
    logger.debug('Not Implemented');
    db_get_user(req.query.username, (user_err, user_resp) => {
        if(user_err){
            logger.error(`Error fetching user info for user ${req.query.username} error: ${user_err}`);
            return res.sendStatus(500);
        }

        res.json({"ratings": user_resp.mean_ratings });
    })
});

app.get('/display_item', restrict, (req, res, next) => { // param {username}
    db_get_user(req.query.username, (user_err, user_resp) => {
        if(user_err){
            logger.error(`Error fetching user info for user ${req.query.username} error: ${user_err}`);
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

app.post('/add_item', restrict, (req, res) => { // param: {username, data}
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
            user.items.push(item_resp.insertedId);
            DBO.collection("user").updateOne({username: req.body.username}, {$set: {items: user.items}}, function(_err, _resp){
                if(_err) {
                    logger.error(`Adding item failed for seller: ${req.body.username} ${_err}`);
                    return res.sendStatus(500);
                }
                logger.debug(`New item added for seller ${req.body.username}`);
                return res.sendStatus(200);
            });
        });
        logger.debug(`Item inserted with item_id ${item_resp.insertedId}`);
    });
});

app.post('/change_price', restrict, (req, res) => { // params: username, data: {item_id: <>, price: <>}
    
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
});

app.post('/remove_item', restrict, (req, res, next) => { // params: username, data: {item_id: <>, qty: <> }
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

                    user_items = user.items.filter(id => id !== ObjectId(req.body.data.item_id));
                    DBO.collection("user").updateOne({username: req.body.username}, {$set: {items: user_items}}, function(_err, _resp){
                        if(_err) {
                            logger.error(`Remove item failed for seller: ${req.body.username} ${_err}`);
                            return res.sendStatus(500);
                        }
                        logger.debug(`No left over quantity. Item deleted for seller ${req.body.username}`);
                        return res.sendStatus(200);
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
                return res.sendStatus(200);
            });
        }
    });
});

app.use(error);
app.listen(PORT, HOST, () => {
    logger.info('Seller Server is up');
});


