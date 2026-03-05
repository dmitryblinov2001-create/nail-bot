const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// ─── DB INIT ──────────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "data", "nail.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT    NOT NULL,
    client_tg   TEXT    NOT NULL,
    client_phone TEXT   DEFAULT '',
    comment     TEXT    DEFAULT '',
    service_id  TEXT    NOT NULL,
    master_id   TEXT    NOT NULL,
    date_str    TEXT    NOT NULL,
    time_str    TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'active',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS client_flags (
    tg_id         TEXT PRIMARY KEY,
    no_show_count INTEGER NOT NULL DEFAULT 0,
    flagged       INTEGER NOT NULL DEFAULT 0,
    blocked       INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS closed_days (
    date_key TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ─── CONFIG (mirrors frontend) ─────────────────────────────────────────────────
const CONFIG = {
  services: [
    { id:"1", category:"Маникюр", name:"Классический маникюр", duration:60, price:1500 },
    { id:"2", category:"Маникюр", name:"Аппаратный маникюр",   duration:75, price:2000 },
    { id:"3", category:"Педикюр", name:"Классический педикюр", duration:90, price:2500 },
    { id:"4", category:"Педикюр", name:"СПА-педикюр",          duration:120,price:3500 },
    { id:"5", category:"Дизайн",  name:"Nail Art (1 ноготь)",  duration:30, price:300  },
    { id:"6", category:"Дизайн",  name:"Nail Art (все ногти)", duration:90, price:2000 },
  ],
  masters: [
    { id:"1", name:"Анна",  serviceIds:["1","2","5","6"] },
    { id:"2", name:"Мария", serviceIds:["1","2","3","4","5","6"] },
    { id:"3", name:"Ольга", serviceIds:["3","4"] },
  ],
  schedule: { workDays:[1,2,3,4,5,6], workHours:{ start:10, end:20 }, slotDuration:30, bookingHorizon:30 },
};

// ─── TELEGRAM INIT DATA VALIDATION ────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || "";

function validateTelegramData(initData) {
  if (!BOT_TOKEN || process.env.SKIP_TG_VALIDATION === "true") {
    // Dev mode: skip validation, return mock user
    return { id: 0, first_name: "Dev", username: "dev_user" };
  }
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (expectedHash !== hash) return null;
    const userStr = params.get("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// ─── ADMIN PASSWORD CHECK ─────────────────────────────────────────────────────
function checkAdminPassword(password) {
  const stored = db.prepare("SELECT value FROM settings WHERE key='admin_password'").get();
  const adminPw = stored ? stored.value : (process.env.ADMIN_PASSWORD || "nail2024");
  return password === adminPw;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getService(id) { return CONFIG.services.find(s => s.id === id) || null; }
function getMaster(id)  { return CONFIG.masters.find(m => m.id === id) || null; }

function enrichBooking(row) {
  return {
    id:          row.id,
    clientName:  row.client_name,
    clientTg:    row.client_tg,
    clientPhone: row.client_phone,
    comment:     row.comment,
    service:     getService(row.service_id),
    masterId:    row.master_id,
    dateStr:     row.date_str,
    timeStr:     row.time_str,
    visitStatus: row.status,
    createdAt:   row.created_at,
  };
}

// ─── BOOKINGS API ─────────────────────────────────────────────────────────────

// GET /api/bookings — all bookings (admin)
app.get("/api/bookings", (req, res) => {
  const rows = db.prepare("SELECT * FROM bookings ORDER BY date_str, time_str").all();
  res.json(rows.map(enrichBooking));
});

// GET /api/bookings/my — bookings for a specific tg user
app.get("/api/bookings/my", (req, res) => {
  const tg = req.query.tg;
  if (!tg) return res.status(400).json({ error: "tg required" });
  const rows = db.prepare("SELECT * FROM bookings WHERE client_tg=? ORDER BY date_str DESC, time_str DESC").all(tg);
  res.json(rows.map(enrichBooking));
});

// GET /api/bookings/slots — free slots for a given master + date
app.get("/api/bookings/slots", (req, res) => {
  const { masterId, dateStr } = req.query;
  if (!masterId || !dateStr) return res.status(400).json({ error: "masterId and dateStr required" });

  const bookedRows = db.prepare(
    "SELECT time_str FROM bookings WHERE master_id=? AND date_str=? AND status NOT IN ('cancelled_client','cancelled_master')"
  ).all(masterId, dateStr);
  const bookedSet = new Set(bookedRows.map(r => r.time_str));

  const { start, end, slotDuration } = CONFIG.schedule.workHours
    ? { ...CONFIG.schedule.workHours, slotDuration: CONFIG.schedule.slotDuration }
    : { start: 10, end: 20, slotDuration: 30 };

  const allSlots = [];
  for (let h = start; h < end; h++) {
    for (let m = 0; m < 60; m += slotDuration) {
      allSlots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    }
  }
  res.json({ allSlots, bookedSlots: [...bookedSet] });
});

// POST /api/bookings — create booking
app.post("/api/bookings", (req, res) => {
  const { clientName, clientTg, clientPhone, comment, serviceId, masterId, dateStr, timeStr } = req.body;
  if (!clientName || !clientTg || !serviceId || !masterId || !dateStr || !timeStr)
    return res.status(400).json({ error: "Missing required fields" });

  // Check service exists and master can do it
  const service = getService(serviceId);
  const master  = getMaster(masterId);
  if (!service) return res.status(400).json({ error: "Invalid serviceId" });
  if (!master)  return res.status(400).json({ error: "Invalid masterId" });
  if (!master.serviceIds.includes(serviceId))
    return res.status(400).json({ error: "Master does not offer this service" });

  // Check client not blocked
  const flag = db.prepare("SELECT * FROM client_flags WHERE tg_id=?").get(clientTg);
  if (flag && flag.blocked)
    return res.status(403).json({ error: "Client is blocked", blocked: true });

  // Check slot not taken
  const existing = db.prepare(
    "SELECT id FROM bookings WHERE master_id=? AND date_str=? AND time_str=? AND status NOT IN ('cancelled_client','cancelled_master')"
  ).get(masterId, dateStr, timeStr);
  if (existing) return res.status(409).json({ error: "Slot already taken" });

  // Check day not closed
  const closed = db.prepare("SELECT date_key FROM closed_days WHERE date_key=?").get(dateStr);
  if (closed) return res.status(409).json({ error: "Day is closed" });

  const result = db.prepare(
    "INSERT INTO bookings (client_name, client_tg, client_phone, comment, service_id, master_id, date_str, time_str, status) VALUES (?,?,?,?,?,?,?,?,?)"
  ).run(clientName, clientTg, clientPhone||"", comment||"", serviceId, masterId, dateStr, timeStr, "active");

  res.json({ id: result.lastInsertRowid, ok: true });
});

// PATCH /api/bookings/:id/status — update visit status
app.patch("/api/bookings/:id/status", (req, res) => {
  const { status } = req.body;
  const validStatuses = ["active","done","noshow","cancelled_client","cancelled_master"];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  const booking = db.prepare("SELECT * FROM bookings WHERE id=?").get(req.params.id);
  if (!booking) return res.status(404).json({ error: "Not found" });

  db.prepare("UPDATE bookings SET status=? WHERE id=?").run(status, req.params.id);

  // Auto-increment no-show counter
  if (status === "noshow" && booking.status !== "noshow") {
    const tg = booking.client_tg;
    const cur = db.prepare("SELECT * FROM client_flags WHERE tg_id=?").get(tg)
      || { tg_id: tg, no_show_count: 0, flagged: 0, blocked: 0 };
    const newCount = cur.no_show_count + 1;
    // FIX: use ?? instead of || to handle 0 correctly; preserve existing blocked value
    db.prepare(
      "INSERT INTO client_flags (tg_id, no_show_count, flagged, blocked, updated_at) VALUES (?,?,?,?,datetime('now')) ON CONFLICT(tg_id) DO UPDATE SET no_show_count=?, flagged=?, updated_at=datetime('now')"
    ).run(tg, newCount, newCount >= 3 ? 1 : 0, cur.blocked ?? 0, newCount, newCount >= 3 ? 1 : 0);
  }

  res.json({ ok: true });
});

// PATCH /api/bookings/:id/cancel — client cancels own booking
app.patch("/api/bookings/:id/cancel", (req, res) => {
  const { tg } = req.body;
  const booking = db.prepare("SELECT * FROM bookings WHERE id=?").get(req.params.id);
  if (!booking) return res.status(404).json({ error: "Not found" });
  if (booking.client_tg !== tg && !req.body.adminOverride)
    return res.status(403).json({ error: "Not your booking" });

  db.prepare("UPDATE bookings SET status='cancelled_client' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ─── CLIENT FLAGS API ──────────────────────────────────────────────────────────

// GET /api/flags — all flags (admin)
app.get("/api/flags", (req, res) => {
  const rows = db.prepare("SELECT * FROM client_flags").all();
  const map = {};
  rows.forEach(r => {
    map[r.tg_id] = { noShowCount: r.no_show_count, flagged: !!r.flagged, blocked: !!r.blocked };
  });
  res.json(map);
});

// PUT /api/flags/:tgId — set/update flags (admin)
app.put("/api/flags/:tgId", (req, res) => {
  const { noShowCount, flagged, blocked } = req.body;
  const tg = decodeURIComponent(req.params.tgId);
  db.prepare(
    "INSERT INTO client_flags (tg_id, no_show_count, flagged, blocked, updated_at) VALUES (?,?,?,?,datetime('now')) ON CONFLICT(tg_id) DO UPDATE SET no_show_count=?, flagged=?, blocked=?, updated_at=datetime('now')"
  // FIX: use ?? 0 instead of ||0 so that noShowCount=0 is preserved correctly
  ).run(tg, noShowCount ?? 0, flagged?1:0, blocked?1:0, noShowCount ?? 0, flagged?1:0, blocked?1:0);
  res.json({ ok: true });
});

// ─── CLOSED DAYS API ──────────────────────────────────────────────────────────

// GET /api/closed-days
app.get("/api/closed-days", (req, res) => {
  const rows = db.prepare("SELECT date_key FROM closed_days").all();
  res.json(rows.map(r => r.date_key));
});

// POST /api/closed-days
app.post("/api/closed-days", (req, res) => {
  const { dateKey } = req.body;
  if (!dateKey) return res.status(400).json({ error: "dateKey required" });
  db.prepare("INSERT OR IGNORE INTO closed_days (date_key) VALUES (?)").run(dateKey);
  res.json({ ok: true });
});

// DELETE /api/closed-days/:dateKey
app.delete("/api/closed-days/:dateKey", (req, res) => {
  db.prepare("DELETE FROM closed_days WHERE date_key=?").run(req.params.dateKey);
  res.json({ ok: true });
});

// ─── ADMIN AUTH ────────────────────────────────────────────────────────────────

// POST /api/admin/login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });
  if (checkAdminPassword(password)) {
    res.json({ ok: true, token: Buffer.from(`nail:${password}:${Date.now()}`).toString("base64") });
  } else {
    res.status(401).json({ error: "Wrong password" });
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), bookings: db.prepare("SELECT COUNT(*) as c FROM bookings").get().c });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Nail Bot API running on port ${PORT}`));
