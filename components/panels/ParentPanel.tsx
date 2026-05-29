// components/panels/ParentPanel.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { SimBus, SimStudent, SimNotification } from '../../lib/simulation';

const LiveMap = dynamic(() => import('../map/LiveMap'), { ssr: false });

interface Props {
  buses: SimBus[];
  students: SimStudent[];
  notifications: SimNotification[];
  onMarkRead: (id: string) => void;
}

export default function ParentPanel({ buses, students, notifications, onMarkRead }: Props) {
  const [selectedChild] = useState<SimStudent | undefined>(students[0]);
  const [tab, setTab] = useState<'track' | 'notifications' | 'history'>('track');

  const childBus = buses.find(b => b.id === selectedChild?.busId);
  const unread = notifications.filter(n => !n.read).length;

  const notifIcon: Record<string, string> = {
    boarding: '🟢', drop: '🏠', alert: '⚠️', eta: '⏱', sos: '🚨',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Child status card */}
      {selectedChild && childBus && (
        <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #eef9ff 0%, #f0fdf4 100%)', border: '1px solid #bae6fd' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#118dee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👦</div>
              <div>
                <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 18 }}>{selectedChild.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{selectedChild.class} • Roll {selectedChild.roll}</div>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge badge-${selectedChild.status === 'BOARDED' ? 'green' : selectedChild.status === 'DROPPED' ? 'blue' : 'amber'}`}>
                    {selectedChild.status === 'BOARDED' ? '✅ On Bus' : selectedChild.status === 'DROPPED' ? '🏠 Dropped at School' : '⏳ Awaiting Pickup'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'Bus', value: childBus.number, icon: '🚌' },
                { label: 'ETA', value: `${childBus.eta} min`, icon: '⏱' },
                { label: 'Driver', value: childBus.driverName.split(' ')[0], icon: '🧑‍✈️' },
                { label: 'Speed', value: `${childBus.speed.toFixed(0)} km/h`, icon: '🚗' },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="tab-nav" style={{ maxWidth: 380 }}>
            {[
              { id: 'track', label: '📍 Live Track' },
              { id: 'notifications', label: `🔔 Alerts${unread > 0 ? ` (${unread})` : ''}` },
              { id: 'history', label: '📋 History' },
            ].map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as any)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: 18 }}>
          {tab === 'track' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <LiveMap buses={buses} selectedBusId={childBus?.id} height={380} />
              {/* Stop timeline */}
              {childBus && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#0f172a' }}>Route Stops</div>
                  <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
                    {(Object.values(require('../../lib/simulation').KOLKATA_ROUTES)[
                      Object.keys(require('../../lib/simulation').KOLKATA_ROUTES).findIndex(k => k === childBus.routeName)
                    ] as any[])?.map((stop: any, i: number, arr: any[]) => {
                      const passed = i < childBus.currentStopIndex;
                      const current = i === childBus.currentStopIndex;
                      return (
                        <div key={stop.name} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ textAlign: 'center', width: 90 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
                              background: passed ? '#22c55e' : current ? '#118dee' : '#e2e8f0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, color: passed || current ? 'white' : '#94a3b8',
                              fontWeight: 700, border: current ? '3px solid #bfdbfe' : 'none',
                            }}>
                              {passed ? '✓' : i + 1}
                            </div>
                            <div style={{ fontSize: 10, color: current ? '#118dee' : passed ? '#22c55e' : '#94a3b8', fontWeight: current ? 700 : 400, lineHeight: 1.3 }}>{stop.name}</div>
                          </div>
                          {i < arr.length - 1 && (
                            <div style={{ width: 30, height: 2, background: passed ? '#22c55e' : '#e2e8f0', flexShrink: 0, margin: '0 -2px 18px' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <button onClick={() => notifications.forEach(n => !n.read && onMarkRead(n.id))} style={{ fontSize: 12, color: '#118dee', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                  Mark all read
                </button>
              </div>
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  style={{
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    background: n.read ? '#f8fafc' : 'white',
                    border: `1px solid ${n.read ? '#e2e8f0' : n.type === 'sos' ? '#fecaca' : '#bae6fd'}`,
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{notifIcon[n.type] ?? '📢'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14, color: '#0f172a' }}>{n.title}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{n.time}</div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#118dee', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'history' && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: '#0f172a' }}>Attendance History — This Week</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Date','Day','Boarded','Dropped','Bus','Driver','Status'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: 'May 29', day: 'Thu', boarded: '07:45 AM', dropped: '08:30 AM', bus: 'Bus 01', driver: 'Ramesh G.', status: 'Present' },
                      { date: 'May 28', day: 'Wed', boarded: '07:48 AM', dropped: '08:35 AM', bus: 'Bus 01', driver: 'Ramesh G.', status: 'Present' },
                      { date: 'May 27', day: 'Tue', boarded: '07:50 AM', dropped: '08:38 AM', bus: 'Bus 01', driver: 'Ramesh G.', status: 'Late' },
                      { date: 'May 26', day: 'Mon', boarded: '—', dropped: '—', bus: '—', driver: '—', status: 'Absent' },
                      { date: 'May 23', day: 'Fri', boarded: '07:42 AM', dropped: '08:28 AM', bus: 'Bus 01', driver: 'Ramesh G.', status: 'Present' },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{row.date}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.day}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>{row.boarded}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'var(--font-jetbrains)', fontSize: 12 }}>{row.dropped}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.bus}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.driver}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span className={`badge badge-${row.status === 'Present' ? 'green' : row.status === 'Late' ? 'amber' : 'red'}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
