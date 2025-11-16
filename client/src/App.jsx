// client/src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './components/Chat';

export default function App() {
  const [username, setUsername] = useState('');

  const handleLogin = (user, room) => {
    setUsername(user);
    // room is handled inside Chat via socket.join
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route path="/chat" element={<Chat username={username} />} />
      </Routes>
    </BrowserRouter>
  );
}
