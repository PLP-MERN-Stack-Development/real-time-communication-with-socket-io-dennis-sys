// client/src/components/Chat.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../socket/socket';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import UsersList from './UsersList';

export default function Chat({ username }) {
  const {
    socket, isConnected, messages, users, typingUsers,
    connect, disconnect, sendMessage, sendPrivateMessage, setTyping, changeRoom, currentRoom
  } = useSocket();

  const [selectedUser, setSelectedUser] = useState(null);
  const [room, setRoom] = useState(currentRoom || 'global');

  useEffect(() => {
    if (username) connect(username, room);
    return () => disconnect();
  }, []);

  useEffect(() => {
    // update room when changed
    if (room !== currentRoom) changeRoom(room);
  }, [room]);

  const onSend = async ({ text, file }) => {
    if (selectedUser) {
      // private
      sendPrivateMessage(selectedUser.id, text, file);
    } else {
      sendMessage(text, file);
    }
  };

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <h3>Rooms</h3>
        <select value={room} onChange={e=>setRoom(e.target.value)}>
          <option value="global">Global</option>
          <option value="sports">Sports</option>
          <option value="tech">Tech</option>
          <option value="random">Random</option>
        </select>

        <UsersList users={users} onSelect={u=>setSelectedUser(u)} selected={selectedUser} />
      </aside>

      <main className="main-chat">
        <header>
          <h2>{selectedUser ? `Private: ${selectedUser.username}` : `Room: ${room}`}</h2>
          <div>{isConnected ? 'Online' : 'Offline'}</div>
        </header>

        <MessageList messages={messages} onReact={(msgId, reaction) => {
          socket.emit('message_reaction', { messageId: msgId, room, reaction });
        }} onMarkRead={(msgId)=> {
          socket.emit('message_read', { messageId: msgId, room });
        }} />

        <div className="typing-indicator">
          {typingUsers.length ? `${typingUsers.join(', ')} typing...` : null}
        </div>

        <MessageInput onSend={onSend} onTyping={(isTyping) => setTyping(isTyping)} />
      </main>
    </div>
  );
}
