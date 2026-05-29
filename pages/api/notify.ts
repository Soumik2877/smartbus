// pages/api/notify.ts
// POST /api/notify — send a Firebase Cloud Messaging push notification
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fcmToken, title, body, data } = req.body;
  if (!fcmToken || !title || !body) {
    return res.status(400).json({ error: 'fcmToken, title and body are required' });
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
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
    const result = await response.json();
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
