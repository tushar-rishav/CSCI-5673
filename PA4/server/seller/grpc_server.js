// sellerService/grpc_server.js
require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const services = require('../../sellerService/proto/seller_grpc_pb');
const API = require("./api");

// Mongo Connection
const DB_URL = "mongodb://localhost:27017";
var DBO; // db object
var api;
//const dbClient=new MongoClient(DB_URL, { useUnifiedTopology: true });

/*
function connectDB() {
    try {
        dbClient.connect();
        DBO = dbClient.db('ecommerce');
        DBO.command({ ping: 1 });
        console.log("Connected successfully to mongo server");
        // Init api
        api = new API(DBO, grpc);
    } catch (e) {
        console.error(e);
    }
}*/

function main() {
    // connectDB().catch(console.dir);
    let server = new grpc.Server();
    server.addService(services.SellerSvcService, {
      register: api.register,
      authenticate: api.login,        
      getSellerRating: api.getSellerRating,
      putAnItemForSale : api.putAnItemForSale,
      changeSalePrice : api.changeSalePrice,
      rmvAnItem : api.rmvAnItem,
      displayItems: api.displayItems,
    });
    
    let address = "0.0.0.0:50052";
    console.log(address);
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () => {
        server.start();
        console.log("Server running at " + address);
    });
}

MongoClient.connect(DB_URL, function(err, db) {
    if (err)
        throw err;
    console.log("Database created!");
    DBO = db.db('ecommerce');
    DBO.command({ ping: 1 });
    console.log("Connected successfully to mongo server");
    // Init api
    api = new API(DBO, grpc);
    main();
});


