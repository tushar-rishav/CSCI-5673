/**
 *  Author: Tushar Gautam
 *  ID: tuga2842
 */

var readline = require('readline-sync');
var startTime=0
var endTime=0
const net = require('net');

const client = net.createConnection({ host: '127.0.0.1', port: 6969}, () => {
    console.log('connected to server!');
    setTimeout(read_input, 0, client);
});

client.on('data', (data) => {
    console.log('Received response from server\n');
    console.log(JSON.parse(data.toString(), null, 4));
    endTime = new Date().getTime();
    console.log('===========================================================================');
    console.log(`Call to Server took ${endTime - startTime} milliseconds`)
    console.log('===========================================================================');

    setTimeout(read_input, 0, client); 
});

client.on('end', () => {
  console.log('disconnected from server');
});

function read_input(client){
    var data = readline.question("Provide data to be sent to seller server?\n");
    startTime = new Date().getTime();    
    client.write(data);
    console.log('Waiting for response from server...');
}
