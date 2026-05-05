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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Site B (South) running on port ${PORT}`));