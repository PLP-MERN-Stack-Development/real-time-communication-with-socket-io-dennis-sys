// client/src/components/MessageList.jsx
import React, { useEffect, useRef } from 'react';

export default function MessageList({ messages = [], onReact, onMarkRead, onLoadOlder }) {
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ padding: 12, height: '60vh', overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={onLoadOlder}>Load older messages</button>
      </div>

      {messages.length === 0 && <div style={{ color: '#666' }}>No messages yet</div>}

      {messages.map(m => (
        <div key={m.id} style={{ marginBottom: 12, padding: 8, background: m.system ? '#f5f5f5' : '#fff', borderRadius: 6 }}>
          {m.system ? (
            <em style={{ color: '#555' }}>{m.message}</em>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{m.sender}</strong>
                <small style={{ color: '#888' }}>{new Date(m.timestamp).toLocaleTimeString()}</small>
              </div>

              <div style={{ marginTop: 6 }}>
                {m.message && <div style={{ marginBottom: 6 }}>{m.message}</div>}

                {m.file && (
                  <div style={{ marginTop: 6 }}>
                    {m.file.type?.startsWith('image') ? (
                      <img src={m.file.data} alt={m.file.name} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 6 }} />
                    ) : (
                      <a href={m.file.data} download={m.file.name}>Download {m.file.name}</a>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => onReact(m.id, 'like')}>👍 {m.reactions?.like || 0}</button>
                <button onClick={() => onReact(m.id, 'love')}>❤️ {m.reactions?.love || 0}</button>
                <button onClick={() => onMarkRead(m.id)}>Mark Read ({(m.readBy || []).length})</button>
              </div>
            </>
          )}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
}
