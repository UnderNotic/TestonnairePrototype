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
var players = {};
/**
 * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
 */
 function hostCreateNewGame() {
    // Create a unique Socket.IO Room
    do{
    var thisGameId = ( Math.random() * 100000 ) | 0; //  | 0 means rounding down a number
    }while(players[thisGameId] != undefined);  //make sure that this room doesnt exist


    players[thisGameId]={}; //init object that will store player answers in room

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room randomly created and wait for the players
    this.join(thisGameId.toString());
  }           

function hostStartGame(playersSockets, gameId){   // logic that randomize questions, send given number of unique questions 
  console.log("Test started!");
  console.log(playersSockets);
  sendQuestions(playersSockets, gameId);  //send a question to a player
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

    console.log("players in " + players);

    // If the room exists...
    if( room != undefined ){
      //If player with the same name in the room doesn't exist
      if(players[data.gameId][data.playerName]==undefined){
        players[data.gameId][data.playerName] = [];

        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);

        console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying everyone in room that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

      } else {
          this.emit('errors',{message: "Choose diffrent name!"} );
      }

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
  console.log('Player: ' + data.playerName + ' answered a question number :' + data.currentQuestion + ' with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    // Or check on server-side with mongodb and send to host if answer was correct

    players[data.gameId][data.playerName][data.currentQuestion]=data.answer;
    console.log("Players in playerAnswer" + players[data.gameId][data.playerName]);



    io.sockets.in(data.gameId).emit('hostStoreAnswer', data);
  }


/* *************************
   *                       *
   *      GAME LOGIC       *
   *                       *
   ************************* */


   var alreadyAnsweredQuestionsNumbers ={}; //holds info about socketid's of players and question answered
                                            //maybe join this with players object ?
  //send a question to player
  function sendQuestions(playersSockets, gameId){

    var numberOfQuestions = 4;
    var timeForQuestion = 8000; 
    var time = 0;

   // Initializing alreadyAnsweredQuestionsNumber as array in player socketId object
   for(var i = 0; i < playersSockets.length; i++){   
    alreadyAnsweredQuestionsNumbers[playersSockets[i]]=[];
    for(var j = 0; j <numberOfQuestions; j++){
      alreadyAnsweredQuestionsNumbers[playersSockets[i]][j]=j;
    }
  }


  for(var i = 0; i < numberOfQuestions; i++){

    for(var j = 0; j < playersSockets.length; j++){
      setTimeout(emitQuestion, time, playersSockets[j]);
    }
    time = time + timeForQuestion;
    //after all questions end the Game
  }
  endGame(gameId, timeForQuestion*numberOfQuestions);
} 


function emitQuestion(playerSocket){
  console.log("debug");
  var questionData = getQuestionData(playerSocket);
  console.log("Question sent!");
    io.to(playerSocket).emit('newQuestionData', questionData);  //sending question 
  }

/**
 * TODO : randomization of question(uniqueness!), user can define number of answers
 */
 function getQuestionData(playerSocket){  

// Randomize the order of the available words.
    // The first element in the randomized array will be displayed on the host screen.
    // The second element will be hidden in a list of decoys as the correct answer

    // Pick a random answer 

    var playerQuestionArray = alreadyAnsweredQuestionsNumbers[playerSocket];

    var num = Math.floor(Math.random() * playerQuestionArray.length);

    var rnd1 = parseInt(playerQuestionArray.splice(num, 1));
    
    console.log("rnd1 is " + rnd1);




    var correctAnswers = shuffle(sampleQuestions[rnd1].answers);
    correctAnswers = correctAnswers[0];

    // Randomize the order of the decoy words and choose the first 3
    var decoys = shuffle(sampleQuestions[rnd1].decoys).slice(0,3);
    // Pick a random spot in the decoy list to put the correct answer
    var rnd2 = getRandomInt(0,3); //correct
    decoys.splice(rnd2, 0, correctAnswers);   // TODO dynamic number of answers not only one
    var answers = decoys;

    // Package the words into a single object.
    var questionData = {
      questionNumber: rnd1+1,
      question: sampleQuestions[rnd1].question,
      answers: answers, // Correct Answer
    };

    console.log(questionData);

    return questionData;
  }


function endGame(gameId, wait){ //TODO TEST IN MONGODB AND CHECKING ON SERVER SIDE

  console.log("Ending game");





  setTimeout(function(){
    io.sockets.in(gameId).emit('endGame');
  },wait);




  players[gameId] = undefined; //decontructor
}





                /* **************************
                         UTILITY CODE
                         ************************** */

                         function getRandomInt(min, max) {
                          max = max+1;
                          return Math.floor(Math.random() * (max - min)) + min;
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
      decoys : [ "trata", "answer2", "answer3" ],
      answers : ["red"]
    },
    {
      question  : "Who is the BOSS?" ,
      decoys : [ "Dad", "aaaa", "ssss" ],
      answers : ["ME"]
    },
    {
      question  : "Tell me your story?" ,
      decoys : [ "secret story", "drama", "island" ],
      answers : ["Gatsby is great"]
    },
    {
      question  : "Your mother name?" ,
      decoys : [ "Alla", "Mana", "Mulka" ],
      answers : ["Elli"]
    }


    ];