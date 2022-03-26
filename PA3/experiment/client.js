const NTP = require('../index').Client;
const Measurement = require('../index').Measurement;
//const client = new NTP('utcnist2.colorado.edu', 123, { timeout: 3000 });

var burst_id = 0
//const NTP_HOST = 'localhost'
const NTP_HOST =  'a.st1.ntp.br'
//const NTP_HOST =  '10.0.0.235'; // '34.133.44.127'
const NTP_PORT = 123;
const totalBurst = 15;

var metrics = new Measurement(fpath='metrics.json');

function sendRequest(client){
    client
			.syncTime()
			.then(response => {
				metrics.record(response);
				console.log('NTP response', response);
				metrics.dumpToDisk();
                clearInterval(client.timer); // stop retransmission loop
			})
			.catch(console.error);
}

var burst = function(){

	for(let i = 0; i < 8; i++){
		let client = new NTP(NTP_HOST,
							NTP_PORT,
							{ timeout: 10000 },
							burst_id=burst_id,
							msg_id=i);

        setTimeout(sendRequest, 0, client);
        client.timer = setInterval(sendRequest, 2*1000, client); // 2 seconds timeout for retransmission
	}

	burst_id += 1;
	if(burst_id == totalBurst){
		console.log('Total burst sent. Stopping furhter bursts...');
		clearInterval(interval);
	}
}
setImmediate(burst);
var interval = setInterval(burst, 4*60*1000); // 4 minutes interval
