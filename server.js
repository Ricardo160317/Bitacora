// Servidor de la Bitácora Diaria: sirve la app y guarda tus datos
// (tareas, notas, agenda y finanzas) en Postgres, protegidos con una contraseña compartida.
const express = require("express");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "8mb" }));
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

if (!APP_PASSWORD || !SESSION_SECRET) console.error("AVISO: faltan APP_PASSWORD y/o SESSION_SECRET.");
if (!process.env.DATABASE_URL) console.error("AVISO: falta DATABASE_URL.");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false });
const DEFAULT_FINANCE = { budget: 0, movements: [], goals: [], payments: [], cards: [], recurring: [] };
const DEFAULT_STATE = { tasks: [], notes: [], agenda: [], habits: [], futureLog: [], showDone: false, finance: DEFAULT_FINANCE };

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await pool.query(`INSERT INTO app_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING;`, [JSON.stringify(DEFAULT_STATE)]);
}
function sign(payload) { const body = Buffer.from(JSON.stringify(payload)).toString("base64url"); const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url"); return body + "." + sig; }
function verify(token) { if (!token || !SESSION_SECRET) return null; const p = token.split("."); if (p.length !== 2) return null; const [body,sig]=p; const expected=crypto.createHmac("sha256",SESSION_SECRET).update(body).digest("base64url"); const a=Buffer.from(sig),b=Buffer.from(expected); if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null; try{const x=JSON.parse(Buffer.from(body,"base64url").toString()); return x.exp&&Date.now()<=x.exp?x:null;}catch(e){return null;} }
function requireAuth(req,res,next){ if(!verify(req.cookies.session)) return res.status(401).json({error:"no autenticado"}); next(); }

app.post("/api/login",(req,res)=>{ if(!APP_PASSWORD||!SESSION_SECRET)return res.status(500).json({error:"servidor sin credenciales"}); if(!req.body||req.body.password!==APP_PASSWORD)return res.status(401).json({error:"contraseña incorrecta"}); res.cookie("session",sign({exp:Date.now()+SESSION_MAX_AGE_MS}),{httpOnly:true,secure:req.secure,sameSite:"lax",maxAge:SESSION_MAX_AGE_MS}); res.json({ok:true}); });
app.post("/api/logout",(req,res)=>{res.clearCookie("session");res.json({ok:true});});
app.get("/api/state",requireAuth,async(req,res)=>{try{const r=await pool.query("SELECT data FROM app_state WHERE id=1");res.json(r.rows[0]?r.rows[0].data:DEFAULT_STATE);}catch(e){console.error(e);res.status(500).json({error:"error leyendo datos"});}});
app.put("/api/state",requireAuth,async(req,res)=>{try{await pool.query("UPDATE app_state SET data=$1::jsonb, updated_at=now() WHERE id=1",[JSON.stringify(req.body||{})]);res.json({ok:true});}catch(e){console.error(e);res.status(500).json({error:"error guardando datos"});}});

// Finanzas usa una ruta separada para no sobrescribir tareas/agenda si ambos módulos guardan a la vez.
app.get("/api/finance",requireAuth,async(req,res)=>{try{const r=await pool.query("SELECT data->'finance' AS finance FROM app_state WHERE id=1");res.json((r.rows[0]&&r.rows[0].finance)||DEFAULT_FINANCE);}catch(e){console.error(e);res.status(500).json({error:"error leyendo finanzas"});}});
app.put("/api/finance",requireAuth,async(req,res)=>{try{const finance=Object.assign({},DEFAULT_FINANCE,req.body||{});await pool.query("UPDATE app_state SET data=jsonb_set(data,'{finance}',$1::jsonb,true), updated_at=now() WHERE id=1",[JSON.stringify(finance)]);res.json({ok:true});}catch(e){console.error(e);res.status(500).json({error:"error guardando finanzas"});}});

app.use(express.static(path.join(__dirname,"public")));
app.listen(PORT,async()=>{try{await ensureTable();console.log("Tabla app_state lista.");}catch(e){console.error("No se pudo preparar la base de datos:",e.message);}console.log("Bitácora escuchando en el puerto "+PORT);});
