// sellerService/grpc_server.js
require('dotenv').config();
const grpc = require('@grpc/grpc-js');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const services = require('../../buyerService/proto/buyer_grpc_pb');
const API = require("./api");

// Mongo Connection
const DB_URL = "mongodb://34.67.69.44:27017";
var DBO; // db object
let api=null;
const dbClient=new MongoClient(DB_URL, { useUnifiedTopology: true });

async function connectDB() {
    try {
        await dbClient.connect();
        DBO = await dbClient.db('ecommerce');
        DBO.command({ ping: 1 });
        console.log("Connected successfully to mongo server");
        // Init api
        api = new API(DBO, grpc);
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    await connectDB().catch(console.dir);
    let server = new grpc.Server();
    server.addService(services.BuyerSvcService, {
      register : api.register,
      login : api.login,        
      searchItemsForSale : api.searchItemsForSale,
      addItemsToCart : api.addItemsToCart,
      rmvItemsToCart : api.rmvItemsToCart,
      clearCart : api.clearCart,
      displayCart : api.displayCart,
      provideFeedback : api.provideFeedback,
      getSellerRating : api.getSellerRating,
      getBuyerHistory : api.getBuyerHistory,
      makePurchase : api.makePurchase,
    });

    let address = "0.0.0.0:50051";
    console.log(address);
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () => {
        server.start();
        console.log("Server running at " + address);
    });
}

main();
