// client/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('global');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    onLogin(username, room);
    navigate('/chat');
  };

  return (
    <div className="login">
      <h2>Join Chat</h2>
      <form onSubmit={submit}>
        <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        <select value={room} onChange={e=>setRoom(e.target.value)}>
          <option value="global">Global</option>
          <option value="sports">Sports</option>
          <option value="tech">Tech</option>
          <option value="random">Random</option>
        </select>
        <button type="submit">Join</button>
      </form>
    </div>
  );
}
