import React, { useState, useEffect, useRef } from 'react';
import socket from './socket';

// Modernized chat UI with username, timestamps, bubbles, and duplicate prevention
export default function App() {
  // Room and username
  const [room, setRoom] = useState('');
  const [username, setUsername] = useState('');

  // Message input and list of messages
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  // Track whether we've joined a room to show the header
  const [joined, setJoined] = useState(false);

  // A stable unique id for this client to avoid duplicate rendering.
  // We use `useRef` so the id stays the same across re-renders — unlike a
  // plain variable which would be recalculated on every render.
  const clientIdRef = useRef(`cid_${Math.random().toString(36).slice(2, 9)}`);

  // Refs for scrolling and focusing DOM nodes. `useRef` stores a mutable
  // value that persists across renders and is commonly used to access DOM
  // elements (like focusing an input or scrolling a container).
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Helper: format ISO timestamp to a human time string
  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Join a room on the server and remember that we joined
  const joinRoom = () => {
    if (!room) return alert('Please enter a room name');
    if (!username) return alert('Please enter a username');
    socket.emit('join_room', room);
    setJoined(true);
    setMessages([]); // clear old messages for clarity
    // Focus the message input after joining
    setTimeout(() => messageInputRef.current?.focus(), 100);
  };

  // Send a message to the current room.
  // We include a unique `id`, `author`, and `timestamp` in the payload so the
  // server can broadcast the same object back to ALL clients (including us).
  // Important: we DO NOT add the message to local state here. We rely on the
  // server broadcast as the single source of truth to avoid duplicate rendering
  // and to ensure consistent ordering across clients.
  const sendMessage = () => {
    if (!joined) return alert('Join a room first');
    if (!message) return; // ignore empty messages

    const id = `${clientIdRef.current}_${Date.now()}`; // unique message id
    const payload = {
      id,
      clientId: clientIdRef.current,
      room,
      author: username || 'Anonymous',
      message,
      timestamp: new Date().toISOString(),
    };

    // Emit to server and wait for the server to broadcast the message back.
    socket.emit('send_message', payload);
    setMessage('');
  };

  useEffect(() => {
    // Load old messages when joining a room
    socket.on('chat_history', (history) => {
      setMessages(history);
    });

    // Receive new real-time messages
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Cleanup listeners when component re-renders
    return () => {
      socket.off('chat_history');
      socket.off('receive_message');
    };
  }, []);

  // Auto-scroll to the latest message when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inline styles (responsive, simple WhatsApp/Discord-inspired look)
  const styles = {
    app: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f3f4f6',
      height: '100vh',
      padding: 12,
      boxSizing: 'border-box',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    container: {
      width: '100%',
      maxWidth: 960,
      height: '100%',
      maxHeight: 900,
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(2,6,23,0.08)',
    },
    header: {
      background: '#0f1724',
      color: '#fff',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 16, fontWeight: 600 },
    topControls: {
      display: 'flex',
      gap: 8,
      padding: 12,
      alignItems: 'center',
      borderBottom: '1px solid #eee',
      background: '#fbfbfb',
    },
    input: {
      padding: '10px 12px',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      fontSize: 14,
      outline: 'none',
    },
    joinButton: {
      padding: '10px 14px',
      borderRadius: 8,
      background: '#0ea5a4',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
    },
    chatArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: 12,
      gap: 12,
      background: '#f7fafc',
      overflow: 'hidden',
    },
    messagesList: {
      flex: 1,
      overflowY: 'auto',
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
    bubble: {
      maxWidth: '75%',
      padding: '10px 12px',
      borderRadius: 12,
      wordBreak: 'break-word',
      boxShadow: '0 2px 6px rgba(2,6,23,0.04)',
    },
    inputRow: {
      display: 'flex',
      gap: 8,
      padding: 12,
      borderTop: '1px solid #eee',
      background: '#fff',
    },
    sendButton: {
      padding: '10px 14px',
      borderRadius: 8,
      background: '#2563eb',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 600,
    },
    meta: { fontSize: 11, color: '#6b7280', marginTop: 6 },
  };

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        {/* Dark header showing room name when joined */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>{joined ? `Room: ${room}` : 'Not joined'}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{joined ? username : ''}</div>
        </div>

        {/* Top controls: username and room inputs */}
        <div style={styles.topControls}>
          <input
            style={{ ...styles.input, width: 180 }}
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button style={styles.joinButton} onClick={joinRoom}>
            Join Room
          </button>
        </div>

        {/* Main chat area */}
        <div style={styles.chatArea}>
          <div style={styles.messagesList}>
            {messages.map((m) => {
              // Determine if this message was sent by this user by comparing
              // the message `author` to the current `username`. This allows
              // us to align and style messages differently without relying
              // on client-side `self` flags.
              const isSelf = m.author === username;
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isSelf ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      ...styles.bubble,
                      background: isSelf ? '#dcfce7' : '#fff',
                      border: isSelf ? '1px solid #86efac' : '1px solid #e6e6e6',
                      borderTopRightRadius: isSelf ? 4 : 12,
                      borderTopLeftRadius: isSelf ? 12 : 4,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isSelf ? 'You' : m.author}
                    </div>
                    <div style={{ fontSize: 14 }}>{m.message}</div>
                    <div style={styles.meta}>{formatTime(m.timestamp)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div style={styles.inputRow}>
            <input
              ref={messageInputRef}
              style={{ ...styles.input, flex: 1 }}
              placeholder={joined ? 'Type a message...' : 'Join a room to chat'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              disabled={!joined}
            />
            <button style={styles.sendButton} onClick={sendMessage} disabled={!joined}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
