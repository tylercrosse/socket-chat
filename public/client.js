$(function() {
  //**** Vars ****//
  var $window = $(window);
  var $usernameInput = $('.usernameInput');
  var $messages = $('.messages');
  var $inputMessage = $('.inputMessage');
  var $loginPage = $('.login');
  var $chatPage = $('.chat');

  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  //**** Logic ****//
  function addParticpantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 particpant";
    } else {
      message += "there are " + data.numUsers + " particpants";
    }
    log(message);
  };

  function setUsername () {
    username = cleanInput($usernameInput.val().trim());
    console.log(username);

    if (username) {
      $loginPage.fadeOut();
      $chatPage.show()
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // tell server username
      socket.emit('add user', username);
    }
  }

  function sendMessage() {
    var message = $inputMessage.val();
    message = cleanInput(message); // prevent markup injection

    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message'
      socket.emit('new message', message);
    }
  }

  function addChatMessage(data, options) {
    //don't fade if 'is typing' showing
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username);
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  function log(message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function(){
      $(this).remove();
    });
  }

  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(150);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  function cleanInput (input) { //prevent input from having injected markup
    return $('<div/>').text(input).text();
  }

  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= 400 && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, 400);
    }
  }

  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  //**** User Input Events ****//
  $window.keydown(function (event) {
    // focus the current input when key is typed
    if (!(event.ctrlkey || event.metaKey || event.alKey)) {
      $currentInput.focus();
    }

    // when user hits ENTER on keyboard
    if (event.which === 13) {
      if(username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  })

  $inputMessage.on('input', function() {
    updateTyping();
  })

  $loginPage.click(function () {
    $currentInput.focus();
  });

  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  //**** Socket Events ****//
  socket.on('login', function (data) {
    connected = true;
    // display welcome message
    var message = "welcome to Socket.IO Chat - ";
    log(message, {
      prepend: true
    });
    addParticpantsMessage(data);
  });

  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticpantsMessage(data);
  });

  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticpantsMessage(data);
    removeChatTyping(data);
  });

  socket.on('new message', function (data) {
    console.log('client '+ data);
    addChatMessage(data);
  });

});
