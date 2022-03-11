const NTP = require('../index').Client;
var FIRST = require('../index').FIRST
//const client = new NTP('utcnist2.colorado.edu', 123, { timeout: 3000 });

var burst_id = 0

var burst = function(){
	
	for(var i = 0; i < 8; i++){
		var client = new NTP('localhost', 123,
							{ timeout: 3000 },
							burst_id=burst_id, 
							msg_id=i);
		FIRST.value = i==0 ? true : false;
		console.log(burst_id, i);
		client
			.syncTime()
			.then(response => console.log(`TIME (${burst_id}, ${i}):`, response))
			.catch(console.log);
	}
	burst_id += 1;
}

setInterval(burst, 2000);