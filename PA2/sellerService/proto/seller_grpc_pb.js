// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var seller_pb = require('./seller_pb.js');

function serialize_seller_authenticateResponse(arg) {
  if (!(arg instanceof seller_pb.authenticateResponse)) {
    throw new Error('Expected argument of type seller.authenticateResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_authenticateResponse(buffer_arg) {
  return seller_pb.authenticateResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_changeSalePriceRequest(arg) {
  if (!(arg instanceof seller_pb.changeSalePriceRequest)) {
    throw new Error('Expected argument of type seller.changeSalePriceRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_changeSalePriceRequest(buffer_arg) {
  return seller_pb.changeSalePriceRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_changeSalePriceResponse(arg) {
  if (!(arg instanceof seller_pb.changeSalePriceResponse)) {
    throw new Error('Expected argument of type seller.changeSalePriceResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_changeSalePriceResponse(buffer_arg) {
  return seller_pb.changeSalePriceResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_displayItemResponse(arg) {
  if (!(arg instanceof seller_pb.displayItemResponse)) {
    throw new Error('Expected argument of type seller.displayItemResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_displayItemResponse(buffer_arg) {
  return seller_pb.displayItemResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_displayItemsRequest(arg) {
  if (!(arg instanceof seller_pb.displayItemsRequest)) {
    throw new Error('Expected argument of type seller.displayItemsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_displayItemsRequest(buffer_arg) {
  return seller_pb.displayItemsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_putAnItemForSaleRequest(arg) {
  if (!(arg instanceof seller_pb.putAnItemForSaleRequest)) {
    throw new Error('Expected argument of type seller.putAnItemForSaleRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_putAnItemForSaleRequest(buffer_arg) {
  return seller_pb.putAnItemForSaleRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_putAnItemForSaleResponse(arg) {
  if (!(arg instanceof seller_pb.putAnItemForSaleResponse)) {
    throw new Error('Expected argument of type seller.putAnItemForSaleResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_putAnItemForSaleResponse(buffer_arg) {
  return seller_pb.putAnItemForSaleResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_rating(arg) {
  if (!(arg instanceof seller_pb.rating)) {
    throw new Error('Expected argument of type seller.rating');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_rating(buffer_arg) {
  return seller_pb.rating.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_registerResponse(arg) {
  if (!(arg instanceof seller_pb.registerResponse)) {
    throw new Error('Expected argument of type seller.registerResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_registerResponse(buffer_arg) {
  return seller_pb.registerResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_rmvAnItemRequest(arg) {
  if (!(arg instanceof seller_pb.rmvAnItemRequest)) {
    throw new Error('Expected argument of type seller.rmvAnItemRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_rmvAnItemRequest(buffer_arg) {
  return seller_pb.rmvAnItemRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_rmvAnItemResponse(arg) {
  if (!(arg instanceof seller_pb.rmvAnItemResponse)) {
    throw new Error('Expected argument of type seller.rmvAnItemResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_rmvAnItemResponse(buffer_arg) {
  return seller_pb.rmvAnItemResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_userName(arg) {
  if (!(arg instanceof seller_pb.userName)) {
    throw new Error('Expected argument of type seller.userName');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_userName(buffer_arg) {
  return seller_pb.userName.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_seller_userRequest(arg) {
  if (!(arg instanceof seller_pb.userRequest)) {
    throw new Error('Expected argument of type seller.userRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_seller_userRequest(buffer_arg) {
  return seller_pb.userRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var SellerSvcService = exports.SellerSvcService = {
  register: {
    path: '/seller.SellerSvc/register',
    requestStream: false,
    responseStream: false,
    requestType: seller_pb.userRequest,
    responseType: seller_pb.registerResponse,
    requestSerialize: serialize_seller_userRequest,
    requestDeserialize: deserialize_seller_userRequest,
    responseSerialize: serialize_seller_registerResponse,
    responseDeserialize: deserialize_seller_registerResponse,
  },
  authenticate: {
    path: '/seller.SellerSvc/authenticate',
    requestStream: false,
    responseStream: false,
    requestType: seller_pb.userRequest,
    responseType: seller_pb.authenticateResponse,
    requestSerialize: serialize_seller_userRequest,
    requestDeserialize: deserialize_seller_userRequest,
    responseSerialize: serialize_seller_authenticateResponse,
    responseDeserialize: deserialize_seller_authenticateResponse,
  },
  getSellerRating: {
    path: '/seller.SellerSvc/getSellerRating',
    requestStream: false,
    responseStream: false,
    requestType: seller_pb.userName,
    responseType: seller_pb.rating,
    requestSerialize: serialize_seller_userName,
    requestDeserialize: deserialize_seller_userName,
    responseSerialize: serialize_seller_rating,
    responseDeserialize: deserialize_seller_rating,
  },
  putAnItemForSale: {
    path: '/seller.SellerSvc/putAnItemForSale',
    requestStream: false,
    responseStream: false,
    requestType: seller_pb.putAnItemForSaleRequest,
    responseType: seller_pb.putAnItemForSaleResponse,
    requestSerialize: serialize_seller_putAnItemForSaleRequest,
    requestDeserialize: deserialize_seller_putAnItemForSaleRequest,
    responseSerialize: serialize_seller_putAnItemForSaleResponse,
    responseDeserialize: deserialize_seller_putAnItemForSaleResponse,
  },
  changeSalePrice: {
    path: '/seller.SellerSvc/changeSalePrice',
    requestStream: false,
    responseStream: false,
    requestType: seller_pb.changeSalePriceRequest,
    responseType: seller_pb.changeSalePriceResponse,
    requestSerialize: serialize_seller_changeSalePriceRequest,
    requestDeserialize: deserialize_seller_changeSalePriceRequest,
    responseSerialize: serialize_seller_changeSalePriceResponse,
    responseDeserialize: deserialize_seller_changeSalePriceResponse,
  },
  rmvAnItem: {
    path: '/seller.SellerSvc/rmvAnItem',
    requestStream: false,
    responseStream: false,
    requestType: seller_pb.rmvAnItemRequest,
    responseType: seller_pb.rmvAnItemResponse,
    requestSerialize: serialize_seller_rmvAnItemRequest,
    requestDeserialize: deserialize_seller_rmvAnItemRequest,
    responseSerialize: serialize_seller_rmvAnItemResponse,
    responseDeserialize: deserialize_seller_rmvAnItemResponse,
  },
  displayItems: {
    path: '/seller.SellerSvc/displayItems',
    requestStream: false,
    responseStream: false,
    requestType: seller_pb.displayItemsRequest,
    responseType: seller_pb.displayItemResponse,
    requestSerialize: serialize_seller_displayItemsRequest,
    requestDeserialize: deserialize_seller_displayItemsRequest,
    responseSerialize: serialize_seller_displayItemResponse,
    responseDeserialize: deserialize_seller_displayItemResponse,
  },
};

exports.SellerSvcClient = grpc.makeGenericClientConstructor(SellerSvcService);
