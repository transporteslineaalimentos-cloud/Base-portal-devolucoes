import { useState } from 'react';
import { fmtDateTime } from '../utils/helpers';

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

export default function ChatPanel({ noteKey, chat = [], addChatMessage, userName, role }) {
  const [msg, setMsg] = useState('');
  const send = () => {
    if (!msg.trim()) return;
    addChatMessage(noteKey, msg.trim(), userName, role);
    setMsg('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {chat.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 12 }}>
          Nenhuma mensagem. Inicie a conversa.
        </div>
      )}

      {chat.map((m, i) => {
        const isMine = (m.role === 'transportador') === (role === 'transportador');
        return (
          <div key={i} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
            <div>
              <div className="chat-meta" style={{ textAlign: isMine ? 'right' : 'left' }}>
                {m.user} · {fmtDateTime(m.ts)}
              </div>
              <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                {m.msg}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Escrever mensagem..."
          className="input"
          style={{ flex: 1, padding: '8px 12px' }}
        />
        <button onClick={send} className="btn btn-gold btn-sm" style={{ padding: '8px 12px' }}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
