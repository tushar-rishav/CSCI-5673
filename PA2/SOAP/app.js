/*jslint node: true */
"use strict";


var soap = require('soap');
var express = require('express');
var fs = require('fs');

function randomWithProbability() {
  var notRandomNumbers = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0];
  var idx = Math.floor(Math.random() * notRandomNumbers.length);
  return notRandomNumbers[idx];
}

// the splitter function, used by the service
function splitter_function(args) {
    console.log('splitter_function');
    var splitter = args.splitter;
    var splitted_msg = args.message;
    var result = [];
    if(randomWithProbability() == 1){
      result.push("Yes");
    }
    else{
      result.push("No");
    }
    return {
        result: result
        }
}

// the service
var serviceObject = {
  MessageSplitterService: {
        MessageSplitterServiceSoapPort: {
            MessageSplitter: splitter_function
        },
        MessageSplitterServiceSoap12Port: {
            MessageSplitter: splitter_function
        }
    }
};

// load the WSDL file
var xml = fs.readFileSync('service.wsdl', 'utf8');
// create express app
var app = express();

// root handler
app.get('/', function (req, res) {
  res.send('Node Soap Example!<br /><a href="https://github.com/macogala/node-soap-example#readme">Git README</a>');
})

// Launch the server and listen
var port = 8000;
app.listen(port, function () {
  console.log('Listening on port ' + port);
  var wsdl_path = "/wsdl";
  soap.listen(app, wsdl_path, serviceObject, xml);
  console.log("Check http://localhost:" + port + wsdl_path +"?wsdl to see if the service is working");
});
