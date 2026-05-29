// components/panels/DriverPanel.tsx
import { useState } from 'react';
import { SimBus, SimStudent, KOLKATA_ROUTES } from '../../lib/simulation';

interface Props {
  buses: SimBus[];
  students: SimStudent[];
  onSOS: (busId: string, type: string) => void;
  onBoardStudent: (id: string) => void;
  onDropStudent: (id: string) => void;
}

const SOS_EVENTS = ['Accident', 'Bus Breakdown', 'Medical Emergency', 'Route Deviation', 'Security Threat'];

export default function DriverPanel({ buses, students, onSOS, onBoardStudent, onDropStudent }: Props) {
  const [activeBusId, setActiveBusId] = useState(buses[0]?.id);
  const [showSOS, setShowSOS] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [sosConfirm, setSosConfirm] = useState<string | null>(null);

  const bus = buses.find(b => b.id === activeBusId);
  const busStudents = students.filter(s => s.busId === activeBusId);
  const stops = bus ? KOLKATA_ROUTES[bus.routeName] ?? [] : [];
  const SPEED_LIMIT = 40;

  if (!bus) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Bus selector */}
      <div style={{ display: 'flex', gap: 10 }}>
        {buses.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveBusId(b.id)}
            style={{
              padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${activeBusId === b.id ? '#118dee' : '#e2e8f0'}`,
              background: activeBusId === b.id ? '#eef9ff' : 'white', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: activeBusId === b.id ? '#118dee' : '#475569',
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            🚌 {b.number}
          </button>
        ))}
      </div>

      {/* LCD-style dashboard */}
      <div style={{
        background: '#0f172a', borderRadius: 16, padding: '24px',
        border: '2px solid #1e293b', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        fontFamily: 'var(--font-jetbrains)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ color: '#94a3b8', fontSize: 12, letterSpacing: '0.1em' }}>BUS DASHBOARD — {bus.number}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: bus.status === 'ON_ROUTE' ? '#22c55e' : bus.status === 'EMERGENCY' ? '#ef4444' : '#f59e0b' }} />
            <span style={{ color: bus.status === 'ON_ROUTE' ? '#22c55e' : bus.status === 'EMERGENCY' ? '#ef4444' : '#f59e0b', fontSize: 12, fontWeight: 600 }}>
              {bus.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 14 }}>
          {[
            { label: 'SPEED', value: `${bus.speed.toFixed(0)}`, unit: 'km/h', warn: bus.overspeed, color: bus.overspeed ? '#ef4444' : '#22c55e' },
            { label: 'STUDENTS', value: `${bus.studentCount}`, unit: `/ ${bus.capacity}`, warn: false, color: '#60a5fa' },
            { label: 'ETA', value: `${bus.eta}`, unit: 'min', warn: false, color: '#f59e0b' },
            { label: 'FUEL', value: `${Math.round(bus.fuelLevel)}`, unit: '%', warn: bus.fuelLevel < 20, color: bus.fuelLevel < 20 ? '#ef4444' : '#22c55e' },
            { label: 'ENGINE', value: `${bus.engineHealth}`, unit: '%', warn: bus.engineHealth < 40, color: bus.engineHealth < 40 ? '#f59e0b' : '#22c55e' },
            { label: 'FATIGUE', value: `${bus.fatigueLevel}`, unit: '%', warn: bus.fatigueLevel > 60, color: bus.fatigueLevel > 60 ? '#ef4444' : '#22c55e' },
          ].map(item => (
            <div key={item.label} style={{
              background: item.warn ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
              borderRadius: 10, padding: '14px',
              border: `1px solid ${item.warn ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.08em', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{item.unit}</div>
            </div>
          ))}
        </div>

        {/* Speed bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10, color: '#64748b' }}>
            <span>0 km/h</span>
            <span style={{ color: bus.overspeed ? '#ef4444' : '#64748b' }}>LIMIT: {SPEED_LIMIT} km/h</span>
            <span>60 km/h</span>
          </div>
          <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
              width: `${Math.min((bus.speed / 60) * 100, 100)}%`,
              background: bus.overspeed ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#22c55e,#60a5fa)',
            }} />
          </div>
          {bus.overspeed && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444', fontWeight: 700, textAlign: 'center', letterSpacing: '0.05em' }}>
              ⚠️ OVERSPEED WARNING — REDUCE SPEED
            </div>
          )}
        </div>

        {/* Current stop */}
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.08em' }}>CURRENT STOP</span>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#f8fafc', marginTop: 3 }}>
            {stops[bus.currentStopIndex]?.name ?? 'School'}
          </div>
          {stops[bus.currentStopIndex + 1] && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Next: {stops[bus.currentStopIndex + 1]?.name}
            </div>
          )}
        </div>
      </div>

      {/* Trip control + SOS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Trip Control</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setTripStarted(true)}
              disabled={tripStarted}
              style={{
                padding: '10px', borderRadius: 9, border: 'none',
                background: tripStarted ? '#e2e8f0' : '#22c55e', color: tripStarted ? '#94a3b8' : 'white',
                cursor: tripStarted ? 'default' : 'pointer', fontWeight: 700, fontSize: 14,
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              {tripStarted ? '✅ Trip Started' : '▶ Start Trip'}
            </button>
            <button
              onClick={() => setTripStarted(false)}
              style={{ padding: '10px', borderRadius: 9, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-dm-sans)', color: '#475569' }}
            >
              ⏹ End Trip
            </button>
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
            <div style={{ color: '#64748b', marginBottom: 4 }}>Driver: <b style={{ color: '#0f172a' }}>{bus.driverName}</b></div>
            <div style={{ color: '#64748b' }}>Safety Score: <b style={{ color: bus.safetyScore > 80 ? '#22c55e' : '#f59e0b' }}>{bus.safetyScore}/100</b></div>
          </div>
        </div>

        <div className="card" style={{ padding: 20, border: '1px solid #fecaca' }}>
          <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, marginBottom: 14, color: '#b91c1c' }}>Emergency SOS</div>
          {!showSOS ? (
            <button className="sos-btn" style={{ width: '100%' }} onClick={() => setShowSOS(true)}>
              🆘 SOS
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Select emergency type:</div>
              {SOS_EVENTS.map(evt => (
                <button
                  key={evt}
                  onClick={() => { setSosConfirm(evt); setShowSOS(false); onSOS(bus.id, evt); }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left', fontFamily: 'var(--font-dm-sans)' }}
                >
                  🚨 {evt}
                </button>
              ))}
              <button onClick={() => setShowSOS(false)} style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>Cancel</button>
            </div>
          )}
          {sosConfirm && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
              🚨 Alert sent: {sosConfirm}
            </div>
          )}
        </div>
      </div>

      {/* Student boarding */}
      <div className="card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', fontFamily: 'var(--font-syne)', fontWeight: 600, fontSize: 15 }}>
          Student Boarding — {bus.number} ({busStudents.filter(s => s.status === 'BOARDED').length}/{busStudents.length} boarded)
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {busStudents.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 9,
              background: s.status === 'BOARDED' ? '#f0fdf4' : s.status === 'DROPPED' ? '#f5f3ff' : '#fafafa',
              border: `1px solid ${s.status === 'BOARDED' ? '#bbf7d0' : s.status === 'DROPPED' ? '#ddd6fe' : '#e2e8f0'}`,
            }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{s.name}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{s.class} • {s.stopName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge badge-${s.status === 'BOARDED' ? 'green' : s.status === 'DROPPED' ? 'blue' : 'gray'}`}>{s.status}</span>
                {s.status === 'PENDING' && (
                  <button onClick={() => onBoardStudent(s.id)} style={{ padding: '4px 12px', borderRadius: 7, border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Board</button>
                )}
                {s.status === 'BOARDED' && (
                  <button onClick={() => onDropStudent(s.id)} style={{ padding: '4px 12px', borderRadius: 7, border: 'none', background: '#8b5cf6', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Drop</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
