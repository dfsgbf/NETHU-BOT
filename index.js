// ================= NETHU AI WHATSAPP BOT (3 device) =================
import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { MongoClient } from 'mongodb';
import ytSearch from 'yt-search';
import ytdl from '@distube/ytdl-core';
import baileys from '@whiskeysockets/baileys';
const { default: makeWASocket, initAuthCreds, BufferJSON, proto, Browsers, DisconnectReason,
  fetchLatestBaileysVersion, downloadMediaMessage, jidNormalizedUser } = baileys;

// ---------- මෙතනට ඔයාගේ දේවල් දාන්න ----------
const DEFAULT_MONGO = 'mongodb+srv://diniduheshan2007_db_user:SZD7sfcIU6Einajx@cluster0.ah8jggk.mongodb.net/dark-dinu?retryWrites=true&w=majority&appName=Cluster0';
const API_BASE = 'https://api.chamindu.site/api/v1';
const API_KEY = process.env.API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b';
// -----------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nethu123';
const PORT = process.env.PORT || 3000;
const SLOT_IDS = [1, 2, 3];
const logger = pino({ level: 'silent' });
const started = Date.now();

let cfg = {}; try { cfg = JSON.parse(fs.readFileSync('./config.json', 'utf8')); } catch {}
const MONGO_URL = process.env.MONGODB_URL || cfg.mongoUrl || DEFAULT_MONGO;
const mongo = new MongoClient(MONGO_URL); await mongo.connect();
const db = mongo.db(); console.log('✅ MongoDB connected');

// ---------- Settings ----------
const DEF = {
  botName: 'Nethu', owner: '', sudo: '', logo: '',
  names: 'nethu,නෙතූ,නෙතු,bbh,sudu,manika,mnikh,baba,raththaran,sudu manika,love,බබා,මැනික,මැණික,සුදු,සුදූ,cudu,රත්තරන්,pnh,babo,baby,janu,ජානු,adare,ආදරේ,patiya,පැටියා,nangi,නංගි',
  provider: 'chatgpt', geminiKey: '', model: 'gemini-2.0-flash',
  statusSeen: '1', statusReact: '1', reactEmojis: '🥰,❤️,😍,🔥,💖', statusSave: '0',
  autoRead: '0', autoTyping: '1', alwaysOnline: '0'
};
let S = { ...DEF, ...((await db.collection('settings').findOne({ _id: 'main' })) || {}) }; delete S._id;
const saveSettings = () => db.collection('settings').replaceOne({ _id: 'main' }, { _id: 'main', ...S }, { upsert: true });
const digits = (x = '') => String(x).replace(/\D/g, '');
const sudoList = () => [S.owner, ...String(S.sudo).split(',')].map(digits).filter(Boolean);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameList = () => [...new Set([...S.names.split(','), S.botName].map(x => x.trim().toLowerCase()).filter(Boolean))].sort((a, b) => b.length - a.length);
const nameRe = n => /^[a-z0-9 ]+$/.test(n) ? new RegExp(`(?<![a-z0-9])${esc(n)}(?![a-z0-9])`, 'i') : new RegExp(esc(n), 'i');

// ---------- Mongo auth state ----------
async function useMongoAuth(col, sid) {
  const w = (k, d) => col.replaceOne({ _id: `${sid}:${k}` }, { d: JSON.stringify(d, BufferJSON.replacer) }, { upsert: true });
  const r = async k => { const x = await col.findOne({ _id: `${sid}:${k}` }); return x ? JSON.parse(x.d, BufferJSON.reviver) : null; };
  const creds = (await r('creds')) || initAuthCreds();
  return {
    state: { creds, keys: {
      get: async (type, ids) => { const o = {};
        await Promise.all(ids.map(async i => { let v = await r(`${type}-${i}`);
          if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v); o[i] = v; }));
        return o; },
      set: async data => { await Promise.all(Object.entries(data).flatMap(([t, m]) => Object.entries(m).map(([i, v]) =>
        v ? w(`${t}-${i}`, v) : col.deleteOne({ _id: `${sid}:${t}-${i}` })))); }
    } },
    saveCreds: () => w('creds', creds)
  };
}

// ---------- Memory ----------
const memCol = db.collection('memory');
const memGet = async id => (await memCol.findOne({ _id: id })) || { _id: id, facts: {}, hist: [] };
const memSave = m => memCol.replaceOne({ _id: m._id }, m, { upsert: true });

// ---------- AI ----------
const CREATOR_PHOTO = 'https://files.catbox.moe/17p3nr.jpg';
const SYS = () => `ඔබ "${S.botName}" නම් WhatsApp AI සහායිකාවයි. ලෙන්ගතු, මිත්‍රශීලී ස්වරයෙන් (බබා, සුදු, මැණික වගේ වචන වලින්) පරිශීලකයාගේ භාෂාවෙන් (සිංහල/English/Singlish) කෙටියෙන් කතා කරන්න.
ඔබව නිර්මාණය කළේ දිනිදු හේෂාන් (Dinidu Heshan / Heshan / හේෂාන්). ඔහුගේ වයස 19, ගම ඇඹිලිපිටිය. ඔබව හැදුවේ කවුද කියලා ඇහුවොත් මේ තොරතුරු කියන්න. ඔහුගේ phone number එක ඉල්ලුවොත් පමණක් 0719845166 දෙන්න. ඔහුගේ photo එකක් ඉල්ලුවොත් action="send_photo", value="${CREATOR_PHOTO}" දෙන්න.
පරිශීලකයාගේ පණිවිඩය තේරුම් අරගෙන JSON පමණක් දෙන්න:
{"action":"...","query":"","value":"","reply":"","remember":{}}
actions:
- chat: සාමාන්‍ය කතාබහ (reply = පිළිතුර)
- song: සින්දුවක් (query = නම/ගායකයා)
- video: වීඩියෝවක් YouTube එකෙන් (query = නම)
- set_name: WhatsApp නම වෙනස් කිරීම (value = අලුත් නම)
- set_bio: bio/about වෙනස් කිරීම (value)
- set_dp: profile picture වෙනස් කිරීම (රූපයක් අවශ්‍යයි)
- get_dp: කවුරුහරි කෙනෙකුගේ dp එක ගන්න (value = අංකය)
- post_status: status එකක් දාන්න (රූපය/වීඩියෝව තිබේ නම් ඒක, නැත්නම් value = text)
- save_status: status/රූපය/වීඩියෝව save කරලා owner chat එකට එවන්න
- send_photo: රූපයක් URL එකකින් යවන්න (value = URL)
- tagall: group එකේ හැමෝටම mention කරන්න (value = පණිවිඩය)
- alive: bot online ද කියලා බලන්න
"remember": පරිශීලකයා තමන් ගැන කියන දේ (නම, වයස, ගම, කැමති දේ) මතක තියාගන්න, උදා {"name":"කසුන්","age":"20"}. කිසිවක් නැත්නම් {}.
"reply" හැම වෙලාවකම කෙටි ලෙන්ගතු පිළිතුරක් විය යුතුයි.`;

function buildPrompt(text, hasMedia, mem) {
  const facts = Object.entries(mem.facts || {}).map(([k, v]) => `${k}: ${v}`).join('; ') || 'නැත';
  const hist = (mem.hist || []).slice(-6).map(h => `පරිශීලක: ${h.u.slice(0, 150)}\nබොට්: ${h.a.slice(0, 150)}`).join('\n');
  return `මේ පරිශීලකයා ගැන මතකය: ${facts}\nපසුගිය සංවාදය:\n${hist || '-'}\n\nදැන් පණිවිඩය: ${text}\n(රූපය/වීඩියෝව ${hasMedia ? 'ඇත' : 'නැත'})\nJSON පමණක් දෙන්න.`;
}
function parseAI(out) {
  const m = String(out).match(/\{[\s\S]*\}/);
  if (m) { try { const j = JSON.parse(m[0]); if (j.action) return j; } catch {} }
  return { action: 'chat', reply: String(out) };
}
async function askChat(prompt) {
  const r = await fetch(`${API_BASE}/ai/chatgpt?prompt=${encodeURIComponent(prompt)}&api_key=${API_KEY}`);
  const raw = await r.text(); let j; try { j = JSON.parse(raw); } catch { return raw; }
  const pick = o => { if (typeof o === 'string') return o; if (!o || typeof o !== 'object') return null;
    for (const k of ['result', 'response', 'answer', 'message', 'text', 'data', 'content', 'reply']) { const v = pick(o[k]); if (v) return v; } return null; };
  return pick(j) || raw;
}
async function aiGemini(prompt) {
  if (!S.geminiKey) return { action: 'chat', reply: '⚠️ Gemini key එක settings වල දාලා නෑ.' };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${S.model}:generateContent?key=${S.geminiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYS() }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.8 } }) });
  const j = await r.json(); const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
  return t ? parseAI(t) : { action: 'chat', reply: '⚠️ AI error: ' + (j?.error?.message || 'no response') };
}
async function ai(text, hasMedia, mem) {
  const p = buildPrompt(text, hasMedia, mem);
  try { return S.provider === 'gemini' ? await aiGemini(p) : parseAI(await askChat(SYS() + '\n\n' + p)); }
  catch (e) { return { action: 'chat', reply: '⚠️ AI error: ' + e.message }; }
}

// ---------- Download APIs ----------
async function callApi(path, params = {}) {
  const u = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('api_key', API_KEY);
  const r = await fetch(u); const ct = r.headers.get('content-type') || '';
  if (/^(audio|video|image)/.test(ct)) return { buf: Buffer.from(await r.arrayBuffer()), title: '' };
  const j = await r.json(); const urls = []; let title = '';
  (function walk(o, k = '') { if (typeof o === 'string') { if (/^https?:\/\//.test(o)) urls.push([k, o]); else if (/title|name|desc/i.test(k) && o.length < 150) title = title || o; }
    else if (o && typeof o === 'object') for (const [kk, x] of Object.entries(o)) walk(x, kk); })(j);
  const pref = ['download', 'dl', 'mp3', 'mp4', 'audio', 'video', 'hd', 'url', 'link'];
  const rank = k => { const i = pref.findIndex(p => k.toLowerCase().includes(p)); return i < 0 ? 99 : i; };
  urls.sort((x, y) => rank(x[0]) - rank(y[0]));
  const au = urls.find(([k, x]) => !/thumb|cover|avatar|poster|preview/i.test(k) && !/\.(jpe?g|png|webp)(\?|$)/i.test(x)) || urls.find(([k]) => /image|photo|src/i.test(k));
  if (!au) throw new Error('API එකෙන් link එකක් ආවේ නෑ: ' + JSON.stringify(j).slice(0, 150));
  const a = await fetch(au[1]); if (!a.ok) throw new Error('media download fail');
  const buf = Buffer.from(await a.arrayBuffer());
  if (buf.length > 100 * 1024 * 1024) throw new Error('ෆයිල් එක ලොකු වැඩියි');
  return { buf, title };
}
function routeLink(u, clean) {
  const wv = /video|වීඩියෝ|mp4/i.test(clean);
  if (/tiktok\.com/i.test(u)) return { path: '/tiktok', params: { url: u }, kind: 'video' };
  if (/youtu\.?be/i.test(u)) return wv ? { path: '/youtube/download', params: { url: u, quality: '720p', format: 'mp4' }, kind: 'video' }
    : { path: '/youtube/mp3', params: { url: u, quality: '320kbps' }, kind: 'audio' };
  if (/facebook\.com|fb\.watch/i.test(u)) return { path: '/facebook/c2', params: { url: u }, kind: 'video' };
  if (/instagram\.com/i.test(u)) return { path: '/media/reels', params: { url: u }, kind: 'video' };
  if (/pinterest\.|pin\.it/i.test(u)) return { path: '/media/pinterest/infodl', params: { q: u }, kind: 'video' };
  if (/spotify\.com/i.test(u)) return { path: '/spotify/download', params: { q: u, quality: '320kbps' }, kind: 'audio' };
  return null;
}
async function ytFind(q) { const v = (await ytSearch(q)).videos?.[0]; if (!v) throw new Error('හොයාගන්න බැරි උනා'); return v; }
async function getSong(q) {
  const v = await ytFind(q);
  try { const d = await callApi('/youtube/mp3', { url: v.url, quality: '320kbps' }); return { buf: d.buf, title: v.title }; }
  catch (e) { console.error('API:', e.message); }
  if (v.seconds > 900) throw new Error('සින්දුව ඉතා දිගයි');
  const chunks = [];
  await new Promise((ok, no) => ytdl(v.url, { filter: 'audioonly', quality: 'highestaudio' }).on('data', c => chunks.push(c)).on('end', ok).on('error', no));
  return { buf: Buffer.concat(chunks), title: v.title };
}
async function getVideo(q) {
  const v = await ytFind(q);
  const d = await callApi('/youtube/download', { url: v.url, quality: '720p', format: 'mp4' }); return { buf: d.buf, title: v.title };
}

// ---------- Helpers ----------
const unwrap = x => x?.ephemeralMessage?.message || x?.viewOnceMessage?.message || x?.viewOnceMessageV2?.message || x;
const textOf = g => g.conversation || g.extendedTextMessage?.text || g.imageMessage?.caption || g.videoMessage?.caption || '';
const ctxOf = g => Object.values(g).find(v => v && typeof v === 'object' && v.contextInfo)?.contextInfo;
function findMedia(m) {
  const g = unwrap(m.message); if (!g) return null;
  const own = g.imageMessage ? 'image' : g.videoMessage ? 'video' : null;
  if (own) return { type: own, src: m };
  const c = ctxOf(g); const q = unwrap(c?.quotedMessage); if (!q) return null;
  const t = q.imageMessage ? 'image' : q.videoMessage ? 'video' : q.audioMessage ? 'audio' : null;
  if (!t) return null;
  return { type: t, src: { key: { remoteJid: c.remoteJid || m.key.remoteJid, id: c.stanzaId, participant: c.participant }, message: q } };
}
const dl = (sock, md) => downloadMediaMessage(md.src, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
async function sendMediaTo(sock, to, md, caption = '') {
  const buf = await dl(sock, md);
  const c = md.type === 'image' ? { image: buf, caption } : md.type === 'video' ? { video: buf, caption } : { audio: buf, mimetype: 'audio/mpeg' };
  return sock.sendMessage(to, c);
}
function sendBuf(sock, jid, buf, kind, title, quoted) {
  if (kind === 'audio') return sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg' }, { quoted });
  const s = buf.subarray(0, 12);
  const img = (s[0] === 0xFF && s[1] === 0xD8) || (s[0] === 0x89 && s[1] === 0x50) || s.toString('ascii', 0, 3) === 'GIF' || s.toString('ascii', 8, 12) === 'WEBP';
  return sock.sendMessage(jid, img ? { image: buf, caption: title || '' } : { video: buf, mimetype: 'video/mp4', caption: title || '' }, { quoted });
}
const contacts = {}; let saveT = {};
function addContact(id, jid) {
  if (!jid?.endsWith('@s.whatsapp.net')) return;
  const set = (contacts[id] ??= new Set()); if (set.has(jid)) return; set.add(jid);
  clearTimeout(saveT[id]);
  saveT[id] = setTimeout(() => db.collection('contacts').replaceOne({ _id: 's' + id }, { _id: 's' + id, jids: [...set] }, { upsert: true }).catch(() => {}), 5000);
}
const fmtUp = () => { const s = Math.floor((Date.now() - started) / 1000); return `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m`; };

// ---------- Status handler ----------
async function onStatus(sock, id, m) {
  if (m.key.fromMe) return;
  const poster = jidNormalizedUser(m.key.participant || ''); const me = jidNormalizedUser(sock.user.id);
  addContact(id, poster);
  if (S.statusSeen === '1') await sock.readMessages([m.key]).catch(() => {});
  if (S.statusReact === '1') {
    const em = S.reactEmojis.split(',').map(x => x.trim()).filter(Boolean);
    if (em.length && poster) await sock.sendMessage('status@broadcast', { react: { text: em[Math.floor(Math.random() * em.length)], key: m.key } }, { statusJidList: [poster, me] }).catch(() => {});
  }
  if (S.statusSave === '1') { const md = findMedia(m); if (md) await sendMediaTo(sock, me, md, '💾 status: +' + digits(poster.split('@')[0])).catch(() => {}); }
}

// ---------- Message handler ----------
async function onMessage(sock, id, m) {
  const jid = m.key.remoteJid; const g = unwrap(m.message); if (!g) return;
  const text = textOf(g); if (!text) return;
  const me = jidNormalizedUser(sock.user.id);
  const sender = digits((m.key.participant || jid).split('@')[0]);
  const isOwner = m.key.fromMe || sudoList().includes(sender);
  const ctx = ctxOf(g); const md = findMedia(m);
  const reply = t => sock.sendMessage(jid, { text: t }, { quoted: m });

  // status එකකට reply කරලා "send / save / එවන්න" කිව්වම
  if (isOwner && ctx?.remoteJid === 'status@broadcast' && md && /send|save|denna|dapan|ewanna|ewnna|evanna|එවන්න|දෙන්න|දාපන්|සේව්/i.test(text))
    return void await sendMediaTo(sock, me, md, '💾 saved status');

  const hit = nameList().filter(n => nameRe(n).test(text));
  if (!hit.length) return;
  let clean = text; hit.forEach(n => { clean = clean.replace(new RegExp(nameRe(n).source, 'gi'), ''); });
  clean = clean.replace(/^[\s,.:!?]+/, '').trim() || 'hi';
  if (S.autoTyping === '1') sock.sendPresenceUpdate('composing', jid).catch(() => {});
  const ownerOnly = () => { if (isOwner) return false; reply('🚫 මේක කරන්න පුළුවන් owner/sudo ට විතරයි.'); return true; };

  try {
    const um = clean.match(/https?:\/\/\S+/);
    if (um) {
      const r = routeLink(um[0], clean);
      if (r) { await reply('⏳ download කරනවා...'); const d = await callApi(r.path, r.params); return void await sendBuf(sock, jid, d.buf, r.kind, d.title, m); }
    }
    const mem = await memGet(sender);
    const a = await ai(clean, !!md, mem);
    const say = a.reply || '🙂';
    switch (a.action) {
      case 'song': { await reply(say); const s = await getSong(a.query || clean); await sendBuf(sock, jid, s.buf, 'audio', '', m); await sock.sendMessage(jid, { text: `🎶 ${s.title}` }); break; }
      case 'video': { await reply(say); const s = await getVideo(a.query || clean); await sendBuf(sock, jid, s.buf, 'video', s.title, m); break; }
      case 'set_name': if (ownerOnly()) return; await sock.updateProfileName(a.value); await reply(say); break;
      case 'set_bio': if (ownerOnly()) return; await sock.updateProfileStatus(a.value); await reply(say); break;
      case 'set_dp': if (ownerOnly()) return;
        if (md?.type !== 'image') return void await reply('📸 රූපයක් එක්ක (හෝ රූපයකට reply කරලා) කියන්න.');
        await sock.updateProfilePicture(me, await dl(sock, md)); await reply(say); break;
      case 'get_dp': {
        let n = digits(a.value || a.query); if (n.startsWith('0')) n = '94' + n.slice(1);
        if (!n) return void await reply('📞 අංකය දෙන්න.');
        const url = await sock.profilePictureUrl(n + '@s.whatsapp.net', 'image').catch(() => null);
        if (!url) return void await reply('😕 dp එක ගන්න බැරි උනා (නැත්නම් hide කරලා).');
        await sock.sendMessage(jid, { image: { url }, caption: say + ' +' + n }, { quoted: m }); break; }
      case 'post_status': {
        if (ownerOnly()) return;
        const opts = { statusJidList: [...(contacts[id] || []), me], backgroundColor: '#315575', font: 3 };
        if (md && md.type !== 'audio') { const buf = await dl(sock, md); await sock.sendMessage('status@broadcast', md.type === 'image' ? { image: buf, caption: a.value || '' } : { video: buf, caption: a.value || '' }, opts); }
        else await sock.sendMessage('status@broadcast', { text: a.value || clean }, opts);
        await reply(say); break; }
      case 'save_status': if (ownerOnly()) return;
        if (!md) return void await reply('📎 save කරන්න ඕන status/රූපයට reply කරන්න.');
        await sendMediaTo(sock, me, md, '💾 saved'); await reply(say); break;
      case 'send_photo': await sock.sendMessage(jid, { image: { url: a.value || CREATOR_PHOTO }, caption: say }, { quoted: m }); break;
      case 'tagall': {
        if (ownerOnly()) return; if (!jid.endsWith('@g.us')) return void await reply('👥 මේක group එකකදී විතරයි.');
        const gm = await sock.groupMetadata(jid);
        await sock.sendMessage(jid, { text: `📢 ${a.value || say}\n\n` + gm.participants.map(p => '@' + p.id.split('@')[0]).join(' '), mentions: gm.participants.map(p => p.id) }, { quoted: m }); break; }
      case 'alive': await reply(`✅ ${S.botName} online!\n⏱️ Uptime: ${fmtUp()}`); break;
      default: await reply(say);
    }
    if (a.remember && typeof a.remember === 'object') for (const [k, v] of Object.entries(a.remember)) if (v) mem.facts[k] = String(v).slice(0, 100);
    mem.hist = [...(mem.hist || []), { u: clean, a: say }].slice(-8); await memSave(mem);
  } catch (e) { console.error(e); reply('❌ ' + e.message).catch(() => {}); }
}

function attach(sock, id) {
  sock.ev.on('contacts.upsert', cs => cs.forEach(c => addContact(id, c.id)));
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const m = messages[0]; if (!m?.message) return; const jid = m.key.remoteJid;
    try {
      if (jid === 'status@broadcast') return await onStatus(sock, id, m);
      addContact(id, jid);
      if (S.autoRead === '1' && !m.key.fromMe) sock.readMessages([m.key]).catch(() => {});
      await onMessage(sock, id, m);
    } catch (e) { console.error(e); }
  });
}

// ---------- Slots ----------
const slots = Object.fromEntries(SLOT_IDS.map(i => [i, { status: 'idle' }]));
const authCol = db.collection('auth');
const wipe = id => authCol.deleteMany({ _id: { $regex: `^s${id}:` } });

async function startSlot(id, number) {
  const s = slots[id];
  if (s.sock) { s.manual = true; try { s.sock.end(); } catch {} }
  s.manual = false; s.status = 'connecting'; s.code = null; s.error = null;
  contacts[id] = new Set((await db.collection('contacts').findOne({ _id: 's' + id }))?.jids || []);
  const { state, saveCreds } = await useMongoAuth(authCol, 's' + id);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger, browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, markOnlineOnConnect: S.alwaysOnline === '1', syncFullHistory: false });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  attach(sock, id);
  if (!state.creds.registered && number) setTimeout(async () => {
    try { const c = await sock.requestPairingCode(digits(number)); s.code = c.match(/.{1,4}/g).join('-'); s.status = 'code'; }
    catch (e) { s.status = 'idle'; s.error = e.message; }
  }, 3000);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (s.sock !== sock) return;
    if (connection === 'open') { s.status = 'open'; s.code = null; s.number = sock.user.id.split(':')[0].split('@')[0]; console.log(`✅ Device ${id} connected`);
      if (S.alwaysOnline === '1') sock.sendPresenceUpdate('available').catch(() => {}); }
    if (connection === 'close') {
      const c = lastDisconnect?.error?.output?.statusCode;
      if (c === DisconnectReason.loggedOut) { await wipe(id); Object.assign(s, { status: 'idle', number: null, sock: null }); return; }
      if (s.manual) return;
      if (!sock.authState.creds.registered) { s.status = 'idle'; s.sock = null; return; }
      s.status = 'connecting'; setTimeout(() => startSlot(id), 3000);
    }
  });
}
for (const id of SLOT_IDS) if (await authCol.findOne({ _id: `s${id}:creds` })) startSlot(id).catch(console.error);

// ---------- Web server ----------
const app = express(); app.use(express.json()); app.use(express.static('public'));
const auth = (q, r, n) => q.headers['x-admin'] === ADMIN_PASSWORD ? n() : r.status(401).json({ error: 'වැරදි password' });
app.get('/api/status', (q, r) => r.json({ botName: S.botName, logo: S.logo,
  slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, { status: v.status, number: v.number, code: v.code, error: v.error }])) }));
app.post('/api/pair', (q, r) => {
  const { slot } = q.body; let n = digits(q.body.number); if (n.length === 10 && n[0] === '0') n = '94' + n.slice(1);
  if (!SLOT_IDS.includes(+slot) || n.length < 9) return r.status(400).json({ error: 'අංකය වැරදියි (94712345678)' });
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
  const ch = b.mongoUrl && b.mongoUrl.trim() !== MONGO_URL;
  if (ch) fs.writeFileSync('./config.json', JSON.stringify({ mongoUrl: b.mongoUrl.trim() }));
  r.json({ ok: true, restart: !!ch }); if (ch) setTimeout(() => process.exit(0), 800);
});
app.listen(PORT, () => console.log('🌐 http://localhost:' + PORT));
