'use strict';

var io;	
var clientSocket;

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */

exports.initGame = function(sio, socket){
	io = sio; 	//library
	clientSocket = socket; 	//connected client socket
	clientSocket.emit("connected", {message: "You are connected!"});

	// Host Events
    clientSocket.on('hostCreateNewGame', hostCreateNewGame);
    clientSocket.on('hostRoomFull', hostPrepareGame);
    clientSocket.on('hostCountdownFinished', hostStartGame);
    clientSocket.on('hostNextRound', hostNextRound);

    // Player Events
    clientSocket.on('playerJoinGame', playerJoinGame);
    clientSocket.on('playerAnswer', playerAnswer);
    clientSocket.on('playerRestart', playerRestart);

};


/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */

/**
 * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
 */
function hostCreateNewGame() {
    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());
}