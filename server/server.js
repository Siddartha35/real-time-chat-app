// Simple Express + Socket.IO server for a beginner-friendly chat app
// - Starts on port 5000
// - Root route at / returns 'Server running'
// - Handles Socket.IO connections, joining rooms, and room-only messaging

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Message = require('./models/Message');
const mongoose = require('mongoose');

const app = express();

// Allow cross-origin requests (useful during development)
app.use(cors());

// Root route to verify the server is running
app.get('/', (req, res) => {
  res.send('Server running');
});

// Create an HTTP server and attach Socket.IO to it
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // allow all origins for simplicity (adjust in production)
  },
});

// Listen for client connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room. The client should send the room id/name.
  // Example: socket.emit('join_room', 'room1')
  socket.on('join_room', async (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);

    // Load the recent chat history for this room after joining.
    // We do this after joining the room so the user is already part of the
    // room and can receive room-specific messages.
    try {
      const history = await Message.find({ room })
        .sort({ timestamp: 1 }) // oldest first so the chat appears in time order
        .limit(50);

      // Emit the chat history only to the joining socket. We don't broadcast
      // it to the whole room because only the new user needs to receive past
      // messages; other users already have their own history or live messages.
      socket.emit('chat_history', history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  });

  // Handle sending messages to a room. The client should send an object
  // containing at least a `room` property so we know where to emit.
  // Example data: { room: 'room1', author: 'Alice', message: 'Hello' }
  socket.on('send_message', async (data) => {
    const { room } = data || {};
    if (!room) return;

    // Create a new Message document. We await the save so we are sure the
    // message is stored in the database before telling clients about it.
    // Awaiting ensures the database write has completed and gives us the
    // saved document (with any DB-generated fields like `_id`).
    try {
      const msg = new Message({
        room: data.room,
        author: data.author,
        message: data.message,
        // Use provided timestamp if present (client), otherwise use now
        timestamp: data.timestamp ? new Date(data.timestamp) : Date.now(),
      });

      const saved = await msg.save();
      console.log('Message saved');

      // Broadcast the saved message to the room. We broadcast after saving
      // so that clients receive the authoritative record (including DB id
      // and confirmed timestamp). Broadcasting after save avoids races and
      // ensures all clients can rely on the server as the single source of
      // truth.
      io.to(room).emit('receive_message', {
        id: data.id, // preserve client-generated id so clients can match
        clientId: data.clientId,
        room: saved.room,
        author: saved.author,
        message: saved.message,
        timestamp: saved.timestamp,
        _id: saved._id,
      });
    } catch (err) {
      // Try/catch is important because database operations can fail (e.g.
      // if MongoDB is down). We log errors so developers can debug and we
      // avoid crashing the whole server process.
      console.error('Failed to save message to MongoDB:', err);
      // Even if save failed, we may choose NOT to broadcast the message.
      // Alternatively, you could broadcast with an "unsaved" flag. For
      // simplicity we skip broadcasting on failure.
    }
  });

  // Log disconnections
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Database connection URI
// - 127.0.0.1 is the loopback address (your local machine)
// - 27017 is the default port MongoDB listens on
// - chatapp is the database name we will use to store messages
const MONGO_URI = 'mongodb://127.0.0.1:27017/chatapp';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before starting the server.
// We connect here when the server starts so the rest of the app (models,
// request handlers, socket events) can rely on a working database connection.
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Start the HTTP + Socket.IO server after a successful DB connection
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    // Log connection errors for debugging. In production you might want to
    // retry the connection or exit the process depending on your needs.
    console.error('MongoDB connection error:', err);
    // Still start the server so non-database features can run if desired.
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} (MongoDB failed to connect)`);
    });
  });
