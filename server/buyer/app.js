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

const HOST = '0.0.0.0';
const PORT = 8888;

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
    user_data = {username: req.body.username, passwd: req.body.passwd, type: "buyer", mean_ratings: 0, num_ratings: 0, cart: []};
    logger.info(user_data.body);
    DBO.collection("user").insertOne(user_data, function(db_err, db_resp) {
        if (db_err) {
            return res.json({'reg': false, 'msg': `Registration failed with error: ${db_err}`});
        }
        logger.debug(`User inserted with user_id ${db_resp.insertedId}`);
        res.json({'reg': true, 'msg': `Registration successful for ${req.body.username}`});
    });
});

// Login

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

// Logout

app.post('/logout', (req, res) => {  // params: {username}
    delete app.locals[req.body.username];
    res.json({'auth': false, 'msg': 'Logout successful'});
});

// Search

app.post('/search', restrict, (req, res) => { // params: {username, category, keywords}
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
});

// Add item to cart

app.post('/add_item', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var username = req.body.username;
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
    logger.debug(`Item added to cart`);
});

// display cart

app.get('/display_cart', restrict, (req, res, next) => { // param {username}
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
});

// clear cart

app.post('/clear_cart', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
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
});

// update cart

app.post('/remove_item', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
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
});

app.get('/ratings', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var seller_id = req.query.seller_id;
    
    db_get_user(seller_id, (err, user) => {
        if(err){
            logger.error(err);
            return res.send(500);
        }
        var mean_ratings = user.mean_ratings || 0;
        logger.debug(`Returning seller rating ${(user.mean_ratings || 0)}`)
        res.json({ msg: (user.mean_ratings || 0) });
    });
});

app.get('/history', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var username = req.query.username;

    var query = { "username": username } // username is a unique index
    logger.debug(username, query);
    var history = DBO.collection("history").find(query).toArray();
    history.then((result) => {
        logger.debug(JSON.stringify(result, null, 4));
        return res.json(result);
    }).catch((err) => {
        res.json({"msg": `Fetching history failed with error: ${err}`});
    });
});

app.post('/feedback', restrict, (req, res) => { // param: {username, data: {item_id, qty}}
    var item_id = req.body.data.item_id;
    var feedback = req.body.data.feedback; // +1 or -1

    var cursor = DBO.collection("item").find({"_id": ObjectId(item_id)}).toArray();
    cursor.then((_resp) => {
        var mean_feedback = _resp[0].mean_feedback || 0;
        var num_feedback = _resp[0].num_feedback || 0;
        var new_feedback = (mean_feedback*num_feedback) + feedback;

        logger.debug(mean_feedback, num_feedback, new_feedback, feedback);
        var update = { mean_feedback: new_feedback/(num_feedback+1), num_feedback: num_feedback+1 }
        logger.debug(update);

        DBO.collection("item").updateOne({"_id": ObjectId(item_id)}, {$set: update}, function(err, resp){
            if(err) {
                logger.error(`Add item feedback failed by buyer: ${req.body.username} ${err}`);
                return res.sendStatus(500);
            }
            logger.debug(`New feedback added for user ${req.body.username}`);
            return res.json({"msg": "New feedback added to the item"});
        });
    }).catch(_err => {
        if(_err) {
            logger.error(`Adding feedback failed by buyer: ${req.body.username} ${_err}`);
            return res.sendStatus(500);
        }
    });
});

app.post('/purchase', restrict, (req, res) => {
    var username = req.body.username;
    
    DBO.collection("history").insertOne({username: username, data: req.body.data}, function(db_err, db_resp) {
        if (db_err) {
            return res.json({'reg': false, 'msg': `Saving purchase transaction failed with error: ${db_err}`});
        }
        logger.debug(`Purchase transaction saved`);
        res.json({'reg': true, 'msg': `Purchase transaction saved ${req.body.username}`});
    });

    logger.debug(`Purchase transaction saved`);
});



app.use(error);
app.listen(PORT, HOST, () => {
    logger.info('Buyer Server is up');
});
