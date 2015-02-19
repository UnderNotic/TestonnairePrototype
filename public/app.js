jQuery(function($){   
    'use strict';


    /**
     * All the code relevant to Socket.IO is collected in the IO namespace.
     *
     */
     var IO = {
        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
         init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
         bindEvents : function() {
            IO.socket.on('connected', IO.onConnected );
            IO.socket.on('newGameCreated', IO.onNewGameCreated );
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );
            IO.socket.on('newQuestionData', IO.onNewQuestionData);
            IO.socket.on('hostStoreAnswer', IO.hostStoreAnswer);
            IO.socket.on('endGame', IO.endGame);
            IO.socket.on('errors', IO.error );
        },

        /**
         * The client is successfully connected!
         */
         onConnected : function(data) {
             // Cache a copy of the client's socket.IO session ID on the App
             App.mySocketId = IO.socket.io.engine.id;
            //console.log("Hello!");
            console.log(data.message);
        },

        /**
         * A new game has been created and a random game ID has been generated.
         * @param data {{ gameId: int, mySocketId: * }}
         */
         onNewGameCreated : function(data) {
            App.Host.gameInit(data);
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
         playerJoinedRoom : function(data) {
            // When a player joins a room, do the updateWaitingScreen function.
            // There are two versions of this function: one for the 'host' and
            // another for the 'player'.
            //
            // So on the 'host' browser window, the App.Host.updateWiatingScreen function is called.
            // And on the player's browser, App.Player.updateWaitingScreen is called.
            App[App.myRole].updateWaitingScreen(data);
        },


        /**
         * A new set of words for the round is returned from the server.
         * @param data
         */
         onNewQuestionData : function(data) {
            // Update the current question
            App.Player.currentQuestion = data.questionNumber;

            // Change the question for the Player
            App[App.myRole].newQuestion(data);
        },

        /**
         * A player answered. If this is the host, check the answer.
         * @param data
         */
         hostStoreAnswer : function(data) { //check answers after all the game played out
            if(App.myRole === 'Host') {
                App.Host.storeAnswer(data);  
            }
        },

        /**
         * Let everyone know the game has ended.
         * @param data
         */
        endGame : function(data) {   //TODO implement this in game.js
            App[App.myRole].endGame(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
         error : function(data) {
            alert(data.message);
        }
    };

    var App = {

        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
         gameId: 0,


         mySocketId: 0,

         /**
         * This is used to differentiate between 'Host' and 'Player' browsers.
         */
        myRole: '',   // 'Player' or 'Host'

        /*Just simple number of question displayed on player and host side*/
        numberOfQuestion: 0,



        /* *************************************
         *                Setup                *
         * *********************************** */
        /**
         * This runs when the page initially loads.
         */
         init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },


        /**
         * Create references to on-screen elements used throughout the game.
         */
         cacheElements: function () {
            App.$doc = $(document);   //Document DOM

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateGenerateTest = $('#generate-test-template').html();
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$templateNewGame = $('#create-game-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
            App.$hostGame = $('#host-game-template').html();
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
         bindEvents: function () {
            // Host
            App.$doc.on('click', '#btnGenTest', App.Host.onGenerateClick);
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);
            App.$doc.on('click', '#btnStartGame', App.Host.onStartClick);
            // Player
            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnJoinRoom',App.Player.onPlayerJoinRoomClick);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnGameAlreadyStarted', App.Player.onGameAlreadyStarted); //cant join beacause game already started
        },


        /* *************************************
         *             Game Logic              *
         * *********************************** */

        /**
         * Show the initial Anagrammatix Title Screen
         * (with Start and Join buttons)
         */
         showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },

         /* *******************************
           *         HOST CODE           *
           ******************************* */
           Host : {

            /**
             * Contains player data: socketid, name, question and answers
             */
             players : {},

             /*Constains players sockedId*/
             playersSocketId: [],


            questions: [], //constains generated questions
            /**
             * Keep track of the number of players that have joined the game.
             */
             numPlayersInRoom: 0,

            /**
             * A reference to the correct answer for the current round.
             */
             currentCorrectAnswer: '',



             onGenerateClick: function () {
                App.$gameArea.html(App.$templateGenerateTest);
           
                    var $question = $("<div/>").append(
                    $("<input/>", {
                        type: 'text',
                        id: 'question1',
                        name: 'question',
                        placeholder: 'Wpisz pytanie',
                        width: '90%',
                    }).css({"color": "red", "font-weight": "400"}),

                    $("<br>"),
                    $("<br>"),
                    $("<input/>", {
                        type: 'text',
                        id: 'answer1',
                        name: 'answer',
                        placeholder: 'prawidłowa odpowiedź',
                        width: '80%'
                    }).css({"color": "#3DA617", "font-weight": "500"}),
                    $("<br>"),
                    $("<input/>", {
                        type: 'text',
                        id: 'decoy1',
                        name: 'answer',
                        placeholder: 'błędna odpowiedź',
                        width: '80%',
                        margin: '54px'
                    }),
                     $("<br>"),
                    $("<input/>", {
                        type: 'text',
                        id: 'decoy2',
                        name: 'answer',
                        placeholder: 'błędna odpowiedź',
                        width: '80%'
                    }),
                     $("<br>"),
                    $("<input/>", {
                        type: 'text',
                        id: 'decoy3',
                        name: 'answer',
                        placeholder: 'błędna odpowiedź',
                        width: '80%'
                    }),
                     $("<br>")     
                    );


                $('#questions').append($question);
                   
                  




                
                var question;
                    $("#btnCreateQuestion").click(function(){
                        if($.trim($('#question1').val()) == '' || $.trim($('#decoy1').val()) == '' || $.trim($('#decoy2').val()) == '' || $.trim($('#decoy3').val()) == '' || $.trim($('#answer1').val()) == ''){
                            alert("You must fill all inputs!");
                        }
                        else{
                            question = {
                                question  : $("#question1").val() ,
                                decoys : [$("#decoy1").val(), $("#decoy2").val(), $("#decoy3").val()],
                                answers : [$("#answer1").val()]
                            };

                            App.Host.questions.push(question);
                            $("input[type=text], textarea").val(""); // clear Screen

                        var num = App.Host.questions.length;
                    $("#numOfQuestions").append($('<option>', {
                        value: num,
                        text: num
                    }));

                        }
                    });






            },


             /**
             * Handler for the "Start" button on the Title Screen.
             */
             onCreateClick: function () {
                // console.log('Clicked "Create A Game"');

               var timeForQuestion = $( "#timeForQuestion" ).val();
               var numOfQuestions = $( "#numOfQuestions" ).val();

                IO.socket.emit('hostCreateNewGame', App.Host.questions, timeForQuestion, numOfQuestions);
            },

            onStartClick: function(){
                if(App.Host.numPlayersInRoom===0)
                {
                    alert("You can NOT start the game without players");
                }
                else{
                    console.log("Game started!");
                App[App.myRole].gameCountdown();   // starting game countdown!
            }
        },

            /**
             * The Host screen is displayed for the first time.
             * @param data{{ gameId: int, mySocketId: * }}
             */
             gameInit: function (data) {
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                App.myRole = 'Host';
                App.Host.numPlayersInRoom = 0;

                App.Host.displayNewGameScreen();
                // console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
            },

            /**
             * Show the Host screen containing the game URL and unique game ID
             */
             displayNewGameScreen : function() {
                // Fill the game screen with the appropriate HTML
                App.$gameArea.html(App.$templateNewGame);

                // Display the URL on screen
                $('#gameURL').text(window.location.href);
                App.doTextFit('#gameURL');


                // Show the gameId / room id on screen
                $('#spanNewGameCode').text(App.gameId);
            },

            /**
             * Update the Host screen when the player joins
             * @param data{{playerName: string}}
             */
             updateWaitingScreen: function(data) {
                App.Host.numPlayersInRoom++;
                
                //data.mySocketId

                // Update host screen
                $('#playersWaiting')
                .append('<p/>')
                .text('Gracz ' + data.playerName + ' dołączył!');

                //Init tab with player answers and questions
                App.Host.players[data.playerName] = [];
                App.Host.players[data.playerName][0] = data.mySocketId; //maybe some kind of authentication security method?
                App.Host.playersSocketId.push(data.mySocketId);



                // If button clicked START THE GAME!
                
            },

            gameCountdown : function(){

                 // Prepare the game screen with new HTML
                 //hmmmm maybe ongoing question and current points
                 //show result after all
                 App.$gameArea.html(App.$hostGame);

                // Begin the on-screen countdown timer
                var $secondsLeft = $('#hostWord');
                App.countDown( $secondsLeft, 5, function(){
                    IO.socket.emit('hostCountdownFinished', App.Host.playersSocketId, App.gameId, App.Host.questions);
                    $secondsLeft.text('Game Started!');
                });

            },

            /**
             * Show the word for the current round on screen.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            newQuestion : function(data) { //TODo

                //get question id for specific user and show it in lobby
            },


            /**
             * Check the answer clicked by a player.
             * @param data{{round: *, playerId: *, answer: *, gameId: *}}
             */
             storeAnswer : function(data) {

                var currentQuestion = data.currentQuestion;
                var answer = data.answer;
                var playerName = data.playerName;
                
                //creating hashmap collection with question number and answer binded with playername object
                App.Host.players[playerName][currentQuestion]=answer;

                console.log(App.Host.players);


            },


            endGame : function(data) {

                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.isNewGame = true;

                var $results = $('<ul/>');

                // Insert a answers item for each word in the word answers
                // received from the server.
                console.log(data);

                for(var player in data){
                    console.log(player);

                    $results                               
                    .append( $('<li/>')             
                        .html(player)                               
                        .append( $('<li/>')             
                            .html(" correct answers: " + data[player]["correctCount"])                             
                            .append( $('<li/>')             
                                .html(" incorrect answers:" + data[player]["inCorrectCount"])           
                                )));
                }
                
                $('#gameArea').html($results);
            }
        },

        /* *****************************
           *        PLAYER CODE        *
           ***************************** */

           Player : {

            /**
             * A reference to the socket ID of the Host
             */
             hostSocketId: '',

            /**
             * The player's name entered on the 'Join' screen.
             */
             myName: '',

             /*Question id that player is currently giving answer to*/
             currentQuestion: 0,


            /**
             * Click handler for the 'JOIN' button
             */
             onJoinClick: function () {
                // console.log('Clicked "Join A Game"');

                // Display the Join Game HTML on the player's screen.
                App.$gameArea.html(App.$templateJoinGame);



            },


            onPlayerJoinRoomClick: function () {
                console.log('Player clicked "Join Room"');
                     // collect data to send to the server

                     var data = {
                        gameId : +($('#inputGameId').val()),
                        playerName : $('#inputPlayerName').val() || 'anonymous'
                    };

                // Send the gameId and playerName to the server
                IO.socket.emit('playerJoinGame', data);
                // Set the appropriate properties for the current player.
                App.myRole = 'Player';
                App.Player.myName = data.playerName;


            },

            onPlayerAnswerClick: function() {
                // console.log('Clicked Answer Button');
                var $btn = $(this);      // the tapped button
                var answer = $btn.val(); // The tapped word

                // Send tapped answers to the server
                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    playerName: App.Player.myName,
                    answer: answer,
                    currentQuestion: App.Player.currentQuestion
                };
                IO.socket.emit('playerAnswer',data);
            },

            updateWaitingScreen : function(data) {
                if(IO.socket.io.engine.id === data.mySocketId){
                    App.myRole = 'Player';
                    App.gameId = data.gameId;

                    $('#btnJoinRoom').attr("disabled", true);
                    $('#playerWaitingMessage')
                    .append('<p/>')
                    .text('Dołączono do gry ' + data.gameId + '. Czekaj na rozpoczęcie gry.');
                }
            },


            gameCountdown : function(){

                $('#gameArea')
                .html('<div class="gameOver">Get Ready!</div>');


            },

            newQuestion : function(data) {

                // Create an unordered list element
                var $answers = $('<ul/>').attr('id','ulAnswers');

                $answers.append( $('<li/>').addClass('question') .html(data.question));


                // Insert a answers item for each word in the word answers
                // received from the server.
                $.each(data.answers, function(){
                    $answers                                //  <ul> </ul>
                        .append( $('<li/>')              //  <ul> <li> </li> </ul>
                            .append( $('<button/>')      //  <ul> <li> <button> </button> </li> </ul>
                                .addClass('btnAnswer')   //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .addClass('btn')         //  <ul> <li> <button class='btnAnswer'> </button> </li> </ul>
                                .val(this)               //  <ul> <li> <button class='btnAnswer' value='word'> </button> </li> </ul>
                                .html(this)              //  <ul> <li> <button class='btnAnswer' value='word'>word</button> </li> </ul>
                                )
                            );
                    });

                // Insert onto the screen.
                $('#gameArea').html($answers);
            },



            /**
             * Show the "Game Over" screen.
             */
             endGame : function(data) {
                $('#gameArea')
                .html('<div class="gameOver">Game Over!</div>');
            }
        },




                 /* **************************
                  UTILITY CODE
                  ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
         countDown : function( $el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#hostWord');

            // console.log('Starting Countdown...');

            // Start a 1 second timer
            var timer = setInterval(countItDown,1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#hostWord');

                if( startTime <= 0 ){
                    // console.log('Countdown Finished.');

                    // Stop the timer and do the callback.
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
         doTextFit : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
                );
        }
    };

    IO.init();
    App.init();





}($));