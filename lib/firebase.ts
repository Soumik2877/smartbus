// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messaging: Messaging | null = null;

export async function initMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (err) {
    console.warn('FCM not supported:', err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<string | null> {
  if (!('Notification' in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const m = await initMessaging();
  if (!m) return null;
  return getToken(m, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
}

export async function listenForMessages(cb: (payload: unknown) => void) {
  const m = await initMessaging();
  if (!m) return;
  onMessage(m, cb);
}

// ── Server-side: send a push notification ─────────────────────────────────────
// Call from API routes only
export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: { title, body },
      data: data ?? {},
    }),
  });
  return res.json();
}
