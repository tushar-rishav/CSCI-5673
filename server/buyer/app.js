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

app.post('/search', restrict, (req, res) => { // params: {username, category, keywords}
    var keywords = req.body.data.keywords;
    var itemCategory = req.body.data.category;

    logger.debug(`Searching for items with keywords ${keywords} and category: ${itemCategory}`);
    var query = { "category" : itemCategory, "keywords" : { "$in": keywords }};
    const options = { sort : { name:1 }, projection:{_id:0} }
    var cursor = DBO.collection("item").find(query, options).toArray();
    cursor.then((result) => {
        logger.debug(`Found items ${JSON.stringify(result. null, 2)}`);
        res.json(result);
    }).catch((err) => {
        logger.info(`Search failed for items with keywords ${keywords} and category: ${itemCategory}`);
    });
});

// Search


app.use(error);
app.listen(PORT, HOST, () => {
    logger.info('Seller Server is up');
});
