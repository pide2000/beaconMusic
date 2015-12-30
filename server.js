/**
 * The Data about beacons is hold in discoveredbeacons and discovereddata arrays.
 */
var https = require('http');
var noble = require('noble');
var urldecode = require('./libs/urldecode.js');
var open = require('open');
var express = require('express');
var osc = require('node-osc');
var path = require('path');

var discoveredData = new Object();
var app = express();

var discoveredBeacons = [];
var isCheckBeaconDataRunning = false;

var CHECK_BKN_DATA_INTERVAL = 200; // milliseconds
var EXIT_GRACE_PERIOD = 4000; // milliseconds
var RSSI_THRESHOLD = -90;
var MAKEMUSIC = false;

if(MAKEMUSIC){
	var client = new osc.Client('localhost', 4557);
}

//start the express js app at port 3000
var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Example app listening at http://%s:%s', host, port);

});

var io = require('socket.io')(server);

io.on('connection', function (socket) {
	socket.on('test', function (data) {
		console.log(data);
	});
});


// express.js config
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname,'/public/index.html'));
});

//return a list of all discovered beacons
app.get('/beaconList', function (req, res) {
	res.json(discoveredData);
});


//return information of a specific beacon
app.get('/beaconInformation', function (req, res) {
	jsonObject = '{"sender":' + JSON.stringify(discoveredData[req.query.id].url) + ',"receiver":"12345","action":1,"firstSeenTime":' + discoveredData[req.query.id].firstSeen + '}';
	doPostCall(jsonObject);
	res.send(discoveredData[req.query.id]);

});

//disable noble when ble is disabled
noble.on('stateChange', function (state) {
	if (state === 'poweredOn') {
		noble.startScanning([], true);
	} else {
		noble.stopScanning();
	}
});


//when scan starts print something
noble.on('scanStart', function () {
	console.log('Scan started...');
	console.log();
});


//when scan stops print something
noble.on('scanStop', function () {
	console.log('Scan stopped...');
	console.log();
});


noble.on('discover', function (peripheral) {

	var id = peripheral.id;

	if (!discoveredBeacons[id]) {
		console.log("Beacon " + peripheral.advertisement.localName +  " with id " + peripheral.uuid +  " entered. RSSI: " + peripheral.rssi);
		discoveredBeacons[id] = peripheral;
		discoveredBeacons[id].firstSeen = Date.now();
	}

	discoveredBeacons[id].lastSeen = Date.now();

	//if continous check is disabled start it
	if (!isCheckBeaconDataRunning) {
		checkBeaconData();
		checkBeaconAvailable();
	}

});

//check every x seconds beacon data
function checkBeaconData() {

	isCheckBeaconDataRunning = true;

	setInterval(function () {
		for (var id in discoveredBeacons) {
			updatePeripherialData(discoveredBeacons[id]);
		}
	}, CHECK_BKN_DATA_INTERVAL);

}


function checkBeaconAvailable() {

	setInterval(function() {
		//check if beacon data is available.
		for (var id in discoveredBeacons) {
			if (discoveredBeacons[id].lastSeen < (Date.now() - EXIT_GRACE_PERIOD)) {
				console.log('"' + discoveredBeacons[id].advertisement.localName + '" exited (RSSI ' + discoveredBeacons[id].rssi + ') ' + new Date());
				delete discoveredBeacons[id];
				delete discoveredData[id];
			}
		}
	}, EXIT_GRACE_PERIOD / 2);

}

//Here we want to hold a number of datas to each beacon. The Beacon Data Array is the working array, which will be used for information
// retrieval from beacons
function updatePeripherialData(peripherial) {

	var peripherialID = peripherial.id;
	if (!discoveredData[peripherialID]) {
		discoveredData[peripherialID] = new Object();
		discoveredData[peripherialID].firstSeen = Date.now();
	}

	discoveredData[peripherialID].rssi = JSON.stringify(peripherial.rssi);

	var sound = (discoveredData[peripherialID].rssi*-1)+10;

	if(MAKEMUSIC){
		client.send('/run-code', 'SONIC_PI_CLI', 'play ' + sound);
	}



	//here we check if a beacons is going out of range during scan

	if (discoveredData[peripherial.id].rssi < RSSI_THRESHOLD) {
		console.log("Beacon " + peripherial.advertisement.localName + " exited because of a threshold missmatch rssi is: " + discoveredData[peripherial.id].rssi);

		delete discoveredData[peripherial.id];
	} else {
		extractPeripherialData(peripherial);
	}

	io.sockets.emit('beacon', {beaconList:discoveredData});

}

function extractPeripherialData(peripherial) {

	var advertisement = peripherial.advertisement;
	var serviceData = advertisement.serviceData;

	if (serviceData && serviceData.length) {
		//getManufacturer in noble called localName

		discoveredData[peripherial.id].manufacturer = advertisement.localName;

		for (var i in serviceData) {

			//check for eddystone url 0x10
			if (serviceData[i].data.toString('hex').substr(0, 2) === '10') {
				discoveredData[peripherial.id].url = urldecode(serviceData[i].data.toString('hex'));
			}

			//check for eddystone uuid 0x00
			else if ((serviceData[i].data.toString('hex').substr(0, 2) === '00')) {
				discoveredData[peripherial.id].uuid = serviceData[i].data.toString('hex');
			}

			// check for telemetry data 0x20
			else if ((serviceData[i].data.toString('hex').substr(0, 2) === '20')) {
				discoveredData[peripherial.id].tel = serviceData[i].data.toString('hex');
				;
			}
		}
	}

}


function doPostCall(jsonObject) {

	/**
	 * HOW TO Make an HTTP Call - POST
	 */

// prepare the header
	var postheaders = {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(jsonObject, 'utf8')
	};

// the post options
	var optionspost = {
		host: 'jenkins3.intern.punkt.de',
		port: 8080,
		path: '/tpw/logs/add',
		method: 'POST',
		headers: postheaders
	};

	console.info('Options prepared:');
	console.info(optionspost);
	console.info('Do the POST call');

// do the POST call
	var reqPost = https.request(optionspost, function (res) {
		console.log("statusCode: ", res.statusCode);
		// uncomment it for header details
//  console.log("headers: ", res.headers);

		res.on('data', function (d) {
			console.info('POST result:\n');
			process.stdout.write(d);
			console.info('\n\nPOST completed');
		});
	});

// write the json data
	console.log(jsonObject);
	reqPost.write(jsonObject);
	reqPost.end();
	reqPost.on('error', function (e) {
		console.error(e);
	});

}