// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' })); // allow file payloads
app.use(express.static(path.join(__dirname, 'public')));

// In-memory stores (for demo)
const users = {}; // socketId -> { username, id, currentRoom }
const messages = {}; // room -> [messages]
const typingUsers = {}; // room -> { socketId: username }
const unreadCounts = {}; // userId -> { roomId: count }

// Utility to get messages with pagination
const getMessagesForRoom = (room, page = 1, pageSize = 20) => {
  const all = messages[room] || [];
  const start = Math.max(0, all.length - page * pageSize);
  const end = all.length - (page - 1) * pageSize;
  return all.slice(start, end);
};

// When a socket connects
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // Provide server-side ack for client version check
  socket.on('ping_server', (_, cb) => {
    if (cb) cb({ ok: true, time: new Date().toISOString() });
  });

  // user joins app (username)
  socket.on('user_join', ({ username, room } = {}) => {
    users[socket.id] = { username, id: socket.id, currentRoom: room || 'global' };

    // join requested room
    const targetRoom = room || 'global';
    socket.join(targetRoom);

    // inform others
    io.to(targetRoom).emit('user_list', Object.values(users).filter(u => u.currentRoom === targetRoom));
    io.to(targetRoom).emit('user_joined', { username, id: socket.id, room: targetRoom });

    // send last messages for that room (initial page=1)
    const recent = getMessagesForRoom(targetRoom, 1, 50);
    socket.emit('initial_messages', { room: targetRoom, messages: recent });

    console.log(`${username} joined ${targetRoom}`);
  });

  // change rooms
  socket.on('change_room', ({ newRoom }) => {
    const oldRoom = users[socket.id]?.currentRoom || 'global';
    socket.leave(oldRoom);
    socket.join(newRoom);
    if (users[socket.id]) {
      users[socket.id].currentRoom = newRoom;
    }
    io.to(oldRoom).emit('user_list', Object.values(users).filter(u => u.currentRoom === oldRoom));
    io.to(newRoom).emit('user_list', Object.values(users).filter(u => u.currentRoom === newRoom));
    io.to(newRoom).emit('user_joined', { username: users[socket.id]?.username, id: socket.id, room: newRoom });

    // send initial messages for new room
    socket.emit('initial_messages', { room: newRoom, messages: getMessagesForRoom(newRoom, 1, 50) });
  });

  // send message (public to room)
  socket.on('send_message', (payload, ack) => {
    const room = users[socket.id]?.currentRoom || 'global';
    const message = {
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      room,
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message: payload.message || null,
      file: payload.file || null, // optional base64 file object { name, data, type }
      isPrivate: false,
      timestamp: new Date().toISOString(),
      reactions: {},
      readBy: [],
    };

    messages[room] = messages[room] || [];
    messages[room].push(message);
    if (messages[room].length > 500) messages[room].shift();

    // emit to room
    io.to(room).emit('receive_message', message);

    // optional ack to sender with server timestamp and id
    if (ack) ack({ ok: true, id: message.id, timestamp: message.timestamp });
  });

  // private message
  socket.on('private_message', ({ toSocketId, message: text, file }, ack) => {
    const messageData = {
      id: Date.now() + Math.random().toString(36).slice(2, 8),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      to: toSocketId,
      message: text,
      file: file || null,
      isPrivate: true,
      timestamp: new Date().toISOString(),
      reactions: {},
      readBy: [],
    };
    // emit to recipient and sender
    socket.to(toSocketId).emit('private_message', messageData);
    socket.emit('private_message', messageData);

    // notify recipient (for unread count)
    unreadCounts[toSocketId] = (unreadCounts[toSocketId] || 0) + 1;
    io.to(toSocketId).emit('unread_count', unreadCounts[toSocketId]);

    if (ack) ack({ ok: true, id: messageData.id });
  });

  // typing indicator (for current room)
  socket.on('typing', ({ isTyping }) => {
    const room = users[socket.id]?.currentRoom || 'global';
    if (!typingUsers[room]) typingUsers[room] = {};
    if (isTyping) typingUsers[room][socket.id] = users[socket.id]?.username;
    else delete typingUsers[room][socket.id];
    io.to(room).emit('typing_users', Object.values(typingUsers[room] || {}));
  });

  // fetch older messages (pagination)
  socket.on('fetch_messages', ({ room, page = 1, pageSize = 20 }, ack) => {
    const pageMsgs = getMessagesForRoom(room, page, pageSize);
    if (ack) ack({ room, page, messages: pageMsgs });
  });

  // message read receipt
  socket.on('message_read', ({ messageId, room }) => {
    const roomMsgs = messages[room] || [];
    const msg = roomMsgs.find(m => m.id === messageId);
    if (msg) {
      if (!msg.readBy.includes(socket.id)) {
        msg.readBy.push(socket.id);
      }
      // broadcast update for that message to room
      io.to(room).emit('message_read_update', { messageId, readBy: msg.readBy });
    }
  });

  // reactions (like, love, etc.)
  socket.on('message_reaction', ({ messageId, room, reaction }) => {
    const roomMsgs = messages[room] || [];
    const msg = roomMsgs.find(m => m.id === messageId);
    if (msg) {
      msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
      io.to(room).emit('message_reaction_update', { messageId, reactions: msg.reactions });
    }
  });

  // ack/delivery
  socket.on('ack_message', ({ messageId, room }) => {
    io.to(room).emit('message_delivered', { messageId, to: socket.id });
  });

  // disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const room = user.currentRoom || 'global';
      delete users[socket.id];
      if (typingUsers[room]) delete typingUsers[room][socket.id];

      io.to(room).emit('user_left', { username: user.username, id: socket.id });
      io.to(room).emit('user_list', Object.values(users).filter(u => u.currentRoom === room));
    }
    console.log('Disconnected:', socket.id);
  });
});

// API endpoints
app.get('/api/messages/:room', (req, res) => {
  const room = req.params.room;
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '20', 10);
  res.json(getMessagesForRoom(room, page, pageSize));
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

app.get('/', (req, res) => {
  res.send('Socket.io Chat Server running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
