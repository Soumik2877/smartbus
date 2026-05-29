// components/panels/AIMonitorPanel.tsx — with Geofencing, AI Risk Map, Predictive Maintenance
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import { SimBus, KOLKATA_ROUTES } from '../../lib/simulation';

interface Props { buses: SimBus[]; tick: number; }

// ── Geofencing engine ────────────────────────────────────────────────────────
function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function isOnRoute(bus: SimBus): { onRoute: boolean; distFromRoute: number } {
  const stops = KOLKATA_ROUTES[bus.routeName] ?? [];
  if (!stops.length) return { onRoute: true, distFromRoute: 0 };
  let minDist = Infinity;
  stops.forEach(stop => {
    const d = distKm(bus.lat, bus.lng, stop.lat, stop.lng);
    if (d < minDist) minDist = d;
  });
  return { onRoute: minDist < 1.2, distFromRoute: minDist };
}

// School coords (Kharagpur Town)
const SCHOOL = { lat: 22.3302, lng: 87.3237 };
const SCHOOL_ZONE_KM = 0.5;

export default function AIMonitorPanel({ buses, tick }: Props) {
  const [selectedBusId, setSelectedBusId] = useState(buses[0]?.id);
  const [aiTab, setAiTab] = useState<'driving' | 'traffic' | 'maintenance' | 'risk' | 'geofence'>('driving');
  const [geofenceLog, setGeofenceLog] = useState<Array<{id:string;bus:string;event:string;time:string;severity:string}>>([]);
  const prevGeofenceRef = useRef<Record<string,boolean>>({});

  const bus = buses.find(b => b.id === selectedBusId) ?? buses[0];

  // ── Geofencing engine ──────────────────────────────────────────────────────
  useEffect(() => {
    buses.forEach(b => {
      const { onRoute, distFromRoute } = isOnRoute(b);
      const distToSchool = distKm(b.lat, b.lng, SCHOOL.lat, SCHOOL.lng);
      const inSchoolZone = distToSchool < SCHOOL_ZONE_KM;
      const prevOnRoute = prevGeofenceRef.current[`route_${b.id}`] ?? true;
      const prevInSchool = prevGeofenceRef.current[`school_${b.id}`] ?? false;

      if (!onRoute && prevOnRoute) {
        setGeofenceLog(prev => [{
          id: `gf-${Date.now()}`, bus: b.number,
          event: `Left assigned route (${distFromRoute.toFixed(2)} km off route)`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          severity: 'HIGH',
        }, ...prev.slice(0, 19)]);
      }
      if (inSchoolZone && !prevInSchool) {
        setGeofenceLog(prev => [{
          id: `gf-school-${Date.now()}`, bus: b.number,
          event: `Entered school zone (${(distToSchool * 1000).toFixed(0)}m from school)`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          severity: 'LOW',
        }, ...prev.slice(0, 19)]);
      }

      prevGeofenceRef.current[`route_${b.id}`] = onRoute;
      prevGeofenceRef.current[`school_${b.id}`] = inSchoolZone;
    });
  }, [tick, buses]);

  // ── Speed history ──────────────────────────────────────────────────────────
  const speedHistory = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    t: `${i * 2}s`,
    speed: Math.max(0, Math.min(55, 30 + Math.sin(i * 0.5) * 12 + Math.random() * 6)),
    limit: 40,
  })), [tick]);

  // ── Driving events ─────────────────────────────────────────────────────────
  const drivingEvents = useMemo(() => [
    { time: '07:45:12', type: 'Sudden Brake',    severity: 7, bus: 'Bus 01', icon: '🛑' },
    { time: '07:48:33', type: 'Sharp Turn',      severity: 5, bus: 'Bus 02', icon: '↩️' },
    { time: '07:52:01', type: 'Overspeed',       severity: 8, bus: 'Bus 01', icon: '🚗' },
    { time: '07:55:44', type: 'Fatigue Detected',severity: 6, bus: 'Bus 02', icon: '😴' },
    { time: '08:02:19', type: 'Sharp Turn',      severity: 4, bus: 'Bus 03', icon: '↩️' },
    { time: '08:06:55', type: 'Overspeed',       severity: 9, bus: 'Bus 01', icon: '🚗' },
  ], []);

  // ── Driver ranking ─────────────────────────────────────────────────────────
  const driverRanking = useMemo(() =>
    buses.map(b => ({
      name: b.driverName.split(' ')[0], score: b.safetyScore,
      fatigue: b.fatigueLevel, bus: b.number,
      events: drivingEvents.filter(e => e.bus === b.number).length,
    })).sort((a, b) => b.score - a.score),
  [buses, drivingEvents]);

  // ── Radar data ─────────────────────────────────────────────────────────────
  const radarData = bus ? [
    { subject: 'Speed Control', A: 100 - (bus.overspeed ? 40 : 10) },
    { subject: 'Braking',       A: 100 - bus.fatigueLevel * 0.4 },
    { subject: 'Turning',       A: 88 },
    { subject: 'Fatigue',       A: 100 - bus.fatigueLevel },
    { subject: 'Route Follow',  A: isOnRoute(bus).onRoute ? 95 : 40 },
    { subject: 'Punctuality',   A: Math.max(60, bus.safetyScore) },
  ] : [];

  // ── Traffic prediction ─────────────────────────────────────────────────────
  const trafficData = [
    { hour: '07:00', delay: 2, traffic: 25 },
    { hour: '07:30', delay: 4, traffic: 45 },
    { hour: '08:00', delay: 10, traffic: 72 },
    { hour: '08:30', delay: 7,  traffic: 60 },
    { hour: '09:00', delay: 3,  traffic: 30 },
    { hour: '09:30', delay: 1,  traffic: 18 },
  ];

  // ── Predictive maintenance ─────────────────────────────────────────────────
  const maintenanceItems = bus ? [
    {
      part: 'Engine', icon: '⚙️', health: bus.engineHealth,
      lastService: '12 May 2025', nextService: '12 Jun 2025',
      status: bus.engineHealth > 70 ? 'Good' : bus.engineHealth > 40 ? 'Fair' : 'Critical',
      prediction: bus.engineHealth < 50 ? '⚠️ Inspection recommended within 7 days' : '✅ No issues predicted',
      trend: Array.from({length:8},(_,i)=> ({ day:`D-${7-i}`, val: Math.max(40, bus.engineHealth - (7-i)*1.2 + Math.random()*3) })),
    },
    {
      part: 'Brakes', icon: '🛑', health: 82,
      lastService: '05 Apr 2025', nextService: '05 Jul 2025',
      status: 'Good',
      prediction: '✅ No issues predicted',
      trend: Array.from({length:8},(_,i)=> ({ day:`D-${7-i}`, val: 82 - (7-i)*0.4 + Math.random()*2 })),
    },
    {
      part: 'Tyres', icon: '🔄', health: 67,
      lastService: '01 Mar 2025', nextService: '01 Jun 2025',
      status: 'Fair',
      prediction: '⚠️ Replacement due in ~3 days',
      trend: Array.from({length:8},(_,i)=> ({ day:`D-${7-i}`, val: 67 - (7-i)*1.8 + Math.random()*2 })),
    },
    {
      part: 'Fuel System', icon: '⛽', health: Math.round(bus.fuelLevel),
      lastService: '—', nextService: 'Refuel when <20%',
      status: bus.fuelLevel < 20 ? 'Critical' : bus.fuelLevel < 40 ? 'Fair' : 'Good',
      prediction: bus.fuelLevel < 30 ? '⛽ Refuel needed soon' : '✅ Fuel level OK',
      trend: Array.from({length:8},(_,i)=> ({ day:`D-${7-i}`, val: Math.max(0, bus.fuelLevel - (7-i)*2 + Math.random()*3) })),
    },
  ] : [];

  // ── Risk zones (Kharagpur) ─────────────────────────────────────────────────
  const riskZones = [
    { zone: 'Kharagpur Station Area',  risk: 'High',   reason: 'Heavy foot traffic + auto rickshaws', time: '07:30–09:00 AM' },
    { zone: 'IIT Main Gate Junction',  risk: 'High',   reason: 'Student pedestrian crossing',         time: '08:00–09:30 AM' },
    { zone: 'Golbazar Market',         risk: 'Medium', reason: 'Morning market congestion',           time: '07:00–09:00 AM' },
    { zone: 'Hijli Level Crossing',    risk: 'High',   reason: 'Railway gate — frequent closures',    time: 'All day' },
    { zone: 'Inda Bypass',             risk: 'Low',    reason: 'Minor speed risk zone',               time: 'All day' },
    { zone: 'NIT Area',                risk: 'Medium', reason: 'Narrow roads + student traffic',      time: '08:00–09:00 AM' },
  ];

  // ── Geofence status per bus ────────────────────────────────────────────────
  const geofenceStatus = buses.map(b => {
    const { onRoute, distFromRoute } = isOnRoute(b);
    const distToSchool = distKm(b.lat, b.lng, SCHOOL.lat, SCHOOL.lng);
    return {
      bus: b, onRoute, distFromRoute,
      inSchoolZone: distToSchool < SCHOOL_ZONE_KM,
      distToSchool,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', border: '1px solid #ddd6fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🤖</span>
          <div>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 20 }}>AI Safe Driving Monitor</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Driver behaviour · Traffic prediction · Geofencing · Predictive maintenance · Risk AI</div>
          </div>
          {geofenceLog.filter(g => g.severity === 'HIGH').length > 0 && (
            <div style={{ marginLeft: 'auto', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#b91c1c', fontWeight: 700 }}>
              🚨 {geofenceLog.filter(g => g.severity === 'HIGH').length} Geofence violation{geofenceLog.filter(g => g.severity === 'HIGH').length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Bus selector */}
      <div style={{ display: 'flex', gap: 10 }}>
        {buses.map(b => {
          const { onRoute } = isOnRoute(b);
          return (
            <button key={b.id} onClick={() => setSelectedBusId(b.id)} style={{
              padding: '8px 16px', borderRadius: 9,
              border: `1.5px solid ${selectedBusId === b.id ? '#8b5cf6' : '#e2e8f0'}`,
              background: selectedBusId === b.id ? '#f5f3ff' : 'white',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: selectedBusId === b.id ? '#6d28d9' : '#475569',
              fontFamily: 'var(--font-dm-sans)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🚌 {b.number}
              {!onRoute && <span style={{ fontSize: 10, background: '#fef2f2', color: '#b91c1c', borderRadius: 4, padding: '1px 5px' }}>Off Route</span>}
            </button>
          );
        })}
      </div>

      {/* Safety scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {buses.map(b => (
          <div key={b.id} className="card" style={{ padding: '16px 20px', border: b.id === selectedBusId ? '1.5px solid #8b5cf6' : undefined }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>🚌 {b.number} Safety</div>
            <div className="stat-num" style={{ color: b.safetyScore > 80 ? '#22c55e' : b.safetyScore > 60 ? '#f59e0b' : '#ef4444', fontSize: '1.8rem' }}>{b.safetyScore}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>/100</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${b.safetyScore}%`, background: b.safetyScore > 80 ? '#22c55e' : b.safetyScore > 60 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>🧑‍✈️ {b.driverName.split(' ')[0]} • Fatigue {b.fatigueLevel}%</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div className="tab-nav" style={{ maxWidth: 600 }}>
            {[
              { id: 'driving',    label: '🧑‍✈️ Driving AI' },
              { id: 'geofence',   label: `📍 Geofencing${geofenceLog.length > 0 ? ` (${geofenceLog.length})` : ''}` },
              { id: 'maintenance',label: '⚙️ Maintenance' },
              { id: 'risk',       label: '⚠️ Risk AI' },
              { id: 'traffic',    label: '🚦 Traffic' },
            ].map(t => (
              <button key={t.id} className={`tab-btn ${aiTab === t.id ? 'active' : ''}`} onClick={() => setAiTab(t.id as any)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: 18 }}>

          {/* ── DRIVING AI ── */}
          {aiTab === 'driving' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Speed History</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={speedHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} interval={4} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 60]} />
                      <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)} km/h`} />
                      <Line type="monotone" dataKey="speed" stroke="#118dee" strokeWidth={2} dot={false} name="Speed" />
                      <Line type="monotone" dataKey="limit" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Limit" />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Driver Behaviour Radar</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Driver Ranking</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {driverRanking.map((d, i) => (
                    <div key={d.bus} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: ['#f59e0b','#94a3b8','#cd7c54'][i] ?? '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({d.bus})</span></div>
                        <div className="progress-bar" style={{ marginTop: 5 }}>
                          <div className="progress-fill" style={{ width: `${d.score}%`, background: d.score > 80 ? '#22c55e' : '#f59e0b' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: d.score > 80 ? '#22c55e' : '#f59e0b' }}>{d.score}/100</div>
                        <div style={{ color: '#94a3b8' }}>{d.events} events</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>AI Detected Events</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Time','Event','Bus','Severity','Risk'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drivingEvents.map((e, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 14px', fontFamily: 'var(--font-jetbrains)', fontSize: 11, color: '#64748b' }}>{e.time}</td>
                        <td style={{ padding: '9px 14px' }}>{e.icon} {e.type}</td>
                        <td style={{ padding: '9px 14px', color: '#64748b' }}>{e.bus}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', width: 60 }}>
                              <div style={{ height: '100%', width: `${e.severity * 10}%`, background: e.severity > 7 ? '#ef4444' : e.severity > 5 ? '#f59e0b' : '#22c55e', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{e.severity}/10</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span className={`badge badge-${e.severity > 7 ? 'red' : e.severity > 5 ? 'amber' : 'green'}`}>{e.severity > 7 ? 'High' : e.severity > 5 ? 'Medium' : 'Low'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── GEOFENCING ── */}
          {aiTab === 'geofence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '14px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13 }}>
                🛰️ <b>Geofencing Active</b> — monitoring all buses against assigned routes and school zone radius (<b>{SCHOOL_ZONE_KM * 1000}m</b> around school).
              </div>

              {/* Live status per bus */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                {geofenceStatus.map(g => (
                  <div key={g.bus.id} style={{
                    padding: '16px', borderRadius: 12,
                    background: !g.onRoute ? '#fef2f2' : g.inSchoolZone ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${!g.onRoute ? '#fecaca' : g.inSchoolZone ? '#bbf7d0' : '#e2e8f0'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>🚌 {g.bus.number}</div>
                      <span className={`badge badge-${!g.onRoute ? 'red' : g.inSchoolZone ? 'green' : 'blue'}`}>
                        {!g.onRoute ? '⚠️ Off Route' : g.inSchoolZone ? '🏫 School Zone' : '✅ On Route'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div>📍 Route: <b style={{ color: '#0f172a' }}>{g.bus.routeName.split('—')[1]?.trim()}</b></div>
                      <div>📏 Dist from route: <b style={{ color: !g.onRoute ? '#ef4444' : '#22c55e' }}>{(g.distFromRoute * 1000).toFixed(0)}m</b></div>
                      <div>🏫 Dist to school: <b style={{ color: '#118dee' }}>{(g.distToSchool * 1000).toFixed(0)}m</b></div>
                      <div>🚗 Speed: <b style={{ color: g.bus.overspeed ? '#ef4444' : '#0f172a' }}>{g.bus.speed.toFixed(0)} km/h</b></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Geofence zones config */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Configured Geofence Zones</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { name: 'School Zone',     type: 'Circular',  radius: '500m',  trigger: 'On Enter', status: 'Active', icon: '🏫' },
                    { name: 'Route A Corridor',type: 'Polyline',  radius: '1.2km', trigger: 'On Exit',  status: 'Active', icon: '🗺️' },
                    { name: 'Route B Corridor',type: 'Polyline',  radius: '1.2km', trigger: 'On Exit',  status: 'Active', icon: '🗺️' },
                    { name: 'Route C Corridor',type: 'Polyline',  radius: '1.2km', trigger: 'On Exit',  status: 'Active', icon: '🗺️' },
                    { name: 'Hijli Level Crossing', type: 'Circular', radius: '200m', trigger: 'On Enter', status: 'Active', icon: '⚠️' },
                  ].map(z => (
                    <div key={z.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 9, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{z.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{z.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{z.type} • Radius: {z.radius} • Trigger: {z.trigger}</div>
                        </div>
                      </div>
                      <span className="badge badge-green">{z.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event log */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
                  Live Event Log {geofenceLog.length > 0 && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>({geofenceLog.length} events)</span>}
                </div>
                {geofenceLog.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: 13, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    ✅ No geofence events yet — all buses on route
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {geofenceLog.map(e => (
                      <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 9,
                        background: e.severity === 'HIGH' ? '#fef2f2' : '#f0fdf4',
                        border: `1px solid ${e.severity === 'HIGH' ? '#fecaca' : '#bbf7d0'}`,
                        fontSize: 13,
                      }}>
                        <span style={{ fontSize: 18 }}>{e.severity === 'HIGH' ? '🚨' : '✅'}</span>
                        <div style={{ flex: 1 }}>
                          <b>{e.bus}</b> — {e.event}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{e.time}</div>
                        <span className={`badge badge-${e.severity === 'HIGH' ? 'red' : 'green'}`}>{e.severity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PREDICTIVE MAINTENANCE ── */}
          {aiTab === 'maintenance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '14px 16px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', fontSize: 13 }}>
                🤖 <b>AI Prediction:</b> {bus?.number} tyres due for service in <b>~3 days</b>. Engine health trending down — recommend inspection if below 60%.
              </div>
              {maintenanceItems.map(item => (
                <div key={item.part} style={{ padding: '16px', borderRadius: 12, background: '#f8fafc', border: `1px solid ${item.status === 'Critical' ? '#fecaca' : item.status === 'Fair' ? '#fde68a' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 26 }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{item.part}</span>
                        <span className={`badge badge-${item.status === 'Good' ? 'green' : item.status === 'Fair' ? 'amber' : 'red'}`}>{item.status}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${item.health}%`, background: item.health > 70 ? '#22c55e' : item.health > 40 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: item.health > 70 ? '#22c55e' : item.health > 40 ? '#f59e0b' : '#ef4444', minWidth: 44, textAlign: 'right' }}>{item.health}%</div>
                  </div>
                  {/* Trend chart */}
                  <ResponsiveContainer width="100%" height={70}>
                    <AreaChart data={item.trend} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${item.part}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={item.health > 70 ? '#22c55e' : item.health > 40 ? '#f59e0b' : '#ef4444'} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={item.health > 70 ? '#22c55e' : item.health > 40 ? '#f59e0b' : '#ef4444'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                      <YAxis domain={[0,100]} tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                      <Area type="monotone" dataKey="val" stroke={item.health > 70 ? '#22c55e' : item.health > 40 ? '#f59e0b' : '#ef4444'} fill={`url(#grad-${item.part})`} strokeWidth={2} dot={false} name="Health" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                    <span>Last service: {item.lastService}</span>
                    <span>Next: {item.nextService}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 500, color: item.prediction.startsWith('⚠️') || item.prediction.startsWith('⛽') ? '#b45309' : '#15803d' }}>
                    {item.prediction}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── AI RISK DETECTION ── */}
          {aiTab === 'risk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Risk score cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                {[
                  { label: 'Route Risk',   value: 'Low',    detail: 'No hazards on active routes',              icon: '🗺️', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
                  { label: 'Driver Risk',  value: bus?.fatigueLevel && bus.fatigueLevel > 50 ? 'High' : 'Medium', detail: `Fatigue: ${bus?.fatigueLevel ?? 0}%`, icon: '🧑‍✈️', color: bus?.fatigueLevel && bus.fatigueLevel > 50 ? '#ef4444' : '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
                  { label: 'Speed Risk',   value: bus?.overspeed ? 'Critical' : 'Low', detail: bus?.overspeed ? `Overspeeding: ${bus?.speed.toFixed(0)} km/h` : 'All buses within limit', icon: '🚗', color: bus?.overspeed ? '#ef4444' : '#22c55e', bg: bus?.overspeed ? '#fef2f2' : '#f0fdf4', border: bus?.overspeed ? '#fecaca' : '#bbf7d0' },
                  { label: 'Weather Risk', value: 'Low',    detail: 'Clear weather — Kharagpur',                icon: '🌤️', color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
                  { label: 'Geofence Risk',value: geofenceLog.filter(g=>g.severity==='HIGH').length > 0 ? 'High' : 'Low', detail: `${geofenceLog.filter(g=>g.severity==='HIGH').length} violations`, icon: '📍', color: geofenceLog.filter(g=>g.severity==='HIGH').length > 0 ? '#ef4444' : '#22c55e', bg: geofenceLog.filter(g=>g.severity==='HIGH').length > 0 ? '#fef2f2' : '#f0fdf4', border: geofenceLog.filter(g=>g.severity==='HIGH').length > 0 ? '#fecaca' : '#bbf7d0' },
                  { label: 'Maintenance',  value: maintenanceItems.some(m=>m.status==='Critical') ? 'Critical' : maintenanceItems.some(m=>m.status==='Fair') ? 'Medium' : 'Low', detail: 'Based on component health', icon: '⚙️', color: maintenanceItems.some(m=>m.status==='Critical') ? '#ef4444' : maintenanceItems.some(m=>m.status==='Fair') ? '#f59e0b' : '#22c55e', bg: '#f8fafc', border: '#e2e8f0' },
                ].map(r => (
                  <div key={r.label} style={{ padding: '16px', borderRadius: 12, background: r.bg, border: `1px solid ${r.border}` }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{r.icon}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{r.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: r.color, margin: '4px 0' }}>{r.value}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{r.detail}</div>
                  </div>
                ))}
              </div>

              {/* Overall risk score */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>OVERALL FLEET RISK</div>
                  <div style={{ fontFamily: 'var(--font-syne)', fontSize: 40, fontWeight: 800, color: '#22c55e', lineHeight: 1 }}>LOW</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>AI Confidence: 91%</div>
                </div>
                <div style={{ flex: 1, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                  🤖 <b>AI Summary:</b> Fleet is operating within safe parameters. Bus 02 driver showing mild fatigue — recommend a 10-minute break at next stop. Tyre wear on Bus 03 approaching replacement threshold. No route deviations currently active.
                </div>
              </div>

              {/* High-risk zones */}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>High-Risk Zones — Kharagpur</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {riskZones.map(z => (
                    <div key={z.zone} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 9, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>📍 {z.zone}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{z.reason} • {z.time}</div>
                      </div>
                      <span className={`badge badge-${z.risk === 'High' ? 'red' : z.risk === 'Medium' ? 'amber' : 'green'}`}>{z.risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TRAFFIC PREDICTION ── */}
          {aiTab === 'traffic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '14px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: 13 }}>
                🤖 <b>AI Prediction:</b> Peak congestion expected at <b>08:00–08:30 AM</b> near <b>Kharagpur Station</b>. Estimated delay: <b>10 minutes</b>. Recommend departing 12 min early or routing via Inda Bypass.
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Expected Delay by Hour</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trafficData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit=" min" />
                    <Tooltip formatter={(v: any) => `${v} min`} />
                    <Bar dataKey="delay" fill="#f59e0b" radius={[4,4,0,0]} name="Delay" />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                {[
                  { label: 'Historical Pattern', value: 'Peak 07:45–08:30', icon: '📊', color: '#118dee' },
                  { label: 'Weather Impact',     value: 'Clear — Low delay', icon: '☀️', color: '#22c55e' },
                  { label: 'AI Confidence',      value: '89%',              icon: '🤖', color: '#8b5cf6' },
                  { label: 'Reroute Suggestion', value: 'Via Inda Bypass',  icon: '🗺️', color: '#f59e0b' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.label}</div>
                    <div style={{ fontWeight: 700, color: item.color, fontSize: 14, marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}