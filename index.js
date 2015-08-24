var noble = require('noble');
var urldecode = require('./urldecode.js');
var open = require('open');


noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning(['feaa'],false);
  } else {
    noble.stopScanning();
  }
});

noble.on('scanStart', function() {
  console.log('Scan started...');
  console.log();
});

noble.on('scanStop', function() {
  console.log('Scan stopped...');
  console.log();
});

noble.on('discover', function(peripheral) {
  var serviceData = peripheral.advertisement.serviceData;
  console.log(peripheral);
  if (serviceData && serviceData.length) {
    var objects = [];
    for (var i in serviceData) {
      // check if Eddystone-URL
      if (serviceData[i].data.toString('hex').substr(0,2) === '10') {
        var url = urldecode(serviceData[i].data.toString('hex'));
        console.log(serviceData[i].data.toString('hex'));

      }
    }
  }
});