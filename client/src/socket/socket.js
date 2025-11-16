// client/src/socket/socket.js
import { io } from 'socket.io-client';
import { useEffect, useState, useRef } from 'react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]); // flattened list for current room
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('global');
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  // Request notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // helpers
  const playSound = (url = '/ding.mp3') => {
    try {
      const a = new Audio(url);
      a.play().catch(() => {});
    } catch (e) {}
  };

  // connect and join initial room
  const connect = (username, room = 'global') => {
    socket.connect();
    socket.emit('user_join', { username, room });
    setCurrentRoom(room);
    pageRef.current = 1;
    setMessages([]); // clear previous
  };

  const disconnect = () => {
    try { socket.disconnect(); } catch (e) {}
  };

  // send message to current room (with optional file)
  const sendMessage = (text, file = null, ackCb) => {
    const payload = { message: text, file };
    socket.emit('send_message', payload, (ack) => {
      if (ack && ack.id) {
        // Server generated id, you could update local optimistic message
        if (ackCb) ackCb(ack);
      }
    });
  };

  // private message to a socket id
  const sendPrivateMessage = (toSocketId, text, file = null, ackCb) => {
    socket.emit('private_message', { toSocketId, message: text, file }, (ack) => {
      if (ackCb) ackCb(ack);
    });
  };

  // typing indicator
  const setTyping = (isTyping) => {
    socket.emit('typing', { isTyping });
  };

  // change/join room
  const changeRoom = (newRoom) => {
    if (!newRoom) return;
    socket.emit('change_room', { newRoom });
    setCurrentRoom(newRoom);
    pageRef.current = 1;
    setMessages([]);
  };

  // pagination: fetch older messages for current room (page++)
  const fetchOlder = (pageSize = 20) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const page = pageRef.current + 1;
    socket.emit('fetch_messages', { room: currentRoom, page, pageSize }, (res) => {
      if (res && Array.isArray(res.messages) && res.messages.length) {
        // prepend older messages
        setMessages(prev => [...res.messages, ...prev]);
        pageRef.current = page;
      }
      loadingRef.current = false;
    });
  };

  const markMessageRead = (messageId) => {
    socket.emit('message_read', { messageId, room: currentRoom });
  };

  const reactToMessage = (messageId, reaction) => {
    socket.emit('message_reaction', { messageId, room: currentRoom, reaction });
  };

  // listen for events
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onInitialMessages = ({ room, messages: initial }) => {
      if (room === currentRoom) {
        setMessages(initial || []);
      } else {
        // If server sent messages for a different room, ignore or store per-room (simple approach: ignore)
      }
    };

    const onReceiveMessage = (m) => {
      // if this message belongs to the current room, append; otherwise update unread
      if (!m) return;
      setLastMessage(m);
      setMessages(prev => [...prev, m]);

      // play sound & notify if page not focused or user isn't focused on this tab
      if (!document.hasFocus()) {
        playSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`New message from ${m.sender}`, { body: m.message || (m.file?.name || 'file sent') });
        }
        setUnreadCount(c => c + 1);
      } else {
        // optionally play a subtle sound even when focused
        playSound();
      }
    };

    const onPrivateMessage = (m) => {
      setLastMessage(m);
      // treat private messages slightly differently - show in messages array as well
      setMessages(prev => [...prev, m]);
      if (!document.hasFocus()) {
        playSound();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Private from ${m.sender}`, { body: m.message || (m.file?.name || 'file sent') });
        }
        setUnreadCount(c => c + 1);
      } else {
        playSound();
      }
    };

    const onUserList = (list) => setUsers(list || []);
    const onUserJoined = (u) => {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, system: true, message: `${u.username} joined ${u.room || currentRoom}`, timestamp: new Date().toISOString() }]);
      socket.emit('ping_server', null, () => {}); // keep connection fresh
    };
    const onUserLeft = (u) => {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, system: true, message: `${u.username} left`, timestamp: new Date().toISOString() }]);
    };

    const onTypingUsers = (list) => setTypingUsers(list || []);

    const onMessageReadUpdate = ({ messageId, readBy }) => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, readBy } : m)));
    };

    const onReactionUpdate = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions } : m)));
    };

    const onMessageDelivered = ({ messageId }) => {
      // optional: mark message as delivered in UI
      setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, delivered: true } : m)));
    };

    const onUnreadCount = (count) => setUnreadCount(count || 0);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('initial_messages', onInitialMessages);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_read_update', onMessageReadUpdate);
    socket.on('message_reaction_update', onReactionUpdate);
    socket.on('message_delivered', onMessageDelivered);
    socket.on('unread_count', onUnreadCount);

    // cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('initial_messages', onInitialMessages);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_read_update', onMessageReadUpdate);
      socket.off('message_reaction_update', onReactionUpdate);
      socket.off('message_delivered', onMessageDelivered);
      socket.off('unread_count', onUnreadCount);
    };
  }, [currentRoom]);

  // expose API
  return {
    socket,
    isConnected,
    messages,
    users,
    typingUsers,
    currentRoom,
    unreadCount,
    lastMessage,

    // actions
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    changeRoom,
    fetchOlder,
    markMessageRead,
    reactToMessage,
  };
};

export default socket;
