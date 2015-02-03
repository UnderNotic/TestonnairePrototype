'use strict';


//declaring global variables
var io;	
var gameSocket;

/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */

exports.initGame = function(sio, socket){
	io = sio; 	//library
	gameSocket = socket; 	//connected client socket
	gameSocket.emit("connected", {message: "You are connected!"});  

	// Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);


    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);

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
    var thisGameId = ( Math.random() * 100000 ) | 0; //  | 0 means rounding down a number

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room randomly created and wait for the players
    this.join(thisGameId.toString());
}           

function hostStartGame(gameId){   // logic that randomize questions, send given number of unique questions 
  console.log("Test started!");
  sendQuestion(gameId);  //send a question to a player
}    



/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

/**
 * A player clicked the 'JOIN GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */

 function playerJoinGame(data) {
    console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    var room = gameSocket.adapter.rooms[data.gameId];

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);

        console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying everyone in room that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        this.emit('errors',{message: "This room does not exist."} );
    }
}

/**
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    console.log('Player ID: ' + data.playerId + ' answered a question number :' + data.currentQuestion + ' with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    // Or check on server-side with mongodb and send to host if answer was correct

    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}



/* *************************
   *                       *
   *      GAME LOGIC       *
   *                       *
   ************************* */


  //send a question to player
   function sendQuestion(gameId){
    var questionData = getQuestionData();
    //DELAY ??

    io.sockets.in(data.gameId).emit('newQuestionData', questionData);  //sending question 
   }

/**
 * TODO : randomization of question(uniquness!), user can define number of answers
 */
   function getQuestionData(){  

// Randomize the order of the available words.
    // The first element in the randomized array will be displayed on the host screen.
    // The second element will be hidden in a list of decoys as the correct answer

    var i = 0;
    var correctAnswers = shuffle(sampleQuestions[i].answer);

    // Randomize the order of the decoy words and choose the first 3
    var decoys = shuffle(sampleQuestions[i].decoys).slice(0,3);

    // Pick a random spot in the decoy list to put the correct answer
    var rnd = Math.floor(Math.random() * 4); //correct
    var answers =decoys.splice(rnd, 0, answers[0]);   // TODO dynamic number of answers not only one

    // Package the words into a single object.
    var questionData = {
        questionNumber: i+1,
        question: sampleQuestions[i].question,
        answers: answers, // Correct Answer
    };

    return questionData;
   }

/*
 * Javascript implementation of Fisher-Yates shuffle algorithm
 * http://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-array
 */
function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}





   var sampleQuestions = [

    {
        question  : "What colour is red car?" ,
        decoys : [ "trata, answer2, answer3" ],
        answers : ["red"]
    },
   ];