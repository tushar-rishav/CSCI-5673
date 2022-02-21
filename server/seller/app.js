/** 
 * Author: Tushar Gautam (tuga2842)
 */

const express = require('express');
const logger = require('log4js');

var logger = log4js.getLogger();
logger.level = process.env.DEBUG ? "debug" : "info";

const app = express();

const authenticate = function(req, res, next){
    logger.debug('Dummy authentication successful!');
    next();
}

app.use(authenticate);

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

app.post('/account', (req, res) => { // create an account: setup username/passwd
    logger.debug('Not Implemented');
});

app.post('/login', (req, res) => {
    logger.debug('Not Implemented');
});

app.post('/logout', (req, res) => {
    logger.debug('Not Implemented');
});

app.post('/add_items', (req, res) => { // put an item for sale
    logger.debug('Not Implemented');
});

app.post('/change_price', (req, res) => { // change the sale price of an item
    logger.debug('Not Implemented');
});

app.post('/remove_item', (req, res) => {
    logger.debug('Not Implemented');
});

app.get('/ratings', (req, res) => { // display seller rating
    logger.debug('Not Implemented');
});

app.get('/display_items', (req, res) => {
    logger.debug('Not Implemented');
});

app.listen(PORT, HOST, () => {
    logger.info('Seller Server is up');
});