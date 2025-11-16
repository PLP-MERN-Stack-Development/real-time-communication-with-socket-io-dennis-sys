// client/src/components/MessageInput.jsx
import React, { useState, useRef } from 'react';

export default function MessageInput({ onSend, onTyping }) {
  const [text, setText] = useState('');
  const [fileData, setFileData] = useState(null);
  const fileRef = useRef();

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!text.trim() && !fileData) return;

    // The onSend signature in Chat expects ({ text, file })
    await onSend({ text: text.trim(), file: fileData });

    // reset
    setText('');
    setFileData(null);
    if (fileRef.current) fileRef.current.value = '';
    onTyping(false);
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFileData({ name: f.name, data: reader.result, type: f.type });
    };
    reader.readAsDataURL(f);
  };

  return (
    <form className="message-input" onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        placeholder="Type a message..."
        value={text}
        onChange={e => { setText(e.target.value); onTyping(true); }}
        onBlur={() => onTyping(false)}
        style={{ flex: 1, padding: 8 }}
      />
      <input type="file" ref={fileRef} onChange={onFile} />
      <button type="submit" style={{ padding: '8px 16px', borderRadius: 8 }}>Send</button>
    </form>
  );
}
