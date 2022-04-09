// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var protos_buyer_pb = require('./buyer_pb.js');

function serialize_buyer_addItemsRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.addItemsRequest)) {
    throw new Error('Expected argument of type buyer.addItemsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_addItemsRequest(buffer_arg) {
  return protos_buyer_pb.addItemsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_addItemsResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.addItemsResponse)) {
    throw new Error('Expected argument of type buyer.addItemsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_addItemsResponse(buffer_arg) {
  return protos_buyer_pb.addItemsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_clearCartRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.clearCartRequest)) {
    throw new Error('Expected argument of type buyer.clearCartRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_clearCartRequest(buffer_arg) {
  return protos_buyer_pb.clearCartRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_clearCartResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.clearCartResponse)) {
    throw new Error('Expected argument of type buyer.clearCartResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_clearCartResponse(buffer_arg) {
  return protos_buyer_pb.clearCartResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_displayCartRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.displayCartRequest)) {
    throw new Error('Expected argument of type buyer.displayCartRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_displayCartRequest(buffer_arg) {
  return protos_buyer_pb.displayCartRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_displayCartResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.displayCartResponse)) {
    throw new Error('Expected argument of type buyer.displayCartResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_displayCartResponse(buffer_arg) {
  return protos_buyer_pb.displayCartResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_getBuyerHistoryRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.getBuyerHistoryRequest)) {
    throw new Error('Expected argument of type buyer.getBuyerHistoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_getBuyerHistoryRequest(buffer_arg) {
  return protos_buyer_pb.getBuyerHistoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_getBuyerHistoryResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.getBuyerHistoryResponse)) {
    throw new Error('Expected argument of type buyer.getBuyerHistoryResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_getBuyerHistoryResponse(buffer_arg) {
  return protos_buyer_pb.getBuyerHistoryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_getSellerRatingRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.getSellerRatingRequest)) {
    throw new Error('Expected argument of type buyer.getSellerRatingRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_getSellerRatingRequest(buffer_arg) {
  return protos_buyer_pb.getSellerRatingRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_loginResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.loginResponse)) {
    throw new Error('Expected argument of type buyer.loginResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_loginResponse(buffer_arg) {
  return protos_buyer_pb.loginResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_makePurchaseRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.makePurchaseRequest)) {
    throw new Error('Expected argument of type buyer.makePurchaseRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_makePurchaseRequest(buffer_arg) {
  return protos_buyer_pb.makePurchaseRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_makePurchaseResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.makePurchaseResponse)) {
    throw new Error('Expected argument of type buyer.makePurchaseResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_makePurchaseResponse(buffer_arg) {
  return protos_buyer_pb.makePurchaseResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_provideFeedbackRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.provideFeedbackRequest)) {
    throw new Error('Expected argument of type buyer.provideFeedbackRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_provideFeedbackRequest(buffer_arg) {
  return protos_buyer_pb.provideFeedbackRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_provideFeedbackResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.provideFeedbackResponse)) {
    throw new Error('Expected argument of type buyer.provideFeedbackResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_provideFeedbackResponse(buffer_arg) {
  return protos_buyer_pb.provideFeedbackResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_rating(arg) {
  if (!(arg instanceof protos_buyer_pb.rating)) {
    throw new Error('Expected argument of type buyer.rating');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_rating(buffer_arg) {
  return protos_buyer_pb.rating.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_registerResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.registerResponse)) {
    throw new Error('Expected argument of type buyer.registerResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_registerResponse(buffer_arg) {
  return protos_buyer_pb.registerResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_rmvItemsRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.rmvItemsRequest)) {
    throw new Error('Expected argument of type buyer.rmvItemsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_rmvItemsRequest(buffer_arg) {
  return protos_buyer_pb.rmvItemsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_rmvItemsResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.rmvItemsResponse)) {
    throw new Error('Expected argument of type buyer.rmvItemsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_rmvItemsResponse(buffer_arg) {
  return protos_buyer_pb.rmvItemsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_searchItemsForSaleRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.searchItemsForSaleRequest)) {
    throw new Error('Expected argument of type buyer.searchItemsForSaleRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_searchItemsForSaleRequest(buffer_arg) {
  return protos_buyer_pb.searchItemsForSaleRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_searchItemsForSaleResponse(arg) {
  if (!(arg instanceof protos_buyer_pb.searchItemsForSaleResponse)) {
    throw new Error('Expected argument of type buyer.searchItemsForSaleResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_searchItemsForSaleResponse(buffer_arg) {
  return protos_buyer_pb.searchItemsForSaleResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_buyer_userRequest(arg) {
  if (!(arg instanceof protos_buyer_pb.userRequest)) {
    throw new Error('Expected argument of type buyer.userRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_buyer_userRequest(buffer_arg) {
  return protos_buyer_pb.userRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var BuyerSvcService = exports.BuyerSvcService = {
  register: {
    path: '/buyer.BuyerSvc/register',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.userRequest,
    responseType: protos_buyer_pb.registerResponse,
    requestSerialize: serialize_buyer_userRequest,
    requestDeserialize: deserialize_buyer_userRequest,
    responseSerialize: serialize_buyer_registerResponse,
    responseDeserialize: deserialize_buyer_registerResponse,
  },
  login: {
    path: '/buyer.BuyerSvc/login',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.userRequest,
    responseType: protos_buyer_pb.loginResponse,
    requestSerialize: serialize_buyer_userRequest,
    requestDeserialize: deserialize_buyer_userRequest,
    responseSerialize: serialize_buyer_loginResponse,
    responseDeserialize: deserialize_buyer_loginResponse,
  },
  searchItemsForSale: {
    path: '/buyer.BuyerSvc/searchItemsForSale',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.searchItemsForSaleRequest,
    responseType: protos_buyer_pb.searchItemsForSaleResponse,
    requestSerialize: serialize_buyer_searchItemsForSaleRequest,
    requestDeserialize: deserialize_buyer_searchItemsForSaleRequest,
    responseSerialize: serialize_buyer_searchItemsForSaleResponse,
    responseDeserialize: deserialize_buyer_searchItemsForSaleResponse,
  },
  addItemsToCart: {
    path: '/buyer.BuyerSvc/addItemsToCart',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.addItemsRequest,
    responseType: protos_buyer_pb.addItemsResponse,
    requestSerialize: serialize_buyer_addItemsRequest,
    requestDeserialize: deserialize_buyer_addItemsRequest,
    responseSerialize: serialize_buyer_addItemsResponse,
    responseDeserialize: deserialize_buyer_addItemsResponse,
  },
  rmvItemsToCart: {
    path: '/buyer.BuyerSvc/rmvItemsToCart',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.rmvItemsRequest,
    responseType: protos_buyer_pb.rmvItemsResponse,
    requestSerialize: serialize_buyer_rmvItemsRequest,
    requestDeserialize: deserialize_buyer_rmvItemsRequest,
    responseSerialize: serialize_buyer_rmvItemsResponse,
    responseDeserialize: deserialize_buyer_rmvItemsResponse,
  },
  clearCart: {
    path: '/buyer.BuyerSvc/clearCart',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.clearCartRequest,
    responseType: protos_buyer_pb.clearCartResponse,
    requestSerialize: serialize_buyer_clearCartRequest,
    requestDeserialize: deserialize_buyer_clearCartRequest,
    responseSerialize: serialize_buyer_clearCartResponse,
    responseDeserialize: deserialize_buyer_clearCartResponse,
  },
  displayCart: {
    path: '/buyer.BuyerSvc/displayCart',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.displayCartRequest,
    responseType: protos_buyer_pb.displayCartResponse,
    requestSerialize: serialize_buyer_displayCartRequest,
    requestDeserialize: deserialize_buyer_displayCartRequest,
    responseSerialize: serialize_buyer_displayCartResponse,
    responseDeserialize: deserialize_buyer_displayCartResponse,
  },
  provideFeedback: {
    path: '/buyer.BuyerSvc/provideFeedback',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.provideFeedbackRequest,
    responseType: protos_buyer_pb.provideFeedbackResponse,
    requestSerialize: serialize_buyer_provideFeedbackRequest,
    requestDeserialize: deserialize_buyer_provideFeedbackRequest,
    responseSerialize: serialize_buyer_provideFeedbackResponse,
    responseDeserialize: deserialize_buyer_provideFeedbackResponse,
  },
  getSellerRating: {
    path: '/buyer.BuyerSvc/getSellerRating',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.getSellerRatingRequest,
    responseType: protos_buyer_pb.rating,
    requestSerialize: serialize_buyer_getSellerRatingRequest,
    requestDeserialize: deserialize_buyer_getSellerRatingRequest,
    responseSerialize: serialize_buyer_rating,
    responseDeserialize: deserialize_buyer_rating,
  },
  makePurchase: {
    path: '/buyer.BuyerSvc/makePurchase',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.makePurchaseRequest,
    responseType: protos_buyer_pb.makePurchaseResponse,
    requestSerialize: serialize_buyer_makePurchaseRequest,
    requestDeserialize: deserialize_buyer_makePurchaseRequest,
    responseSerialize: serialize_buyer_makePurchaseResponse,
    responseDeserialize: deserialize_buyer_makePurchaseResponse,
  },
  getBuyerHistory: {
    path: '/buyer.BuyerSvc/getBuyerHistory',
    requestStream: false,
    responseStream: false,
    requestType: protos_buyer_pb.getBuyerHistoryRequest,
    responseType: protos_buyer_pb.getBuyerHistoryResponse,
    requestSerialize: serialize_buyer_getBuyerHistoryRequest,
    requestDeserialize: deserialize_buyer_getBuyerHistoryRequest,
    responseSerialize: serialize_buyer_getBuyerHistoryResponse,
    responseDeserialize: deserialize_buyer_getBuyerHistoryResponse,
  },
};

exports.BuyerSvcClient = grpc.makeGenericClientConstructor(BuyerSvcService);
