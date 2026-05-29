# 🚌 Smart School Bus Management System — Kolkata

A full-stack **Next.js** web application simulating a complete Smart School Bus system for Kolkata, West Bengal. Built as a software-only simulation with all features from the India Elevate AFS document, including advanced AI enhancements.

---

## ✨ Features

### Core Simulation Modules
| Module | Description |
|---|---|
| 🗺️ GPS Engine | Live bus markers on OpenStreetMap (Leaflet.js), route lines, trail history |
| ⏱ ETA Engine | Dynamic arrival prediction based on speed, traffic, stops |
| 👦 Student Engine | RFID simulation — one-click Board / Drop with timestamps |
| 📋 Attendance Engine | Live student list, boarding logs, absent tracking |
| 🗺️ Route Engine | 3 Kolkata routes (North, South, East) with stop management |
| 🚨 Alert Engine | SOS, overspeed, geofence, breakdown emergency alerts |
| 🔔 Notification Engine | Firebase Cloud Messaging (FCM) push + in-app notifications |
| 📊 Speed Monitor | Real-time speed tracking, overspeed alerts, violation logs |

### Dashboards
| Panel | Users | Features |
|---|---|---|
| 🏫 Admin Panel | School staff | Fleet map, attendance table, alert management, route overview |
| 👨‍👩‍👧 Parent Panel | Parents | Live child tracking, ETA, boarding status, notification history |
| 🚌 Driver Panel | Bus drivers | LCD dashboard, SOS button, student boarding, trip control |
| 🤖 AI Monitor | Admins | Driver behavior AI, traffic prediction, predictive maintenance, risk detection |

### Advanced Enhancements
- **AI Traffic Prediction** — hourly delay forecasting with bar charts
- **Digital Twin** — full virtual replica of buses, routes, students, drivers
- **Geofencing** — school zone and route deviation alerts
- **Predictive Maintenance** — engine, brakes, tyres, fuel health monitoring
- **AI Risk Detection** — unsafe zones, dangerous driving, risk scoring
- **Driver Behavior Radar** — 6-axis scoring (speed, braking, turning, fatigue, route, punctuality)
- **Voice Assistant** (ready for integration)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, Custom CSS variables |
| Maps | OpenStreetMap + Leaflet.js (free, no API key) |
| Charts | Recharts |
| Database | PostgreSQL via **Supabase** |
| ORM | **Prisma** |
| Real-time | Simulation engine (Socket.IO ready) |
| Push Notifications | **Firebase Cloud Messaging (FCM)** |
| Auth (ready) | JWT / Firebase Auth |
| Hosting | Vercel / Render / Railway |

---

## 🚀 Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd smart-school-bus-management
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **Anon Key** from Project Settings → API
3. Copy the **Database URL** from Project Settings → Database

### 3. Set up Firebase FCM

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project → Add Web App
3. Enable **Cloud Messaging** in Project Settings
4. Copy all config values + Server Key

### 4. Configure environment

```bash
cp .env.local .env.local
# Fill in all values in .env.local
```

### 5. Run Prisma migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 6. Start development server

```bash
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
smartbus/
├── pages/
│   ├── index.tsx              # Main app with panel tabs
│   └── api/
│       ├── notify.ts          # FCM push notification endpoint
│       ├── bus-location.ts    # GPS location storage
│       └── alerts.ts          # Alert CRUD
├── components/
│   ├── map/
│   │   └── LiveMap.tsx        # Leaflet OpenStreetMap component
│   └── panels/
│       ├── AdminPanel.tsx     # School admin dashboard
│       ├── ParentPanel.tsx    # Parent tracking panel
│       ├── DriverPanel.tsx    # Driver LCD dashboard + SOS
│       └── AIMonitorPanel.tsx # AI analytics dashboard
├── lib/
│   ├── simulation.ts          # Digital twin simulation engine
│   ├── supabase.ts            # Supabase client
│   ├── firebase.ts            # Firebase FCM client
│   └── prisma.ts              # Prisma singleton
├── prisma/
│   └── schema.prisma          # Full database schema
├── styles/
│   └── globals.css            # Design tokens + animations
├── .env.local                 # Environment variables (fill this in)
├── tailwind.config.js
└── next.config.js
```

---

## 🗺️ Kolkata Routes

| Route | Stops |
|---|---|
| Route A — North Kolkata | Shyambazar → Shobhabazar → Girish Park → MG Road → Central Ave → School |
| Route B — South Kolkata | Tollygunge → Gariahat → Ballygunge → Elgin Road → School |
| Route C — East Kolkata | Salt Lake Sec V → Salt Lake Sec III → Phoolbagan → Ultadanga → Sealdah → School |

---

## 🔑 Supabase Tables (auto-created by Prisma)

`buses` · `drivers` · `routes` · `stops` · `students` · `parents` · `attendance` · `alerts` · `trips` · `bus_locations` · `speed_violations` · `driving_events` · `notifications`

---

## 📱 Deployment

### Vercel (recommended)
```bash
npm install -g vercel
vercel --prod
# Add all .env.local values in Vercel dashboard → Settings → Environment Variables
```

### Railway
```bash
railway init
railway up
```

---

## 🎓 Credits

Built for **India Elevate** — Empowering Bharat Through Education  
Smart School Bus Management System — Software Simulation  
📧 Info.IndiAelevate@gmail.com | 🌐 www.indiaelevate.co.in
