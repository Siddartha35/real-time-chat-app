// Mongoose model for chat messages
// This file defines the structure (schema) of a Message and exports the
// model so the rest of the app can create, read, and query messages.

const mongoose = require('mongoose');

// A Schema defines the shape of documents within a MongoDB collection.
// It is like a blueprint for the data: which fields exist, their types,
// and validation rules.
const MessageSchema = new mongoose.Schema({
  // The room name where the message was sent
  room: { type: String, required: true },

  // The display name of the sender
  author: { type: String, required: true },

  // The message text
  message: { type: String, required: true },

  // When the message was created. Defaults to now if not provided.
  timestamp: { type: Date, default: Date.now },
});

// A Model is a class with which we construct documents. It provides
// an interface to the database (save, find, update, delete). We export
// the model so other modules can interact with the `messages` collection.
const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;

/*
Beginner notes:
- Schema: defines which fields a Message has and their types.
- Model: a programmatic way to create and query documents in MongoDB.
- `required: true`: ensures the field must be present when saving a message.
  This helps maintain data integrity (no messages without an author or room).
*/
