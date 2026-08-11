const { io } = require('../client/node_modules/socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('connected to server');
  socket.emit('join_room', 'java');
  socket.emit('send_message', {
    id: 'script_' + Date.now(),
    clientId: 'script',
    room: 'java',
    author: 'script',
    message: 'persistent test',
    timestamp: new Date().toISOString(),
  });

  // Give the server a short moment to receive/save the message, then exit
  setTimeout(() => {
    socket.close();
    process.exit(0);
  }, 800);
});
