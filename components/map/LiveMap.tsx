// components/map/LiveMap.tsx
// Fixed: uses next/script + useEffect to load Leaflet properly in Next.js

import { useEffect, useRef, useState } from 'react';
import { SimBus, KOLKATA_ROUTES } from '../../lib/simulation';

interface Props {
  buses: SimBus[];
  selectedBusId?: string;
  onSelectBus?: (id: string) => void;
  height?: number;
}

export default function LiveMap({ buses, selectedBusId, onSelectBus, height = 420 }: Props) {
  const mapRef           = useRef<any>(null);
  const markersRef       = useRef<Record<string, any>>({});
  const historyLinesRef  = useRef<Record<string, any>>({});
  const containerRef     = useRef<HTMLDivElement>(null);
  const [leafletReady, setLeafletReady]   = useState(false);
  const [mapReady,     setMapReady]       = useState(false);

  // ── Step 1: inject Leaflet CSS + JS once ────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link');
      link.id     = 'leaflet-css';
      link.rel    = 'stylesheet';
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // JS — only load once
    if ((window as any).L) { setLeafletReady(true); return; }
    if (document.getElementById('leaflet-js')) return;

    const script    = document.createElement('script');
    script.id       = 'leaflet-js';
    script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async    = true;
    script.onload   = () => setLeafletReady(true);
    document.body.appendChild(script);
  }, []);

  // ── Step 2: initialise the map once Leaflet is ready ────────────────────────
  useEffect(() => {
    if (!leafletReady || !containerRef.current || mapRef.current) return;

    const L   = (window as any).L;
    const map = L.map(containerRef.current, {
      center: [22.330, 87.310],
      zoom:        13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // School marker
    const schoolIcon = L.divIcon({
      html:      '<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35))">🏫</div>',
      iconSize:  [30, 30],
      iconAnchor:[15, 15],
      className: '',
    });
    L.marker([22.3302, 87.3237], { icon: schoolIcon })
      .bindPopup('<b>DPS Kolkata</b><br>Park Street')
      .addTo(map);

    // Route lines + stop markers
    const colors = ['#118dee', '#22c55e', '#f59e0b'];
    Object.entries(KOLKATA_ROUTES).forEach(([routeName, stops], i) => {
      const color  = colors[i % colors.length];
      const latlngs = stops.map(s => [s.lat, s.lng] as [number, number]);

      L.polyline(latlngs, { color, weight: 3, opacity: 0.4, dashArray: '7 5' }).addTo(map);

      stops.forEach(stop => {
        const stopIcon = L.divIcon({
          html:      `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25)"></div>`,
          iconSize:  [10, 10],
          iconAnchor:[5, 5],
          className: '',
        });
        L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .bindPopup(`<b>${stop.name}</b><br><span style="color:#64748b;font-size:12px">${routeName}</span>`)
          .addTo(map);
      });
    });

    mapRef.current = map;
    setMapReady(true);
  }, [leafletReady]);

  // ── Step 3: update bus markers on every simulation tick ─────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    buses.forEach(bus => {
      const isSelected = bus.id === selectedBusId;
      const color =
        bus.status === 'EMERGENCY' || bus.overspeed ? '#ef4444' :
        bus.status  === 'STOPPED'  ? '#f59e0b' : '#118dee';
      const size = isSelected ? 44 : 36;

      const busHtml = `
        <div style="
          width:${size}px;height:${size}px;
          background:${color};border-radius:10px;
          border:3px solid white;
          box-shadow:0 2px 12px rgba(0,0,0,${isSelected ? '0.45' : '0.22'});
          display:flex;align-items:center;justify-content:center;
          font-size:${isSelected ? 24 : 19}px;
          cursor:pointer;
          transition:all 0.4s ease;
        ">🚌</div>`;

      const icon = L.divIcon({
        html:      busHtml,
        iconSize:  [size, size],
        iconAnchor:[size / 2, size / 2],
        className: '',
      });

      if (markersRef.current[bus.id]) {
        markersRef.current[bus.id].setLatLng([bus.lat, bus.lng]);
        markersRef.current[bus.id].setIcon(icon);
      } else {
        const marker = L.marker([bus.lat, bus.lng], { icon })
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:165px;line-height:1.6">
              <b style="font-size:14px">${bus.number}</b><br>
              <span style="color:#64748b;font-size:12px">${bus.routeName}</span><br><br>
              🚗 Speed: <b>${bus.speed.toFixed(0)} km/h</b>${bus.overspeed ? ' ⚠️' : ''}<br>
              👦 Students: <b>${bus.studentCount}/${bus.capacity}</b><br>
              ⏱ ETA: <b>${bus.eta} min</b><br>
              🧑‍✈️ Driver: <b>${bus.driverName}</b>
            </div>
          `)
          .addTo(mapRef.current);
        marker.on('click', () => onSelectBus?.(bus.id));
        markersRef.current[bus.id] = marker;
      }

      // Trail line
      if (bus.locationHistory.length > 1) {
        const coords = bus.locationHistory.map(l => [l.lat, l.lng] as [number, number]);
        if (historyLinesRef.current[bus.id]) {
          historyLinesRef.current[bus.id].setLatLngs(coords);
        } else {
          historyLinesRef.current[bus.id] = L.polyline(coords, {
            color, weight: 2.5, opacity: 0.55,
          }).addTo(mapRef.current);
        }
      }
    });
  }, [buses, selectedBusId, onSelectBus, mapReady]);

  // ── Step 4: pan to selected bus ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedBusId) return;
    const bus = buses.find(b => b.id === selectedBusId);
    if (bus) mapRef.current.panTo([bus.lat, bus.lng], { animate: true, duration: 0.6 });
  }, [selectedBusId, mapReady, buses]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
        historyLinesRef.current = {};
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height }}>
      {/* Map container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#e8edf2' }} />

      {/* Loading overlay */}
      {!mapReady && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f1f5f9', borderRadius: 12,
          flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontSize: 32 }}>🗺️</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Loading Kolkata map...</div>
        </div>
      )}

      {/* Legend */}
      {mapReady && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
          background: 'rgba(255,255,255,0.96)', borderRadius: 10,
          padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: 11, display: 'flex', flexDirection: 'column', gap: 5,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.8)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 10, color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 2 }}>
            MAP LEGEND
          </div>
          {[
            ['#118dee', 'Route A — North'],
            ['#22c55e', 'Route B — South'],
            ['#f59e0b', 'Route C — East'],
          ].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 3, background: c, borderRadius: 2 }} />
              <span style={{ color: '#475569' }}>{l}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}