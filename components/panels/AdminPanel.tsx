// components/panels/AdminPanel.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { SimBus, SimStudent, SimAlert, KOLKATA_ROUTES } from '../../lib/simulation';

const LiveMap = dynamic(() => import('../map/LiveMap'), { ssr: false });

interface Props {
  buses: SimBus[];
  students: SimStudent[];
  alerts: SimAlert[];
  onResolveAlert: (busId: string, alertId: string) => void;
  onBoardStudent: (id: string) => void;
  onDropStudent: (id: string) => void;
  tick: number;
}

export default function AdminPanel({ buses, students, alerts, onResolveAlert, onBoardStudent, onDropStudent, tick }: Props) {
  const [selectedBus, setSelectedBus] = useState<string | undefined>(buses[0]?.id);
  const [tab, setTab] = useState<'overview' | 'students' | 'alerts' | 'routes'>('overview');

  const totalStudents = students.length;
  const boarded = students.filter(s => s.status === 'BOARDED').length;
  const dropped = students.filter(s => s.status === 'DROPPED').length;
  const absent  = students.filter(s => s.status === 'ABSENT').length;

  const selBus = buses.find(b => b.id === selectedBus);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Stat strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[
          { label: 'Active Buses',    value: buses.filter(b => b.status !== 'IDLE').length, of: buses.length, icon: '🚌', color: '#118dee', bg: '#eef9ff' },
          { label: 'Students Boarded', value: boarded, of: totalStudents, icon: '👦', color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Students Dropped', value: dropped, of: totalStudents, icon: '🏠', color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Active Alerts',   value: alerts.length, of: null, icon: '🚨', color: '#ef4444', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              {s.of !== null && (
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>/ {s.of}</span>
              )}
            </div>
            <div className="stat-num" style={{ color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main grid: map + bus list ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Map */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 15 }}>Live Fleet Map</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Kolkata, WB • {buses.length} buses</div>
          </div>
          <LiveMap buses={buses} selectedBusId={selectedBus} onSelectBus={setSelectedBus} height={380} />
        </div>

        {/* Bus list */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 15 }}>
            Fleet Status
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {buses.map(bus => {
              const isSelected = bus.id === selectedBus;
              const statusColor = bus.status === 'EMERGENCY' ? '#ef4444' : bus.status === 'ON_ROUTE' ? '#22c55e' : bus.status === 'STOPPED' ? '#f59e0b' : '#94a3b8';
              const statusLabel = bus.status === 'ON_ROUTE' ? 'Moving' : bus.status === 'STOPPED' ? 'At Stop' : bus.status === 'EMERGENCY' ? 'EMERGENCY' : 'Idle';
              return (
                <div
                  key={bus.id}
                  onClick={() => setSelectedBus(bus.id)}
                  className={bus.status === 'EMERGENCY' ? 'alert-critical' : ''}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? '#118dee' : '#e2e8f0'}`,
                    background: isSelected ? '#eef9ff' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{bus.number}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{bus.plate}</div>
                    </div>
                    <span className={`badge badge-${bus.status === 'EMERGENCY' ? 'red' : bus.status === 'ON_ROUTE' ? 'green' : bus.status === 'STOPPED' ? 'amber' : 'gray'}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    🧑‍✈️ {bus.driverName} • 👦 {bus.studentCount}/{bus.capacity}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
                    <span>🚗 {bus.speed.toFixed(0)} km/h</span>
                    <span>⏱ {bus.eta} min</span>
                    <span>⛽ {Math.round(bus.fuelLevel)}%</span>
                  </div>
                  {/* Progress */}
                  <div className="progress-bar" style={{ marginTop: 8 }}>
                    <div className="progress-fill" style={{ width: `${bus.tripProgress}%`, background: statusColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tabs: Students / Alerts / Routes ── */}
      <div className="card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="tab-nav" style={{ maxWidth: 380 }}>
            {(['overview','students','alerts','routes'] as const).map(t => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'overview' ? '📊 Overview' : t === 'students' ? `👦 Students` : t === 'alerts' ? `🚨 Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}` : '🗺️ Routes'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 18 }}>
          {tab === 'overview' && selBus && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
              {/* Bus detail cards */}
              {[
                { label: 'Driver', value: selBus.driverName, icon: '🧑‍✈️' },
                { label: 'Route', value: selBus.routeName.split('—')[1]?.trim(), icon: '🗺️' },
                { label: 'Speed', value: `${selBus.speed.toFixed(0)} km/h${selBus.overspeed ? ' ⚠️' : ''}`, icon: '🚗' },
                { label: 'ETA to school', value: `${selBus.eta} minutes`, icon: '⏱' },
                { label: 'Students', value: `${selBus.studentCount} / ${selBus.capacity}`, icon: '👦' },
                { label: 'Engine health', value: `${selBus.engineHealth}%`, icon: '⚙️' },
                { label: 'Fuel level', value: `${Math.round(selBus.fuelLevel)}%`, icon: '⛽' },
                { label: 'Safety score', value: `${selBus.safetyScore}/100`, icon: '🛡️' },
              ].map(item => (
                <div key={item.label} style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{item.icon} {item.label}</div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'students' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                {[
                  { label: 'All', count: totalStudents, color: '#475569' },
                  { label: 'Boarded', count: boarded, color: '#22c55e' },
                  { label: 'Dropped', count: dropped, color: '#8b5cf6' },
                  { label: 'Absent', count: absent, color: '#ef4444' },
                  { label: 'Pending', count: students.filter(s => s.status === 'PENDING').length, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '5px 12px', borderRadius: 8, background: '#f1f5f9', fontSize: 13 }}>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.count}</span>
                    <span style={{ color: '#64748b', marginLeft: 5 }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Roll','Name','Class','Bus','Stop','Status','Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                        <td style={{ padding: '9px 14px', fontFamily: 'var(--font-jetbrains)', fontSize: 12, color: '#64748b' }}>{s.roll}</td>
                        <td style={{ padding: '9px 14px', fontWeight: 500, color: '#0f172a' }}>{s.name}</td>
                        <td style={{ padding: '9px 14px', color: '#64748b' }}>{s.class}</td>
                        <td style={{ padding: '9px 14px', color: '#64748b' }}>{buses.find(b => b.id === s.busId)?.number ?? '—'}</td>
                        <td style={{ padding: '9px 14px', color: '#64748b', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.stopName}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span className={`badge badge-${s.status === 'BOARDED' ? 'green' : s.status === 'DROPPED' ? 'blue' : s.status === 'ABSENT' ? 'red' : 'amber'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {s.status === 'PENDING' && (
                              <button onClick={() => onBoardStudent(s.id)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #22c55e', background: '#f0fdf4', color: '#15803d', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Board</button>
                            )}
                            {s.status === 'BOARDED' && (
                              <button onClick={() => onDropStudent(s.id)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #8b5cf6', background: '#f5f3ff', color: '#6d28d9', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Drop</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'alerts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>
                  ✅ No active alerts
                </div>
              ) : alerts.map(alert => {
                const bus = buses.find(b => b.alerts.some(a => a.id === alert.id));
                return (
                  <div key={alert.id} className={alert.severity === 'CRITICAL' ? 'alert-critical' : ''} style={{
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${alert.severity === 'CRITICAL' ? '#fecaca' : '#fde68a'}`,
                    background: alert.severity === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                        {alert.severity === 'CRITICAL' ? '🚨' : '⚠️'} {alert.message}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {alert.timestamp.toLocaleTimeString('en-IN')} • {bus?.number}
                      </div>
                    </div>
                    <button
                      onClick={() => bus && onResolveAlert(bus.id, alert.id)}
                      style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      Resolve
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'routes' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
              {Object.entries(KOLKATA_ROUTES).map(([routeName, stops], i) => {
                const bus = buses.find(b => b.routeName === routeName);
                const colors = ['#118dee','#22c55e','#f59e0b'];
                return (
                  <div key={routeName} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${colors[i]}40`, background: `${colors[i]}08` }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: colors[i], marginBottom: 8 }}>{routeName}</div>
                    {bus && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>🚌 {bus.number} • 🧑‍✈️ {bus.driverName}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {stops.map((stop, si) => (
                        <div key={stop.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: colors[i], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{si + 1}</div>
                          <span style={{ color: '#475569' }}>{stop.name}</span>
                          {si === stops.length - 1 && <span className="badge badge-blue" style={{ fontSize: 9 }}>SCHOOL</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
