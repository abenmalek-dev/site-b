const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({ connectionString: process.env.DB_STRING });

async function runQuery(sql, binds = []) {
  try {
    const result = await pool.query(sql, binds);
    return { success: true, rows: result.rows };
  } catch (err) {
    return { success: false, error: err.message, rows: [] };
  }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'site-b.html')));

app.get('/api/trips',  async (req, res) => res.json(await runQuery('SELECT * FROM trips ORDER BY tripid')));
app.get('/api/guides', async (req, res) => res.json(await runQuery('SELECT * FROM guides ORDER BY guideid')));
app.get('/api/events', async (req, res) => res.json(await runQuery('SELECT * FROM culturalevents ORDER BY eventid')));
app.get('/api/tables', async (req, res) => res.json(await runQuery(`SELECT table_name AS TABLE_NAME FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`)));

// FIX: Global all-trips — South local + proxy to Site A for North trips
// Requires SITE_A_URL env variable to be set in Railway (same as SITE_B_URL pattern)
app.get('/api/global/all-trips', async (req, res) => {
  try {
    const [southResult, northRes] = await Promise.all([
      runQuery('SELECT * FROM trips'),
      fetch(process.env.SITE_A_URL + '/api/trips').then(r => r.json()).catch(() => ({ rows: [] }))
    ]);
    const allTrips = [
      ...southResult.rows.map(t => ({ ...t, source: 'South' })),
      ...(northRes.rows || []).map(t => ({ ...t, source: 'North' })),
    ];
    res.json({ success: true, rows: allTrips });
  } catch (err) {
    res.json({ success: false, error: err.message, rows: [] });
  }
});

// FIX: Global itinerary — proxy to Site A which holds bookings + tourists
app.get('/api/global/itinerary', async (req, res) => {
  try {
    const response = await fetch(process.env.SITE_A_URL + '/api/global/itinerary');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.json({ success: false, error: 'Cannot reach Site A: ' + err.message, rows: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Site B (South) running on port ${PORT}`));
