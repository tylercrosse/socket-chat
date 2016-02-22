var fs         = require('fs'); // node file I/O
var path       = require('path'); // handles/transforms file paths
var express    = require('express'); // web framework
var app        = express();
var http       = require('http').Server(app);
var io         = require('socket.io')(http);

//**** Middleware ****//
app.use(express.static(__dirname + '/public'));

//**** Chatroom ****//
var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // listen for client to emit 'new message'
  socket.on('new message', function(data) {
    console.log(data);
    // tell client to execute 'new message'
    socket.broadcast.emit('new message', {
      uername: socket.username,
      message: data
    });
  });

  // listen for client to emit 'add user'
  socket.on('add user', function (username) {
    if (addedUser) return;

    // store username in socket session for this client
    socket.username = username;
    ++numUsers
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo to all clients that person addedUser
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // listen for 'typing', broadcast to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // listen for 'stop typing', broadcast to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // listen for disconnect, execute function
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo to all clients this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

});

//**** Express HTTP server ****//
var port = process.env.PORT || 3000;

http.listen(port, function () {
  console.log('Server listening at port %d', port);
});
