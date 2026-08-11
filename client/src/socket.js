import { io } from 'socket.io-client';

// Connect to the Socket.IO server running on localhost:5000
const socket = io('http://localhost:5000');

export default socket;
