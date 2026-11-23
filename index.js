// ================= NETHU AI WHATSAPP BOT (2 device) =================
import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { MongoClient } from 'mongodb';
import ytSearch from 'yt-search';
import ytdl from '@distube/ytdl-core';
import baileys from '@whiskeysockets/baileys';
const { default: makeWASocket, initAuthCreds, BufferJSON, proto, Browsers, DisconnectReason,
  fetchLatestBaileysVersion, downloadMediaMessage, jidNormalizedUser } = baileys;

// ---------- මෙතනට ඔයාගේ MongoDB URL එක දාන්න ----------
const DEFAULT_MONGO = 'mongodb+srv://diniduheshan2007_db_user:SZD7sfcIU6Einajx@cluster0.ah8jggk.mongodb.net/dark-dinu?retryWrites=true&w=majority&appName=Cluster0';
// -------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nethu123'; // වෙනස් කරන්න!
const PORT = process.env.PORT || 3000;
const logger = pino({ level: 'silent' });

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8')); } catch {}
const MONGO_URL = process.env.MONGODB_URL || cfg.mongoUrl || DEFAULT_MONGO;

const mongo = new MongoClient(MONGO_URL);
await mongo.connect();
const db = mongo.db();
console.log('✅ MongoDB connected');

// ---------- Settings ----------
const DEF = { botName: 'Nethu', owner: '', sudo: '', logo: '', geminiKey: '', model: 'gemini-2.0-flash' };
let S = { ...DEF, ...((await db.collection('settings').findOne({ _id: 'main' })) || {}) };
delete S._id;
const saveSettings = () => db.collection('settings').replaceOne({ _id: 'main' }, { _id: 'main', ...S }, { upsert: true });
const digits = (x = '') => String(x).replace(/\D/g, '');
const sudoList = () => [S.owner, ...String(S.sudo).split(',')].map(digits).filter(Boolean);

// ---------- Mongo auth state ----------
async function useMongoAuth(col, sid) {
  const w = (k, d) => col.replaceOne({ _id: `${sid}:${k}` }, { d: JSON.stringify(d, BufferJSON.replacer) }, { upsert: true });
  const r = async k => { const x = await col.findOne({ _id: `${sid}:${k}` }); return x ? JSON.parse(x.d, BufferJSON.reviver) : null; };
  const creds = (await r('creds')) || initAuthCreds();
  return {
    state: { creds, keys: {
      get: async (type, ids) => { const o = {};
        await Promise.all(ids.map(async id => { let v = await r(`${type}-${id}`);
          if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v); o[id] = v; }));
        return o; },
      set: async data => { await Promise.all(Object.entries(data).flatMap(([t, m]) => Object.entries(m).map(([id, v]) =>
        v ? w(`${t}-${id}`, v) : col.deleteOne({ _id: `${sid}:${t}-${id}` })))); }
    } },
    saveCreds: () => w('creds', creds)
  };
}

// ---------- AI (Gemini) ----------
const SYS = () => `ඔබ "${S.botName}" නම් WhatsApp AI සහායිකාවයි. පරිශීලකයාගේ පණිවිඩය තේරුම් අරගෙන JSON පමණක් දෙන්න:
{"action":"chat|song|set_name|set_bio|set_dp|none","query":"","value":"","reply":""}
- song: සින්දුවක් ඉල්ලුවොත් (query = සින්දුවේ නම/ගායකයා)
- set_name: WhatsApp නම වෙනස් කරන්න (value = අලුත් නම)
- set_bio: about/bio වෙනස් කරන්න (value = අලුත් bio)
- set_dp: profile picture වෙනස් කරන්න (රූපයක් අවශ්‍යයි)
- chat: සාමාන්‍ය කතාබහ (reply = පිළිතුර)
පරිශීලකයා කතා කරන භාෂාවෙන් (සිංහල/English/Singlish) කෙටි, මිත්‍රශීලී reply එකක් "reply" හි දෙන්න.`;

async function ai(text, hasImage) {
  if (!S.geminiKey) return { action: 'chat', reply: '⚠️ Gemini API key එක settings වල දාලා නෑ.' };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${S.model}:generateContent?key=${S.geminiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS() }] },
      contents: [{ role: 'user', parts: [{ text: `${text}\n(රූපයක් ${hasImage ? 'ඇත' : 'නැත'})` }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 } })
  });
  const j = await r.json();
  const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!t) return { action: 'chat', reply: '⚠️ AI error: ' + (j?.error?.message || 'no response') };
  try { return JSON.parse(t.replace(/```json|```/g, '').trim()); } catch { return { action: 'chat', reply: t }; }
}

async function getSong(q) {
  const res = await ytSearch(q); const v = res.videos?.[0];
  if (!v) throw new Error('සින්දුව හොයාගන්න බැරි උනා');
  if (v.seconds > 900) throw new Error('සින්දුව ඉතා දිගයි (විනාඩි 15+)');
  const chunks = [];
  await new Promise((ok, no) => ytdl(v.url, { filter: 'audioonly', quality: 'highestaudio' })
    .on('data', c => chunks.push(c)).on('end', ok).on('error', no));
  return { buf: Buffer.concat(chunks), title: v.title, thumb: v.thumbnail };
}

// ---------- Message handler ----------
function attach(sock) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const m = messages[0]; if (!m?.message) return;
    const jid = m.key.remoteJid; if (jid === 'status@broadcast') return;
    const msg = m.message;
    const text = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || '';
    if (!text) return;
    const names = ['nethu', 'නෙතූ', 'නෙතු', S.botName].filter(Boolean).map(n => n.toLowerCase());
    const low = text.toLowerCase();
    if (!names.some(n => low.includes(n))) return;
    const sender = digits((m.key.participant || jid).split('@')[0]);
    const isOwner = m.key.fromMe || sudoList().includes(sender);
    let clean = text; names.forEach(n => { clean = clean.replace(new RegExp(n, 'gi'), ''); }); clean = clean.trim() || 'hi';
    const reply = t => sock.sendMessage(jid, { text: t }, { quoted: m });
    try {
      const ctx = msg.extendedTextMessage?.contextInfo;
      const imgSrc = msg.imageMessage ? m : ctx?.quotedMessage?.imageMessage ? { key: m.key, message: ctx.quotedMessage } : null;
      const a = await ai(clean, !!imgSrc);
      const me = jidNormalizedUser(sock.user.id);
      if (a.action === 'song') {
        await reply(a.reply || '🎵 සින්දුව හොයනවා...');
        const s = await getSong(a.query || clean);
        await sock.sendMessage(jid, { audio: s.buf, mimetype: 'audio/mp4', ptt: false }, { quoted: m });
        await sock.sendMessage(jid, { text: `🎶 ${s.title}` });
      } else if (['set_name', 'set_bio', 'set_dp'].includes(a.action)) {
        if (!isOwner) return reply('🚫 මේක කරන්න පුළුවන් owner/sudo ට විතරයි.');
        if (a.action === 'set_name') await sock.updateProfileName(a.value);
        if (a.action === 'set_bio') await sock.updateProfileStatus(a.value);
        if (a.action === 'set_dp') {
          if (!imgSrc) return reply('📸 රූපයක් එක්ක (හෝ රූපයකට reply කරලා) කියන්න.');
          const buf = await downloadMediaMessage(imgSrc, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
          await sock.updateProfilePicture(me, buf);
        }
        await reply(a.reply || '✅ හරි, වෙනස් කළා!');
      } else await reply(a.reply || '🙂');
    } catch (e) { console.error(e); reply('❌ ' + e.message).catch(() => {}); }
  });
}

// ---------- Slots (device 1 & 2) ----------
const slots = { 1: { status: 'idle' }, 2: { status: 'idle' } };
const authCol = db.collection('auth');
const wipe = id => authCol.deleteMany({ _id: { $regex: `^s${id}:` } });

async function startSlot(id, number) {
  const s = slots[id];
  if (s.sock) { s.manual = true; try { s.sock.end(); } catch {} }
  s.manual = false; s.status = 'connecting'; s.code = null; s.error = null;
  const { state, saveCreds } = await useMongoAuth(authCol, 's' + id);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger, browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, markOnlineOnConnect: false, syncFullHistory: false });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  attach(sock);
  if (!state.creds.registered && number) setTimeout(async () => {
    try { const c = await sock.requestPairingCode(digits(number)); s.code = c.match(/.{1,4}/g).join('-'); s.status = 'code'; }
    catch (e) { s.status = 'idle'; s.error = e.message; }
  }, 3000);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (s.sock !== sock) return;
    if (connection === 'open') { s.status = 'open'; s.code = null; s.number = sock.user.id.split(':')[0].split('@')[0]; console.log(`✅ Device ${id} connected`); }
    if (connection === 'close') {
      const c = lastDisconnect?.error?.output?.statusCode;
      if (c === DisconnectReason.loggedOut) { await wipe(id); s.status = 'idle'; s.number = null; s.sock = null; return; }
      if (s.manual) return;
      if (!sock.authState.creds.registered) { s.status = 'idle'; s.sock = null; return; }
      s.status = 'connecting'; setTimeout(() => startSlot(id), 3000);
    }
  });
}
for (const id of [1, 2]) if (await authCol.findOne({ _id: `s${id}:creds` })) startSlot(id).catch(console.error);

// ---------- Web server ----------
const app = express(); app.use(express.json()); app.use(express.static('public'));
const auth = (q, r, n) => q.headers['x-admin'] === ADMIN_PASSWORD ? n() : r.status(401).json({ error: 'වැරදි password' });
const pub = () => ({ botName: S.botName, logo: S.logo, slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, { status: v.status, number: v.number, code: v.code, error: v.error }])) });

app.get('/api/status', (q, r) => r.json(pub()));
app.post('/api/pair', async (q, r) => {
  const { slot, number } = q.body; const n = digits(number);
  if (![1, 2].includes(+slot) || n.length < 9) return r.status(400).json({ error: 'අංකය වැරදියි (94xxxxxxxxx)' });
  if (slots[slot].status === 'open') return r.status(400).json({ error: 'දැනටමත් connect වෙලා' });
  startSlot(+slot, n).catch(e => { slots[slot].error = e.message; slots[slot].status = 'idle'; });
  r.json({ ok: true });
});
app.post('/api/logout', async (q, r) => {
  const id = +q.body.slot; const s = slots[id]; if (!s) return r.status(400).end();
  s.manual = true; try { await s.sock?.logout(); } catch {} try { s.sock?.end(); } catch {}
  await wipe(id); Object.assign(s, { status: 'idle', sock: null, number: null, code: null }); r.json({ ok: true });
});
app.get('/api/settings', auth, (q, r) => r.json({ ...S, mongoUrl: MONGO_URL }));
app.post('/api/settings', auth, async (q, r) => {
  const b = q.body; for (const k of Object.keys(DEF)) if (typeof b[k] === 'string') S[k] = b[k].trim();
  await saveSettings();
  const mongoChanged = b.mongoUrl && b.mongoUrl.trim() !== MONGO_URL;
  if (mongoChanged) fs.writeFileSync('./config.json', JSON.stringify({ mongoUrl: b.mongoUrl.trim() }));
  r.json({ ok: true, restart: !!mongoChanged });
  if (mongoChanged) setTimeout(() => process.exit(0), 800);
});
app.listen(PORT, () => console.log('🌐 http://localhost:' + PORT));
