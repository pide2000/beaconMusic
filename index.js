var noble = require('noble');
var urldecode = require('./urldecode.js');
var open = require('open');


noble.on('stateChange', function(state) {

  if (state === 'poweredOn') {
    noble.startScanning(['feaa'],false);

    /**
    * Use this Command to allow duplicates.
    * This means, the beacon will be detected everytime it broadcasts the data
    * noble.startScanning(['feaa'],true);
    **/

  } else {
    noble.stopScanning();
  }

});

noble.on('scanStart', function() {

  console.log('Scan started...');

});

noble.on('scanStop', function() {

  console.log('Scan stopped...');
  console.log();

});

noble.on('discover', function(peripheral) {

  var serviceData = peripheral.advertisement.serviceData;

  console.log("Peripherial");
  console.log(peripheral);

  if (serviceData && serviceData.length) {
    var objects = [];
    for (var i in serviceData) {
      // check if Eddystone-URL
      if (serviceData[i].data.toString('hex').substr(0,2) === '10') {
        var url = urldecode(serviceData[i].data.toString('hex'));
        console.log(serviceData[i].data.toString('hex'));
        console.log(url);
      }
    }
  }
});