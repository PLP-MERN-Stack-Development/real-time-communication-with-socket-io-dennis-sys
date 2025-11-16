// client/src/components/UsersList.jsx
import React from 'react';

export default function UsersList({ users = [], onSelect, selected }) {
  return (
    <div>
      <h4>Users</h4>
      {users.length === 0 && <div style={{ color: '#666' }}>No users</div>}
      {users.map(u => (
        <div
          key={u.id}
          onClick={() => onSelect(u)}
          style={{
            padding: 8,
            cursor: 'pointer',
            background: selected?.id === u.id ? '#e6f7ff' : 'transparent',
            borderRadius: 6,
            marginBottom: 4,
          }}
        >
          {u.username}
        </div>
      ))}
    </div>
  );
}
