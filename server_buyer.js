/* ---------------------------------------------------------------------------------------------
 Author: Sai Akhil
 Item:{Item Name(32), Item Category(0-9), Item Id(unique id), Keywords, Condition, Sale Price} 
 Keywords: up to five keywords, assigned by the seller, each keyword string up to 8 characters 
 Condition: New or Used, assigned by the seller 
 Sale price: decimal number, assigned by the seller 
 ---------------------------------------------------------------------------------------------
*/

var net = require('net');
var mongoclient = require("mongodb");
var ObjectId = require("mongodb").ObjectId;
var MongoClient = require("mongodb").MongoClient;
var url = "mongodb://localhost:27017";
var DBO;
var HOST = '127.0.0.1';
var PORT = 8888;
var server = net.createServer();

// Connecting to the MongoDb Client
MongoClient.connect(url, function(err, db) {
    if (err)
        throw err;
    console.log("Database created!");
    DBO = db.db('ecommerce');
});

// search items in the mongoDb 
function SearchItemsForSale(itemCategory, keyList, sock){ 
    console.log("Searching Items for Sale: "+itemCategory+" : "+keyList);
    var query = { "category":itemCategory,"keywords":{"$in":keyList}};
    const options = {sort:{name:1}, projection:{_id:0}}
    var cursor = DBO.collection("item").find(query, options).toArray();
    cursor.then((result) => {
        console.log(JSON.stringify(result, null, 4));
        console.log(`Sending data back to client \n${JSON.stringify(result, null, 4)}`);
        sock.write(JSON.stringify({error: null, resp: JSON.stringify(result)}));
    }).catch(console.error);
}

// TODO: Cart display: DB retrieval call has to be made to show detailedly;
function displayCart(cart, sock){
    console.log("Displaying cart:");
    console.log(cart);
    var query = {"_id":{"$in":Array.from(Object.keys(cart).map(x=>ObjectId(x)))}};
    const options = {sort:{name:1}, projection:{_id:0}}
    var cursor = DBO.collection("item").find(query, options).toArray();
    cursor.then((result) => {
        console.log(JSON.stringify(result, null, 4));
        console.log(`Sending data back to client \n${JSON.stringify(result, null, 4)}`);
        sock.write(JSON.stringify({error: null, resp: JSON.stringify(result)}));
    }).catch(console.error);
}

// listening on the port
server.listen({host: HOST, port: PORT}, () => {
    console.log(`Server listening on ${server.address().address}:${server.address().port}`);
});

// For event connection
server.on('connection', function(sock) {
    var buffer;
    var cart = {} // dict for cart items
    console.log(`${sock.remoteAddress}`);
    console.log(`CONNECTED to Remote Socket: ${sock.remoteAddress}:${sock.remotePort}`);

    sock.on('data', function(data) {
    try{
        console.log(`DATA ${sock.remoteAddress}:${JSON.stringify(JSON.parse(data), null, 4)}`);
        msg = JSON.parse(data.toString());
        var _jData = msg.data;
        switch(msg.action){
            case 'search_items':
                SearchItemsForSale(_jData.category, _jData.keyList, sock);
                break;
            case 'add_item':
                console.log("Add Cart id: "+_jData.id+" : "+cart[_jData.id]+" :quantity: "+_jData.quantity);
                if(cart[_jData.id]==undefined)
                    cart[_jData.id]=_jData.quantity;
                else
                    cart[_jData.id]+=_jData.quantity;
                sock.write(JSON.stringify({error: null, resp: "Added Item Succesful"}));
                break;
            case 'rmv_item':
                console.log("Removing Item: "+_jData.id+" with quantity: "+_jData.quantity);
                console.log("Remove Cart value: "+cart[_jData.id]);
                if(cart[_jData.id]==undefined)
                    cart[_jData.id]=0;
                else
                    cart[_jData.id]-=_jData.quantity;
                cart[_jData.id]=Math.max(0, cart[_jData.id]); 
                if(cart[_jData.id]==0)
                    delete cart[_jData.id];
                sock.write(JSON.stringify({error: null, resp: "Remove Item Succesful"}));
                break;
            case 'clr_cart':
                console.log("Clearing cart: ");
                sock.write(JSON.stringify({error: null, resp: "Clear Cart Succesful"}));
                cart = {}
                break;
            case 'display_cart':
                displayCart(cart, sock); 
                break;
            default:
                console.log(`Received Unknown Action: ${msg.action}"`);
        }
    }
    catch(error){
        console.error(error)
    }
    });

    sock.on('close', function(data) {
        console.log(`CLOSED: ${sock.remoteAddress} ${sock.remotePort}`);
    });
});

