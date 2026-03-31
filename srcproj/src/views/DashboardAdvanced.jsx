import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { calcAging, getTransporter } from '../utils/helpers';

const COLORS = ['#1a365d', '#2b6cb0', '#0ea5e9', '#10b981', '#f59e0b', '#dc2626'];

function Card({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 16,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

// extras agora obrigatório para getTransporter funcionar corretamente
export default function DashboardAdvanced({ cobrNotes, pendNotes, statuses, noteMeta, extras = {} }) {
  const all = [...cobrNotes, ...pendNotes];
  const transporterMap = {};
  const motivoMap = {};
  const agingBuckets = [
    { name: '0-7d', value: 0 }, { name: '8-15d', value: 0 }, { name: '16-30d', value: 0 }, { name: '>30d', value: 0 }
  ];
  const areaTime = {};

  all.forEach(n => {
    // FIX: passando extras para getTransporter
    const tr = getTransporter(n, extras) || 'Não identificado';
    transporterMap[tr] = (transporterMap[tr] || 0) + (n.v || 0);
    motivoMap[n.mo || 'Sem motivo'] = (motivoMap[n.mo || 'Sem motivo'] || 0) + 1;
    const aging = calcAging(n) || 0;
    if (aging <= 7) agingBuckets[0].value += 1;
    else if (aging <= 15) agingBuckets[1].value += 1;
    else if (aging <= 30) agingBuckets[2].value += 1;
    else agingBuckets[3].value += 1;
    if (!areaTime[n.ar || 'SEM ÁREA']) areaTime[n.ar || 'SEM ÁREA'] = { total: 0, count: 0 };
    areaTime[n.ar || 'SEM ÁREA'].total += aging;
    areaTime[n.ar || 'SEM ÁREA'].count += 1;
  });

  const topTransporters = Object.entries(transporterMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const topMotivos = Object.entries(motivoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const areaAvg = Object.entries(areaTime)
    .map(([name, o]) => ({ name, value: Math.round(o.total / (o.count || 1)) }))
    .sort((a, b) => b.value - a.value);

  const recoveryData = [
    { name: 'Cobrado', value: cobrNotes.filter(n => statuses[n.nfd + '|' + n.nfo] === 'st:cobrada').reduce((s, n) => s + (n.v || 0), 0) },
    { name: 'Pago',    value: cobrNotes.filter(n => statuses[n.nfd + '|' + n.nfo] === 'st:paga').reduce((s, n) => s + (n.v || 0), 0) },
    { name: 'Aberto',  value: cobrNotes.filter(n => !['st:cobrada','st:paga'].includes(statuses[n.nfd + '|' + n.nfo])).reduce((s, n) => s + (n.v || 0), 0) },
  ];

  const backlogResp = Object.values(noteMeta || {}).reduce((acc, meta) => {
    const k = meta.responsavel || 'Sem responsável';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const backlogData = Object.entries(backlogResp).map(([name, value]) => ({ name, value })).slice(0, 8);

  const tooltip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text)' } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
      <Card title="Aging por faixa">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="value" fill="var(--gold)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top transportadores (R$)">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topTransporters} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: 'var(--text-2)' }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="value" fill="var(--blue)" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top motivos">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={topMotivos} dataKey="value" nameKey="name" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {topMotivos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltip} />
              <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-2)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Tempo médio por área (dias)">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={areaAvg}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip {...tooltip} />
              <Line type="monotone" dataKey="value" stroke="var(--green)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Cobrança: cobrado × pago × aberto">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={recoveryData} dataKey="value" nameKey="name" outerRadius={80} label>
                {recoveryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tooltip} />
              <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-2)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Backlog por responsável">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={backlogData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="value" fill="var(--yellow)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
