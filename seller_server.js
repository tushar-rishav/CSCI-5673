var net = require('net');

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;

var url = "mongodb://localhost:27017";

var DBO;

MongoClient.connect(url, function(err, db) {
    if (err)
        throw err;
    console.log("Database created!");
    DBO = db.db('ecommerce');
    //db.close();
});


var HOST = '127.0.0.1';
var PORT = 6969;

var server = net.createServer();

server.listen({host: HOST, port: PORT}, () => {
    console.log(`Seller Server listening on ${server.address().address}:${server.address().port}`);
});

server.on('connection', function(sock) {

    console.log(`CONNECTED Seller Client: ${sock.remoteAddress}:${sock.remotePort}`);
    sock.seller_items = new Set();

    sock.on('data', function(data) {
        try{
            msg = JSON.parse(data);  
            console.log(`Received msg: ${JSON.stringify(msg, null, 4)}`);

            switch(msg.action) {
                case 'put_item':
                    put_item(sock, msg);
                    break
                case 'change_sale_price':
                    change_sale_price(sock, msg);
                    break
                case 'remove_item':
                    remove_item(sock, msg);
                    break
                case 'display_seller_items':
                    display_seller_items(sock, msg);
                    break
                default:
                    console.log(`5. Received unknown action: ${msg.action}`);
            }
        } catch(error){
            console.error(error);
        }
    });

    sock.on('close', function(data) {
        console.log(`CLOSED: ${sock.remoteAddress} ${sock.remotePort}`);
    });
});


function put_item(sock, msg) {
    console.log(`Received action: ${msg.action}`);
    DBO.collection("item").insertOne(msg.data, function(err, res) {
        if (err)
            throw err;
        
        sock.seller_items.add(res.insertedId);
        sock.write(JSON.stringify({error: null, resp: "Item inserted"}));
        console.log(`Item inserted with item_id ${res.insertedId}`);
    });
}

function change_sale_price(sock, msg) {
    console.log(`Received action: ${msg.action}`);
    console.log(msg);
  
    var query = { "_id": ObjectId(msg.data._id)};
    var values = { $set: {price: msg.data.price} };

    DBO.collection("item").updateOne(query, values, function(err, res) {
        if (err){
            sock.write(JSON.stringify({error: null, resp: "Item updated failed"}));
            throw err;
        }
        
        sock.write(JSON.stringify({error: null, resp: "Item updated"}));
        console.log("1 item updated");
  });

}

function remove_item(sock, msg) {
    console.log(`Received action: ${msg.action}`);
    var query = {"_id": ObjectId(msg.data._id)}
    var cursor = DBO.collection('item').find(query);
    cursor.forEach(doc => {
        let qty = Math.max(doc.qty - msg.data.qty, 0);
        if(qty == 0){
            DBO.collection("item").deleteOne(query, function(err, res){
                if(err){
                    sock.write(JSON.stringify({error: null, resp: "Remove item failed"}));
                    throw err;
                }

                sock.seller_items.delete(msg.data._id);
                sock.write(JSON.stringify({error: null, resp: "No left over quantity. Item deleted."}));
                console.log('1 item deleted as it no left over quantity');
            });            
        }
        else {
            let value = {$set: {qty: qty}}; 
            DBO.collection("item").updateOne(query, value, function(err, res){
                if(err){
                    sock.write(JSON.stringify({error: null, resp: "Remove item failed"}));
                    throw err;
                }
                
                sock.write(JSON.stringify({error: null, resp: "Item quantity reduced"}));
                console.log("1 item updated");
            });
        }
    });
    if(cursor.size() == 0)
        sock.write(JSON.stringify({error: null, resp: "No item matched to delete"})); 

}

function display_seller_items(sock, msg) {
    console.log(`Received action: ${msg.action}`);
    var query = {"_id": {"$in": Array.from(sock.seller_items)}}
    var docs = DBO.collection("item").find(query, {projection: {_id: 0}}).toArray();
    docs.then((result) => {
        console.log(JSON.stringify(result, null, 4));
        console.log(`Sending data back to client \n${JSON.stringify(result, null, 4)}`);
        sock.write(JSON.stringify({error: null, resp: JSON.stringify(result)}));
    }).catch(console.error);
}