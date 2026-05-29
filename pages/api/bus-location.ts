// pages/api/bus-location.ts
// POST /api/bus-location — store GPS coordinates into Supabase
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { busId, lat, lng, speed, heading } = req.body;
  if (!busId || lat == null || lng == null) {
    return res.status(400).json({ error: 'busId, lat and lng are required' });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bus_locations')
    .insert({ bus_id: busId, lat, lng, speed: speed ?? 0, heading: heading ?? 0 });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ ok: true, data });
}
