// pages/api/alerts.ts
// GET  /api/alerts        — list active alerts
// POST /api/alerts        — create a new alert
// PATCH /api/alerts/[id]  — resolve an alert
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClient } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { busId, type, severity, message, lat, lng } = req.body;
    if (!busId || !type || !message) return res.status(400).json({ error: 'busId, type and message required' });
    const { data, error } = await supabase
      .from('alerts')
      .insert({ bus_id: busId, type, severity: severity ?? 'MEDIUM', message, lat, lng });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ ok: true, data });
  }

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const { data, error } = await supabase
      .from('alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
