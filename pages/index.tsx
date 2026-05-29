// pages/index.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import {
  createInitialBuses, createStudents, createNotifications,
  tickBus, SimBus, SimStudent, SimNotification,
  KOLKATA_ROUTES,
} from '../lib/simulation';
import AdminPanel from '../components/panels/AdminPanel';
import ParentPanel from '../components/panels/ParentPanel';
import DriverPanel from '../components/panels/DriverPanel';
import AIMonitorPanel from '../components/panels/AIMonitorPanel';

type Panel = 'admin' | 'parent' | 'driver' | 'ai';

export default function Home() {
  const [activePanel, setActivePanel] = useState<Panel>('admin');
  const [buses, setBuses] = useState<SimBus[]>([]);
  const [students, setStudents] = useState<SimStudent[]>([]);
  const [notifications, setNotifications] = useState<SimNotification[]>([]);
  const [isSimRunning, setIsSimRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const runTick = useCallback(() => {
    setBuses(prev => prev.map(b => tickBus(b, 2)));
    setTick(t => t + 1);
  }, []);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialise simulation data
  useEffect(() => {
    setBuses(createInitialBuses());
    setStudents(createStudents());
    setNotifications(createNotifications());
  }, []);

  useEffect(() => {
    if (!isSimRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(runTick, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isSimRunning, runTick]);

  // Board/drop student handler
  const handleBoardStudent = useCallback((studentId: string) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, status: 'BOARDED', boardedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
        : s
    ));
    const stu = students.find(s => s.id === studentId);
    if (stu) {
      const note: SimNotification = {
        id: `n-${Date.now()}`, type: 'boarding',
        title: `${stu.name} boarded`,
        body: `Your child boarded at ${stu.stopName} — ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };
      setNotifications(prev => [note, ...prev]);
    }
  }, [students]);

  const handleDropStudent = useCallback((studentId: string) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, status: 'DROPPED', droppedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
        : s
    ));
  }, []);

  // SOS handler
  const handleSOS = useCallback((busId: string, eventType: string) => {
    setBuses(prev => prev.map(b => {
      if (b.id !== busId) return b;
      const alert = {
        id: `al-${Date.now()}`, type: eventType,
        message: `🚨 SOS from ${b.number}: ${eventType} near current location`,
        severity: 'CRITICAL' as const, timestamp: new Date(), resolved: false,
      };
      return { ...b, status: 'EMERGENCY' as const, alerts: [alert, ...b.alerts] };
    }));
    const note: SimNotification = {
      id: `sos-${Date.now()}`, type: 'sos',
      title: '🚨 Emergency Alert',
      body: `SOS triggered on Bus — ${eventType}`,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications(prev => [note, ...prev]);
  }, []);

  const handleResolveAlert = useCallback((busId: string, alertId: string) => {
    setBuses(prev => prev.map(b => {
      if (b.id !== busId) return b;
      return {
        ...b,
        status: 'ON_ROUTE' as const,
        alerts: b.alerts.map(a => a.id === alertId ? { ...a, resolved: true } : a),
      };
    }));
  }, []);

  const handleMarkRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeAlerts = buses.flatMap(b => b.alerts.filter(a => !a.resolved));

  const panels: { id: Panel; label: string; icon: string }[] = [
    { id: 'admin',  label: 'Admin',      icon: '🏫' },
    { id: 'parent', label: 'Parent',     icon: '👨‍👩‍👧' },
    { id: 'driver', label: 'Driver',     icon: '🚌' },
    { id: 'ai',     label: 'AI Monitor', icon: '🤖' },
  ];

  return (
    <>
      <Head>
        <title>Smart School Bus — Kolkata</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚌</text></svg>" />
      </Head>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        {/* ── Top nav ── */}
        <header style={{
          background: 'white', borderBottom: '1px solid #e2e8f0',
          padding: '0 24px', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>🚌</span>
            <div>
              <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 17, color: '#0f172a', lineHeight: 1 }}>
                SmartBus Kolkata
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>School Transport Management</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="pulse-dot" style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isSimRunning ? '#22c55e' : '#94a3b8',
              }} />
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                {isSimRunning ? 'Live' : 'Paused'}
              </span>
            </div>

            {/* Alert badge */}
            {activeAlerts.length > 0 && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '4px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, color: '#b91c1c', fontWeight: 600,
              }}>
                🚨 {activeAlerts.length} alert{activeAlerts.length > 1 ? 's' : ''}
              </div>
            )}

            {/* Pause/Resume */}
            <button
              onClick={() => setIsSimRunning(r => !r)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: '#475569', fontFamily: 'var(--font-dm-sans)',
              }}
            >
              {isSimRunning ? '⏸ Pause' : '▶ Resume'}
            </button>
          </div>
        </header>

        {/* ── Panel tabs ── */}
        <div style={{
          background: 'white', borderBottom: '1px solid #e2e8f0',
          padding: '0 24px', display: 'flex', gap: 0,
        }}>
          {panels.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePanel(p.id)}
              style={{
                padding: '12px 20px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontFamily: 'var(--font-dm-sans)',
                fontSize: 14, fontWeight: 500,
                color: activePanel === p.id ? '#118dee' : '#64748b',
                borderBottom: activePanel === p.id ? '2px solid #118dee' : '2px solid transparent',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{p.icon}</span> {p.label}
              {p.id === 'parent' && unreadCount > 0 && (
                <span style={{
                  background: '#ef4444', color: 'white', borderRadius: '999px',
                  fontSize: 10, fontWeight: 700, padding: '1px 5px', lineHeight: 1.5,
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Panel content ── */}
        <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1600, margin: '0 auto', width: '100%' }}>
          {activePanel === 'admin' && (
            <AdminPanel
              buses={buses}
              students={students}
              alerts={activeAlerts}
              onResolveAlert={handleResolveAlert}
              onBoardStudent={handleBoardStudent}
              onDropStudent={handleDropStudent}
              tick={tick}
            />
          )}
          {activePanel === 'parent' && (
            <ParentPanel
              buses={buses}
              students={students}
              notifications={notifications}
              onMarkRead={handleMarkRead}
            />
          )}
          {activePanel === 'driver' && (
            <DriverPanel
              buses={buses}
              students={students}
              onSOS={handleSOS}
              onBoardStudent={handleBoardStudent}
              onDropStudent={handleDropStudent}
            />
          )}
          {activePanel === 'ai' && (
            <AIMonitorPanel buses={buses} tick={tick} />
          )}
        </main>

        <footer style={{
          textAlign: 'center', padding: '12px 24px',
          borderTop: '1px solid #e2e8f0', background: 'white',
          fontSize: 12, color: '#94a3b8',
        }}>
          Smart School Bus Management System — Kolkata, West Bengal • India Elevate
        </footer>
      </div>
    </>
  );
}
