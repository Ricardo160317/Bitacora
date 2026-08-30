// Servidor de la Bitácora Diaria: sirve la app y guarda tus datos
// (tareas, notas, agenda) en una base de datos Postgres, protegidos con
// una contraseña compartida. Así puedes abrir la misma bitácora desde tu
// tablet, tu celular o tu PC.

const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.set("trust proxy", 1); // Railway está detrás de un proxy: necesario para saber si la conexión es https
app.use(express.json({ limit: "8mb" })); // las notas a mano (S Pen) pueden pesar varios MB
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

if (!APP_PASSWORD || !SESSION_SECRET) {
  console.error(
    "AVISO: faltan variables de entorno APP_PASSWORD y/o SESSION_SECRET. " +
    "Configúralas en Railway → tu servicio → Variables. El login no va a funcionar sin ellas."
  );
}
if (!process.env.DATABASE_URL) {
  console.error(
    "AVISO: falta la variable DATABASE_URL. Agrega el plugin de PostgreSQL en Railway " +
    "y conéctala en Variables (ver README)."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const DEFAULT_STATE = { tasks: [], notes: [], agenda: [], showDone: false };

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `INSERT INTO app_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING;`,
    [JSON.stringify(DEFAULT_STATE)]
  );
}

// ---- Sesión: cookie firmada, sin dependencias extra ----

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return body + "." + sig;
}

function verify(token) {
  if (!token || !SESSION_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const payload = verify(req.cookies.session);
  if (!payload) return res.status(401).json({ error: "no autenticado" });
  next();
}

// ---- Rutas ----

app.post("/api/login", (req, res) => {
  if (!APP_PASSWORD || !SESSION_SECRET) {
    return res.status(500).json({ error: "el servidor no tiene APP_PASSWORD/SESSION_SECRET configurados" });
  }
  const password = req.body && req.body.password;
  if (typeof password !== "string" || password !== APP_PASSWORD) {
    return res.status(401).json({ error: "contraseña incorrecta" });
  }
  const token = sign({ exp: Date.now() + SESSION_MAX_AGE_MS });
  res.cookie("session", token, {
    httpOnly: true,
    secure: req.secure,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS
  });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});

app.get("/api/state", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM app_state WHERE id = 1");
    res.json(result.rows[0] ? result.rows[0].data : DEFAULT_STATE);
  } catch (e) {
    console.error("Error leyendo estado:", e);
    res.status(500).json({ error: "error leyendo datos" });
  }
});

app.put("/api/state", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE app_state SET data = $1::jsonb, updated_at = now() WHERE id = 1",
      [JSON.stringify(req.body || {})]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error("Error guardando estado:", e);
    res.status(500).json({ error: "error guardando datos" });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, async () => {
  try {
    await ensureTable();
    console.log("Tabla app_state lista.");
  } catch (e) {
    console.error("No se pudo preparar la base de datos:", e.message);
  }
  console.log("Bitácora escuchando en el puerto " + PORT);
});
