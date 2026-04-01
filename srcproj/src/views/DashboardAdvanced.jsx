import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { calcAging, getTransporter } from '../utils/helpers';

const COLORS = ['#1a365d', '#2b6cb0', '#0ea5e9', '#10b981', '#f59e0b', '#dc2626'];

function Card({ title, children }) {
  return <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"><div className="text-xs font-bold text-gray-500 uppercase mb-3">{title}</div>{children}</div>;
}

export default function DashboardAdvanced({ cobrNotes, pendNotes, statuses, noteMeta }) {
  const all = [...cobrNotes, ...pendNotes];
  const transporterMap = {};
  const motivoMap = {};
  const agingBuckets = [
    { name: '0-7d', value: 0 }, { name: '8-15d', value: 0 }, { name: '16-30d', value: 0 }, { name: '>30d', value: 0 }
  ];
  const areaTime = {};
  all.forEach(n => {
    const tr = getTransporter(n) || 'Não identificado';
    transporterMap[tr] = (transporterMap[tr] || 0) + (n.v || 0);
    motivoMap[n.mo || 'Sem motivo'] = (motivoMap[n.mo || 'Sem motivo'] || 0) + 1;
    const aging = calcAging(n) || 0;
    if (aging <= 7) agingBuckets[0].value += 1; else if (aging <= 15) agingBuckets[1].value += 1; else if (aging <= 30) agingBuckets[2].value += 1; else agingBuckets[3].value += 1;
    areaTime[n.ar || 'SEM ÁREA'] = (areaTime[n.ar || 'SEM ÁREA'] || { total: 0, count: 0 });
    areaTime[n.ar || 'SEM ÁREA'].total += aging; areaTime[n.ar || 'SEM ÁREA'].count += 1;
  });
  const topTransporters = Object.entries(transporterMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  const topMotivos = Object.entries(motivoMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const areaAvg = Object.entries(areaTime).map(([name, o]) => ({ name, value: Math.round(o.total / (o.count || 1)) })).sort((a, b) => b.value - a.value);
  const recoveryData = [
    { name: 'Cobrado', value: cobrNotes.filter(n => statuses[n.nfd + '|' + n.nfo] === 'st:cobrada').reduce((s, n) => s + (n.v || 0), 0) },
    { name: 'Pago', value: cobrNotes.filter(n => statuses[n.nfd + '|' + n.nfo] === 'st:paga').reduce((s, n) => s + (n.v || 0), 0) },
    { name: 'Aberto', value: cobrNotes.filter(n => !['st:cobrada','st:paga'].includes(statuses[n.nfd + '|' + n.nfo])).reduce((s, n) => s + (n.v || 0), 0) },
  ];
  const backlogResp = Object.values(noteMeta || {}).reduce((acc, meta) => {
    const k = meta.responsavel || 'Sem responsável';
    acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const backlogData = Object.entries(backlogResp).map(([name, value]) => ({ name, value })).slice(0, 8);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Aging por faixa"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={agingBuckets}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#1a365d" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card title="Top transportadores"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={topTransporters} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" width={120} /><Tooltip /><Bar dataKey="value" fill="#2b6cb0" radius={[0,6,6,0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card title="Top motivos"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={topMotivos} dataKey="value" nameKey="name" outerRadius={90} label>{topMotivos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></Card>
      <Card title="Tempo médio por área (dias)"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={areaAvg}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
      <Card title="Cobrado x Pago"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={recoveryData} dataKey="value" nameKey="name" outerRadius={90} label>{recoveryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></Card>
      <Card title="Backlog por responsável"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={backlogData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#f59e0b" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div></Card>
    </div>
  );
}
