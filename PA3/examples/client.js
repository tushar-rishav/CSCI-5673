const NTP = require('../index').Client;
const Measurement = require('../index').Measurement;
//const client = new NTP('utcnist2.colorado.edu', 123, { timeout: 3000 });

var burst_id = 0
//const NTP_HOST = 'localhost'
//const NTP_HOST =  'a.st1.ntp.br'
const NTP_HOST =  '128.110.219.103'; // '34.133.44.127'
const NTP_PORT = 6000;
const totalBurst = 10;

var metrics = new Measurement(fpath='metrics.json');

var burst = function(){
	
	for(let i = 0; i < 8; i++){
		var client = new NTP(NTP_HOST,
							NTP_PORT,
							{ timeout: 10000 },
							burst_id=burst_id, 
							msg_id=i);
		client
			.syncTime()
			.then(response => {
				metrics.record(response); 
				console.log('NTP response', response);
				metrics.dumpToDisk();

			})
			.catch(console.error);
	}
	
	burst_id += 1;
	if(burst_id == totalBurst){
		console.log('Total burst sent. Stopping furhter bursts...');
		clearInterval(interval);
	}
}
setImmediate(burst);
var interval = setInterval(burst, 4*1000);