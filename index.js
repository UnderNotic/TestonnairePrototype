'use strict';

// Import the Express module
var express = require('express');

// Import the 'path' module (packaged with Node.js)
var path = require('path');

// Create a new instance of Express
var app = express();

// Import the Anagrammatix game file.
var game = require('./game');


// all environments
app.use(express.static(path.join(__dirname, 'public')));
app.set('port', process.env.PORT || 3000);




// Create a Node.js based http server 
var server = app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});



// Create a Socket.IO server and attach it to the http server
var io = require('socket.io').listen(server);


// Listen for Socket.IO Connections. Once connected, start the game logic.
io.sockets.on('connection', function (socket) {
    console.log('client connected to node-server');
    game.initGame(io, socket);
    socket.on('disconnect', function(){
    console.log('client disconnected from node-server');
    //TODO client disconnected decrement numberofplayers on host, lobby and tab with connected players
  });

});