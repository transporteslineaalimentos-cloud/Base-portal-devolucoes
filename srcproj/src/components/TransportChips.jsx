export default function TransportChips({ transporters = [], active = [], onToggle }) {
  if (!transporters.length) return null;
  return (
    <div className="flex gap-1 flex-wrap mb-3">
      {transporters.map(({ name, count }) => (
        <button key={name} onClick={() => onToggle(name)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition ${active.includes(name) ? 'bg-[#1a365d] text-white border-[#1a365d]' : 'bg-white text-gray-500 border-gray-200'}`}>
          {name.length > 22 ? name.slice(0, 22) + '…' : name} ({count})
        </button>
      ))}
    </div>
  );
}
