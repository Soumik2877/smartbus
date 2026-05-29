// lib/simulation.ts — updated for Kharagpur routes
// Replace entire lib/simulation.ts with this file

export interface LatLng { lat: number; lng: number }

export interface SimBus {
  id: string;
  number: string;
  plate: string;
  driverName: string;
  routeName: string;
  status: 'IDLE' | 'ON_ROUTE' | 'STOPPED' | 'BREAKDOWN' | 'EMERGENCY';
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  studentCount: number;
  capacity: number;
  engineHealth: number;
  fuelLevel: number;
  safetyScore: number;
  fatigueLevel: number;
  currentStopIndex: number;
  eta: number;
  tripProgress: number;
  overspeed: boolean;
  alerts: SimAlert[];
  locationHistory: LatLng[];
}

export interface SimAlert {
  id: string;
  type: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  resolved: boolean;
}

export interface SimStop {
  name: string;
  lat: number;
  lng: number;
  studentsBoarded: number;
}

// ── Kharagpur routes (real coordinates) ──────────────────────────────────────

export const KOLKATA_ROUTES: Record<string, SimStop[]> = {
  'Route A — IIT Zone': [
    { name: 'IIT Kharagpur Main Gate', lat: 22.3190, lng: 87.3091, studentsBoarded: 0 },
    { name: 'Technology Market', lat: 22.3218, lng: 87.3150, studentsBoarded: 0 },
    { name: 'Kharagpur Station', lat: 22.3460, lng: 87.3199, studentsBoarded: 0 },
    { name: 'Inda', lat: 22.3512, lng: 87.3227, studentsBoarded: 0 },
    { name: 'Malviya Colony', lat: 22.3356, lng: 87.3183, studentsBoarded: 0 },
    { name: 'School (Kharagpur Town)', lat: 22.3302, lng: 87.3237, studentsBoarded: 0 },
  ],
  'Route B — Golbazar Zone': [
    { name: 'Golbazar', lat: 22.3624, lng: 87.3142, studentsBoarded: 0 },
    { name: 'Barakola', lat: 22.3558, lng: 87.3160, studentsBoarded: 0 },
    { name: 'Nimpura', lat: 22.3489, lng: 87.3175, studentsBoarded: 0 },
    { name: 'CDA Colony', lat: 22.3421, lng: 87.3191, studentsBoarded: 0 },
    { name: 'School (Kharagpur Town)', lat: 22.3302, lng: 87.3237, studentsBoarded: 0 },
  ],
  'Route C — Hijli Zone': [
    { name: 'Hijli', lat: 22.2981, lng: 87.2967, studentsBoarded: 0 },
    { name: 'Hijli Cooperative', lat: 22.3052, lng: 87.3012, studentsBoarded: 0 },
    { name: 'Ramnagar', lat: 22.3124, lng: 87.3058, studentsBoarded: 0 },
    { name: 'NIT Area', lat: 22.3198, lng: 87.3098, studentsBoarded: 0 },
    { name: 'Matigara', lat: 22.3245, lng: 87.3168, studentsBoarded: 0 },
    { name: 'School (Kharagpur Town)', lat: 22.3302, lng: 87.3237, studentsBoarded: 0 },
  ],
};

function makeAlertId() {
  return Math.random().toString(36).slice(2, 9);
}

export function createInitialBuses(): SimBus[] {
  const routes = Object.keys(KOLKATA_ROUTES);
  return [
    {
      id: 'bus-001', number: 'Bus 01', plate: 'WB-28-AB-1234',
      driverName: 'Ramesh Gupta', routeName: routes[0],
      status: 'ON_ROUTE', lat: 22.3190, lng: 87.3091,
      speed: 28, heading: 45, studentCount: 18, capacity: 40,
      engineHealth: 87, fuelLevel: 68, safetyScore: 91, fatigueLevel: 12,
      currentStopIndex: 0, eta: 8, tripProgress: 10,
      overspeed: false, alerts: [], locationHistory: [],
    },
    {
      id: 'bus-002', number: 'Bus 02', plate: 'WB-28-CD-5678',
      driverName: 'Suresh Mondal', routeName: routes[1],
      status: 'ON_ROUTE', lat: 22.3624, lng: 87.3142,
      speed: 24, heading: 180, studentCount: 24, capacity: 40,
      engineHealth: 94, fuelLevel: 82, safetyScore: 78, fatigueLevel: 34,
      currentStopIndex: 0, eta: 12, tripProgress: 5,
      overspeed: false, alerts: [], locationHistory: [],
    },
    {
      id: 'bus-003', number: 'Bus 03', plate: 'WB-28-EF-9012',
      driverName: 'Amit Chatterjee', routeName: routes[2],
      status: 'STOPPED', lat: 22.3052, lng: 87.3012,
      speed: 0, heading: 90, studentCount: 31, capacity: 40,
      engineHealth: 72, fuelLevel: 45, safetyScore: 85, fatigueLevel: 22,
      currentStopIndex: 1, eta: 3, tripProgress: 20,
      overspeed: false, alerts: [], locationHistory: [],
    },
  ];
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function calcHeading(from: LatLng, to: LatLng): number {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

export function tickBus(bus: SimBus, deltaT: number): SimBus {
  if (bus.status === 'IDLE' || bus.status === 'EMERGENCY') return bus;

  const stops = KOLKATA_ROUTES[bus.routeName];
  if (!stops || bus.currentStopIndex >= stops.length - 1) return bus;

  const from = stops[bus.currentStopIndex];
  const to   = stops[bus.currentStopIndex + 1];

  let newSpeed = bus.speed + (Math.random() - 0.48) * 5;
  newSpeed = Math.max(0, Math.min(55, newSpeed));
  if (bus.status === 'STOPPED') newSpeed = 0;

  const distLat = to.lat - bus.lat;
  const distLng = to.lng - bus.lng;
  const dist    = Math.sqrt(distLat * distLat + distLng * distLng);
  // Larger step so movement is visible on screen
  const step    = Math.max(0.0003, (newSpeed / 3600) * deltaT * 0.00012);

  let newLat = bus.lat;
  let newLng = bus.lng;
  let newStopIndex = bus.currentStopIndex;
  let newStatus = bus.status;
  let newEta = bus.eta;

  if (dist < 0.0006) {
    newLat = to.lat;
    newLng = to.lng;
    newStopIndex = bus.currentStopIndex + 1;
    newSpeed = 0;
    newStatus = 'STOPPED';
    newEta = 3;
    if (newStopIndex >= stops.length - 1) newStatus = 'IDLE';
  } else {
    newLat = bus.lat + (distLat / dist) * step;
    newLng = bus.lng + (distLng / dist) * step;
    newStatus = newSpeed > 0 ? 'ON_ROUTE' : 'STOPPED';
    newEta = Math.max(1, Math.round((dist / step) * deltaT / 60));
  }

  // Resume from stop
  if (bus.status === 'STOPPED' && Math.random() > 0.65) {
    newStatus = 'ON_ROUTE';
    newSpeed = 12 + Math.random() * 14;
  }

  const SPEED_LIMIT = 40;
  const overspeed = newSpeed > SPEED_LIMIT;

  const newFatigue = Math.min(100, bus.fatigueLevel + (Math.random() > 0.95 ? 1 : 0));
  const newFuel    = Math.max(0, bus.fuelLevel - (newSpeed > 0 ? 0.004 : 0));

  const totalStops = stops.length - 1;
  const progress   = Math.round((newStopIndex / totalStops) * 100);

  const newHistory = [...bus.locationHistory.slice(-49), { lat: newLat, lng: newLng }];

  const heading = dist > 0.0001
    ? calcHeading({ lat: bus.lat, lng: bus.lng }, { lat: newLat, lng: newLng })
    : bus.heading;

  let newAlerts = bus.alerts.filter(a => !a.resolved);
  if (overspeed && !newAlerts.some(a => a.type === 'OVERSPEED')) {
    newAlerts = [...newAlerts, {
      id: makeAlertId(), type: 'OVERSPEED',
      message: `${bus.number} exceeded speed limit: ${newSpeed.toFixed(0)} km/h`,
      severity: 'HIGH' as const, timestamp: new Date(), resolved: false,
    }];
  }
  if (!overspeed) newAlerts = newAlerts.filter(a => a.type !== 'OVERSPEED');

  return {
    ...bus,
    lat: newLat, lng: newLng,
    speed: newSpeed, heading,
    status: newStatus,
    currentStopIndex: newStopIndex,
    eta: newEta,
    tripProgress: Math.min(progress, 100),
    overspeed,
    fatigueLevel: newFatigue,
    fuelLevel: newFuel,
    locationHistory: newHistory,
    alerts: newAlerts,
  };
}

export interface SimStudent {
  id: string;
  name: string;
  roll: string;
  class: string;
  busId: string;
  status: 'PENDING' | 'BOARDED' | 'DROPPED' | 'ABSENT';
  boardedAt?: string;
  droppedAt?: string;
  stopName: string;
  parentName: string;
  parentPhone: string;
}

export function createStudents(): SimStudent[] {
  const names = [
    'Aarav Das','Priya Bose','Rohan Ghosh','Sneha Mukherjee','Arjun Sen',
    'Diya Chatterjee','Karan Roy','Ananya Dutta','Vikram Pal','Shreya Sinha',
    'Rahul Mondal','Pooja Sharma','Saurav Kundu','Ritu Chakraborty','Nikhil Banerjee',
    'Aishwarya Nandi','Deepak Paul','Meghna Gupta','Souvik Mitra','Taniya Biswas',
    'Amit Hazra','Kavita Patra','Suresh Koley','Deepa Rana','Tapas Majumdar',
    'Priyanka Giri','Akash Sarkar','Moumita Das','Rajesh Shaw','Sunita Dey',
  ];
  const routes = Object.keys(KOLKATA_ROUTES);
  const buses  = ['bus-001', 'bus-002', 'bus-003'];

  return names.map((name, i) => ({
    id:     `stu-${String(i + 1).padStart(3, '0')}`,
    name,
    roll:   `2024${String(i + 1).padStart(3, '0')}`,
    class:  `Class ${Math.floor(Math.random() * 5) + 6}`,
    busId:  buses[i % 3],
    status: i < 22 ? 'BOARDED' : i < 26 ? 'DROPPED' : 'PENDING',
    boardedAt:  i < 22 ? '07:45 AM' : undefined,
    droppedAt:  i < 26 && i >= 22 ? '08:30 AM' : undefined,
    stopName: KOLKATA_ROUTES[routes[i % 3]][
      Math.floor(Math.random() * (KOLKATA_ROUTES[routes[i % 3]].length - 1))
    ].name,
    parentName:  `Parent of ${name.split(' ')[0]}`,
    parentPhone: `98${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
  }));
}

export interface SimNotification {
  id: string;
  title: string;
  body: string;
  type: 'boarding' | 'drop' | 'alert' | 'eta' | 'sos';
  time: string;
  read: boolean;
}

export function createNotifications(): SimNotification[] {
  return [
    { id: 'n1', title: 'Aarav Das boarded', body: 'Your child boarded Bus 01 at IIT Main Gate — 07:45 AM', type: 'boarding', time: '07:45 AM', read: false },
    { id: 'n2', title: 'Bus 01 ETA update', body: 'Bus 01 will arrive at school in approximately 8 minutes', type: 'eta', time: '07:50 AM', read: false },
    { id: 'n3', title: 'Priya Bose boarded', body: 'Your child boarded Bus 02 at Golbazar — 07:42 AM', type: 'boarding', time: '07:42 AM', read: true },
    { id: 'n4', title: '⚠️ Speed alert', body: 'Bus 02 exceeded speed limit near Nimpura (46 km/h)', type: 'alert', time: '07:55 AM', read: false },
    { id: 'n5', title: 'Rohan Ghosh dropped', body: 'Your child was safely dropped at school — 08:30 AM', type: 'drop', time: '08:30 AM', read: true },
  ];
}