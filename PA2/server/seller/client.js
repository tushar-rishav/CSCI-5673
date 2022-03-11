// SellerService/Client.js

const messages = require('../../sellerService/proto/seller_pb');
const services = require('../../sellerService/proto/seller_grpc_pb');
const grpc = require('@grpc/grpc-js');

function main() {
    const client = new services.SellerSvcClient('localhost:50052', grpc.credentials.createInsecure());
    console.log("Called the client stub");

    let registerReq = new messages.userRequest();
    registerReq.setUsername("Akhil");
    registerReq.setPassword("Nookayya");
    /*client.register(registerReq, function(err, response) {
        console.log(response);
    });
    
    client.authenticate(registerReq, function(err, response) {
        console.log(response);
    });*/
   
    let userName = new messages.userName();
    userName.setUsername("Akhil"); 
    client.displayItems(userName, function(err, response) {
      console.log("called: " ); 
      console.log(response);
    });

}

main();
