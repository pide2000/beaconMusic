/* was for testing purposes of socket.io doenst work at the moment*/


var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var path = require('path');


server.listen(3000);

app.get('/', function (req, res) {
	res.sendFile(path.resolve('../public/index.html'));
});

io.on('connection', function (socket) {
	socket.emit('news', { hello: 'world' });
	socket.on('my other event', function (data) {
		console.log(data);
	});
});

