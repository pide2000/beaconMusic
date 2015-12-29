var app = angular.module('StarterApp', ['ngMaterial']);


/**
 * just a beautiful wrapper to use the socket as a dependency
 */

app.factory('socket', function ($rootScope) {
	var socket = io.connect('localhost:3000/');
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		}
	};
});

/**
 * wrap the data from the beacons to be present in a scope variable
 */

app.controller('AppCtrl', ['$scope', '$mdDialog', 'socket', function($scope, $mdDialog, socket){

	var beaconDataTemplate = {
		beaconId : '',
		minFrom : '',
		maxFrom : '',
		minTo : '',
		maxTo : '',
		intervalMapping : '',
		code : ''
	};

	var self = this;
	self.intervalMapping = intervalMapping;
	self.transformPoint = transformPoint;
	self.sendMessage = sendMessage;

	function intervalMapping(minA,maxA,minB,maxB){

		var result = {
			"a": (maxB-minB)/(maxA-minA),
			"b": maxB-(maxA*(maxB-minB)/(maxA-minA))
		};

		return result;
	}

	function transformPoint(x,minA,maxA,minB,maxB){
		var intervalParams = intervalMapping(minA,maxA,minB,maxB);
		var y = intervalParams.a*x+intervalParams.b;
		return y;
	}

	socket.on('beacon', function (data) {
		$scope.beaconList = data;
	});

	function sendMessage(){
		socket.emit('test',{ my: 'data' });
	}



	}]);