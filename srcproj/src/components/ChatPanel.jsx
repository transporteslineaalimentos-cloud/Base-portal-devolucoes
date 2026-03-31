import { useState } from 'react';
import { fmtDateTime } from '../utils/helpers';

export default function ChatPanel({ noteKey, chat = [], addChatMessage, userName, role }) {
  const [msg, setMsg] = useState('');
  const send = () => {
    if (!msg.trim()) return;
    addChatMessage(noteKey, msg.trim(), userName, role);
    setMsg('');
  };
  return (
    <div>
      {chat.map((m, i) => (
        <div key={i} className={`flex mb-1.5 ${(m.role === 'transportador') === (role === 'transportador') ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[11px] ${(m.role === 'transportador') === (role === 'transportador') ? 'bg-[#1a365d] text-white' : 'bg-gray-100 text-gray-700'}`}>
            <div className="text-[9px] font-semibold opacity-60 mb-0.5">{m.user} · {fmtDateTime(m.ts)}</div>
            {m.msg}
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Escrever mensagem..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[11px] outline-none" />
        <button onClick={send} className="px-3 py-2 bg-[#1a365d] text-white rounded-lg text-[11px] font-semibold">Enviar</button>
      </div>
    </div>
  );
}
