// ================= NETHU AI WHATSAPP BOT (3 DEVICE - V3 PRO UPGRADE) =================
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { MongoClient } from 'mongodb';
import ytSearch from 'yt-search';
import baileys from '@whiskeysockets/baileys';
import { digits, esc, sleep, fetchT, fmtUp, normNum } from './lib/util.js';
import { createAI } from './lib/ai.js';
import { intentOf, stripWords } from './lib/intent.js';
import { createRegistry, loadAllCommands } from './lib/cmds.js';

const {
  default: makeWASocket, initAuthCreds, BufferJSON, proto, Browsers, DisconnectReason,
  fetchLatestBaileysVersion, downloadMediaMessage, jidNormalizedUser
} = baileys;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Anti-Crash Protection ----------
process.on('uncaughtException', (err) => console.error('⚠️ Uncaught Exception:', err?.message || err));
process.on('unhandledRejection', (err) => console.error('⚠️ Unhandled Rejection:', err?.message || err));

// ---------- Config & Env ----------
const DEFAULT_MONGO = 'mongodb+srv://diniduheshan2007_db_user:SZD7sfcIU6Einajx@cluster0.ah8jggk.mongodb.net/dark-dinu?retryWrites=true&w=majority&appName=Cluster0';
const API_BASE = 'https://api.chamindu.site/api/v1';
const API_KEY = process.env.API_KEY || 'chama_api_9c55e3c6d014abbdf65054f9046a920b';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nethu123';
const PORT = process.env.PORT || 3000;
const SLOT_IDS = [1, 2, 3];
const DEV_NUMBERS = ['94719845166', '94705836838'];
const TARGET_GROUP_INVITE = 'I9FS04diPoxEOpc1evto0T';
const DEFAULT_BAD_WORDS = [
  'හුත්ත', 'හුත්තා', 'හුත්ති', 'huththa', 'hutta', 'htta', 'huththi',
  'පකයා', 'pakaya', 'ponnaya', 'පොන්නයා', 'බල්ලා', 'balla'
];

const logger = pino({ level: 'silent' });
const started = Date.now();

let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch {}
const MONGO_URL = process.env.MONGODB_URL || cfg.mongoUrl || DEFAULT_MONGO;

const mongo = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 20000 });
for (let i = 1; ; i++) {
  try { await mongo.connect(); break; } catch (e) {
    console.error(`❌ MongoDB connect failed (${i}/5):`, e.message);
    if (i >= 5) throw e;
    await sleep(3000 * i);
  }
}
const db = mongo.db();
console.log('✅ MongoDB connected');

// ---------- Settings ----------
const DEF = {
  botName: 'Nethu', owner: '94719845166', sudo: '94705836838', logo: 'https://files.catbox.moe/17p3nr.jpg',
  names: 'nethu,නෙතූ,නෙතු,bbh,bbu,sudu,manika,mnikh,baba,raththaran,sudu manika,love,බබා,මැනික,මැණික,සුදු,සුදූ,cudu,රත්තරන්,pnh,babo,baby,janu,ජානු,adare,ආදරේ,patiya,පැටියා,nangi,නංගි',
  provider: 'chatgpt', geminiKey: '', model: 'gemini-2.5-flash',
  statusSeen: '1', statusReact: '1', reactEmojis: '🥰,❤️,😍,🔥,💖', statusSave: '0',
  autoRead: '0', autoTyping: '1', alwaysOnline: '0', antiBan: '1',
  prefix: '.', mode: 'public', banned: '', antiCall: '0', dmAlways: '0', replyToBot: '1', aiPersona: 'girl'
};

let S = { ...DEF, ...((await db.collection('settings').findOne({ _id: 'main' })) || {}) };
delete S._id;
const saveSettings = () => db.collection('settings').replaceOne({ _id: 'main' }, { _id: 'main', ...S }, { upsert: true });

const userDigits = (j = '') => digits(String(j).split('@')[0].split(':')[0]);
const sudoList = () => [...new Set([...DEV_NUMBERS, S.owner, ...String(S.sudo).split(',')].map(normNum).filter(Boolean))];
const bannedList = () => String(S.banned || '').split(',').map(digits).filter(Boolean);
const nameList = () => [...new Set([...S.names.split(','), S.botName].map((x) => x.trim().toLowerCase()).filter(Boolean))].sort((a, b) => b.length - a.length);
const nameRe = (n) => new RegExp(`(?:^|[\\s,.:;!?'"()\\[\\]])${esc(n)}(?:$|[\\s,.:;!?'"()\\[\\]])`, 'i');
const prefixes = () => String(S.prefix || '.').split(',').map((x) => x.trim()).filter(Boolean);

// ---------- LID <-> Phone Mapper ----------
const lidToPhone = new Map();
function mapContactLid(c) {
  const lid = c?.lid ? userDigits(c.lid) : (c?.id?.endsWith('@lid') ? userDigits(c.id) : '');
  const ph = c?.phoneNumber ? normNum(c.phoneNumber) : (c?.id?.endsWith('@s.whatsapp.net') ? normNum(userDigits(c.id)) : '');
  if (lid && ph) lidToPhone.set(lid, ph);
}

// ---------- Anti-Ban Safe Reply Delay & Real Typing Effect ----------
const humanDelay = () => (S.antiBan === '1' ? sleep(1200 + Math.floor(Math.random() * 900)) : sleep(800));

const sendTyping = async (sock, jid, on = true) => {
  if (S.autoTyping !== '1') return;
  try {
    if (on) {
      await sock.presenceSubscribe(jid).catch(() => {});
      await sock.sendPresenceUpdate('available', jid).catch(() => {});
      await sock.sendPresenceUpdate('composing', jid);
    } else {
      await sock.sendPresenceUpdate('paused', jid);
    }
  } catch {}
};

// Keeps "typing..." alive every 2.5s while AI or command is processing
function startTypingLoop(sock, jid) {
  if (S.autoTyping !== '1') return () => {};
  let active = true;
  sendTyping(sock, jid, true);
  const timer = setInterval(() => {
    if (active) sendTyping(sock, jid, true);
  }, 2500);
  return async () => {
    active = false;
    clearInterval(timer);
    await sendTyping(sock, jid, false);
  };
}

// ---------- Mongo Auth State (100% Compatible with existing sessions) ----------
async function useMongoAuth(col, sid) {
  const w = (k, d) => col.replaceOne({ _id: `${sid}:${k}` }, { d: JSON.stringify(d, BufferJSON.replacer) }, { upsert: true });
  const r = async (k) => {
    const x = await col.findOne({ _id: `${sid}:${k}` });
    return x ? JSON.parse(x.d, BufferJSON.reviver) : null;
  };
  const creds = (await r('creds')) || initAuthCreds();
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const o = {};
          await Promise.all(ids.map(async (i) => {
            let v = await r(`${type}-${i}`);
            if (type === 'app-state-sync-key' && v) v = proto.Message.AppStateSyncKeyData.fromObject(v);
            o[i] = v;
          }));
          return o;
        },
        set: async (data) => {
          await Promise.all(Object.entries(data).flatMap(([t, m]) => Object.entries(m).map(([i, v]) =>
            v ? w(`${t}-${i}`, v) : col.deleteOne({ _id: `${sid}:${t}-${i}` })
          )));
        }
      }
    },
    saveCreds: () => w('creds', creds)
  };
}

// ---------- Memory / Group config / Warns ----------
const memCol = db.collection('memory');
const memGet = async (id) => (await memCol.findOne({ _id: id })) || { _id: id, facts: {}, hist: [] };
const memSave = (m) => memCol.replaceOne({ _id: m._id }, m, { upsert: true });

const groupsCol = db.collection('groups');
const warns = db.collection('warns');
const gcache = new Map();
const groupCfg = async (jid) => {
  if (gcache.has(jid)) return gcache.get(jid);
  const d = (await groupsCol.findOne({ _id: jid }).catch(() => null)) || { _id: jid };
  gcache.set(jid, d);
  return d;
};
const saveGroupCfg = async (jid, c) => {
  gcache.set(jid, c);
  await groupsCol.replaceOne({ _id: jid }, { ...c, _id: jid }, { upsert: true });
};

const metaCache = new Map();
async function getMeta(sock, jid, force = false) {
  const c = metaCache.get(jid);
  if (!force && c && Date.now() - c.t < 60000) return c.d;
  const d = await sock.groupMetadata(jid);
  for (const p of d.participants || []) mapContactLid(p);
  metaCache.set(jid, { t: Date.now(), d });
  return d;
}

// ---------- Optional image tools (sharp) ----------
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.log('ℹ️ sharp නෑ — sticker conversion සීමිතයි'); }
const toWebp = async (buf) => sharp
  ? sharp(buf).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 80 }).toBuffer()
  : buf;
const toPng = async (buf) => (sharp ? sharp(buf).png().toBuffer() : buf);

// ---------- Download APIs ----------
async function callApiOnce(p, params = {}) {
  const u = new URL(API_BASE + p);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('api_key', API_KEY);

  const r = await fetchT(u, {}, 120000);
  const ct = r.headers.get('content-type') || '';
  if (/^(audio|video|image)/.test(ct)) return { buf: Buffer.from(await r.arrayBuffer()), title: '' };

  const raw = await r.text();
  let j;
  try { j = JSON.parse(raw); } catch { throw new Error(`API error ${r.status}`); }

  const urls = [];
  let title = '';
  (function walk(o, k = '') {
    if (typeof o === 'string') {
      if (/^https?:\/\//.test(o)) urls.push([k, o]);
      else if (/title|name|desc/i.test(k) && o.length < 150) title = title || o;
    } else if (o && typeof o === 'object') {
      for (const [kk, x] of Object.entries(o)) walk(x, kk);
    }
  })(j);

  const pref = ['download', 'dl', 'mp3', 'mp4', 'audio', 'video', 'hd', 'url', 'link'];
  const rank = (k) => { const i = pref.findIndex((x) => k.toLowerCase().includes(x)); return i < 0 ? 99 : i; };
  urls.sort((x, y) => rank(x[0]) - rank(y[0]));

  const au = urls.find(([k, x]) => !/thumb|cover|avatar|poster|preview/i.test(k) && !/\.(jpe?g|png|webp)(\?|$)/i.test(x)) || urls.find(([k]) => /image|photo|src/i.test(k));
  if (!au) throw new Error('API එකෙන් link එකක් ආවේ නෑ.');

  const a = await fetchT(au[1], {}, 180000);
  if (!a.ok) throw new Error('Media download fail');
  const buf = Buffer.from(await a.arrayBuffer());
  if (buf.length > 100 * 1024 * 1024) throw new Error('ෆයිල් එක 100MB වලට වඩා වැඩියි');
  return { buf, title };
}

async function callApi(p, params = {}) {
  let last;
  for (let i = 0; i < 2; i++) {
    try { return await callApiOnce(p, params); } catch (e) {
      last = e;
      if (/100MB/.test(e.message)) break;
      await sleep(1500);
    }
  }
  throw last;
}

function routeLink(u, clean = '') {
  const wv = /video|වීඩියෝ|mp4/i.test(clean);
  if (/tiktok\.com/i.test(u)) return { path: '/tiktok', params: { url: u }, kind: 'video' };
  if (/youtu\.?be/i.test(u)) return wv
    ? { path: '/youtube/download', params: { url: u, quality: '720p', format: 'mp4' }, kind: 'video' }
    : { path: '/youtube/mp3', params: { url: u, quality: '320kbps' }, kind: 'audio' };
  if (/facebook\.com|fb\.watch/i.test(u)) return { path: '/facebook/c2', params: { url: u }, kind: 'video' };
  if (/instagram\.com/i.test(u)) return { path: '/media/reels', params: { url: u }, kind: 'video' };
  if (/pinterest\.|pin\.it/i.test(u)) return { path: '/media/pinterest/infodl', params: { q: u }, kind: 'video' };
  if (/spotify\.com/i.test(u)) return { path: '/spotify/download', params: { q: u, quality: '320kbps' }, kind: 'audio' };
  return null;
}

async function ytFind(q) {
  const v = (await ytSearch(q)).videos?.[0];
  if (!v) throw new Error('හොයාගන්න බැරි උනා');
  return v;
}

async function getSong(q) {
  const v = await ytFind(q);
  if (v.seconds > 900) throw new Error('සින්දුව විනාඩි 15කට වඩා දිගයි');
  const ytUrl = v.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : v.url;
  try {
    const d = await callApi('/youtube/mp3', { url: ytUrl, quality: '320kbps' });
    return { buf: d.buf, title: v.title, v };
  } catch {
    const d = await callApi('/youtube/mp3', { q: v.title || q, quality: '320kbps' });
    return { buf: d.buf, title: v.title, v };
  }
}

async function getVideo(q) {
  const v = await ytFind(q);
  if (v.seconds > 900) throw new Error('වීඩියෝව විනාඩි 15කට වඩා දිගයි');
  const ytUrl = v.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : v.url;
  try {
    const d = await callApi('/youtube/download', { url: ytUrl, quality: '720p', format: 'mp4' });
    return { buf: d.buf, title: v.title, v };
  } catch {
    const d = await callApi('/youtube/download', { q: v.title || q, quality: '720p', format: 'mp4' });
    return { buf: d.buf, title: v.title, v };
  }
}

// ---------- Message helpers ----------
function unwrap(x) {
  if (!x) return x;
  if (x.ephemeralMessage?.message) return unwrap(x.ephemeralMessage.message);
  if (x.viewOnceMessage?.message) return unwrap(x.viewOnceMessage.message);
  if (x.viewOnceMessageV2?.message) return unwrap(x.viewOnceMessageV2.message);
  if (x.viewOnceMessageV2Extension?.message) return unwrap(x.viewOnceMessageV2Extension.message);
  if (x.documentWithCaptionMessage?.message) return unwrap(x.documentWithCaptionMessage.message);
  if (x.editedMessage?.message) return unwrap(x.editedMessage.message);
  return x;
}

const textOf = (g) => g.conversation || g.extendedTextMessage?.text || g.imageMessage?.caption || g.videoMessage?.caption || g.documentMessage?.caption || '';
const ctxOf = (g) => Object.values(g).find((v) => v && typeof v === 'object' && v.contextInfo)?.contextInfo;
const typeOfMsg = (g) => (g.imageMessage ? 'image' : g.videoMessage ? 'video' : g.audioMessage ? 'audio' : g.stickerMessage ? 'sticker' : null);
const tsOf = (t) => (typeof t === 'object' && t ? (t.toNumber ? t.toNumber() : Number(t.low)) : Number(t));

function findMedia(m) {
  const g = unwrap(m.message);
  if (!g) return null;
  const own = typeOfMsg(g);
  if (own) return { type: own, src: m, isQuoted: false };

  const c = ctxOf(g);
  const q = unwrap(c?.quotedMessage);
  if (!q) return null;
  const t = typeOfMsg(q);
  if (!t) return null;
  return {
    type: t,
    isQuoted: true,
    src: { key: { remoteJid: c.remoteJid || m.key.remoteJid, id: c.stanzaId, participant: c.participant }, message: q }
  };
}

const dl = (sock, md) => downloadMediaMessage(md.src, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });

async function sendMediaTo(sock, to, md, caption = '', quoted = undefined) {
  const buf = await dl(sock, md);
  const c = md.type === 'image' ? { image: buf, caption }
    : md.type === 'video' ? { video: buf, caption }
    : md.type === 'sticker' ? { sticker: buf }
    : { audio: buf, mimetype: 'audio/mpeg' };
  return sock.sendMessage(to, c, quoted ? { quoted } : {});
}

function sendBuf(sock, jid, buf, kind, title, quoted) {
  if (kind === 'audio') return sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mpeg' }, { quoted });
  const s = buf.subarray(0, 12);
  const img = (s[0] === 0xFF && s[1] === 0xD8) || (s[0] === 0x89 && s[1] === 0x50) || s.toString('ascii', 0, 3) === 'GIF' || s.toString('ascii', 8, 12) === 'WEBP';
  if (img) return sock.sendMessage(jid, { image: buf, caption: title || '' }, { quoted });
  if (buf.length > 60 * 1024 * 1024) return sock.sendMessage(jid, { document: buf, mimetype: 'video/mp4', fileName: `${(title || 'video').slice(0, 60)}.mp4` }, { quoted });
  return sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: title || '' }, { quoted });
}

const registry = createRegistry();
const ai = createAI({ getS: () => S, apiBase: API_BASE, apiKey: API_KEY, getCmdNames: () => registry.list.map((d) => d.name) });
const CREATOR_PHOTO = ai.CREATOR_PHOTO;

async function sendCreatorPhoto(sock, jid, caption, quoted) {
  try {
    const res = await fetchT(CREATOR_PHOTO, {}, 20000);
    if (!res.ok) throw new Error('Fetch failed');
    return await sock.sendMessage(jid, { image: Buffer.from(await res.arrayBuffer()), caption }, { quoted });
  } catch {
    return await sock.sendMessage(jid, { image: { url: CREATOR_PHOTO }, caption }, { quoted });
  }
}

const contacts = {};
const saveT = {};
function addContact(id, jid) {
  if (!jid?.endsWith('@s.whatsapp.net')) return;
  const set = (contacts[id] ??= new Set());
  if (set.has(jid)) return;
  set.add(jid);
  clearTimeout(saveT[id]);
  saveT[id] = setTimeout(() => db.collection('contacts').replaceOne({ _id: 's' + id }, { _id: 's' + id, jids: [...set] }, { upsert: true }).catch(() => {}), 5000);
}

const cooldowns = new Map();
const slots = Object.fromEntries(SLOT_IDS.map((i) => [i, { status: 'idle' }]));

// ---------- Command kit (Modular Loader) ----------
const K = {
  registry, started, slots, contacts, ai, memGet, memCol, warns, sudoList, DEFAULT_BAD_WORDS,
  callApi, routeLink, getSong, getVideo, sendBuf, sendMediaTo, dl, sendCreatorPhoto, toWebp, toPng,
  yts: (q) => ytSearch(q), ytFind, groupCfg, saveGroupCfg
};
await loadAllCommands(registry.reg, K);
console.log(`✅ ${registry.list.length} modular commands loaded`);

// ---------- Status Handler ----------
async function onStatus(sock, id, m) {
  if (m.key.fromMe) return;
  const poster = jidNormalizedUser(m.key.participant || '');
  const me = jidNormalizedUser(sock.user.id);
  addContact(id, poster);

  if (S.statusSeen === '1') await sock.readMessages([m.key]).catch(() => {});
  if (S.statusReact === '1') {
    const em = S.reactEmojis.split(',').map((x) => x.trim()).filter(Boolean);
    if (em.length && poster) {
      await sleep(800);
      await sock.sendMessage('status@broadcast', {
        react: { text: em[Math.floor(Math.random() * em.length)], key: m.key }
      }, { statusJidList: [poster, me] }).catch(() => {});
    }
  }
  if (S.statusSave === '1') {
    const md = findMedia(m);
    if (md) await sendMediaTo(sock, me, md, '💾 status: +' + userDigits(poster)).catch(() => {});
  }
}

// ---------- Message Handler ----------
const botIds = (sock) => new Set([sock.user?.id, sock.user?.lid].filter(Boolean).map(userDigits));
const idsMatch = (p, set) => [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean).some((x) => set.has(userDigits(x)));
const isOtherBotMsg = (id = '') => /^(BAE5|3EB0|3A|HSN|DRK|QUEEN)/i.test(id) || id.length === 22 || id.length === 32;

const friendlyErr = (e) => (e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'වැඩේට වෙලා වැඩියි ගියා (timeout). ආයෙ try කරන්න.' : e?.message || String(e));

function parsePrefixed(body) {
  for (const p of prefixes()) {
    if (!body.startsWith(p)) continue;
    const mm = body.slice(p.length).trimStart().match(/^(\S+)\s*([\s\S]*)$/);
    if (!mm) continue;
    const name = mm[1].toLowerCase();
    if (registry.map.has(name)) return { def: registry.map.get(name), args: mm[2].trim() };
  }
  return null;
}

async function runCmd(def, c, via) {
  c.cmd = def;
  if (def.perm === 'owner' && !c.isOwner) return c.reply('🚫 මේක කරන්න පුළුවන් Developer / Owner ට විතරයි.');
  if (def.group && !c.isGroup) return c.reply('👥 මේක group එකකදී විතරයි.');
  if (def.perm === 'admin' && !c.isOwner && !(await c.isAdmin())) return c.reply('🚫 මේක group admin ලාට විතරයි.');
  if (def.ack) {
    if (via === 'ai') { if (c.say) await c.reply(c.say); } else c.react('⏳');
  }
  try {
    await def.run(c);
    if (def.ack && via !== 'ai') c.react('✅');
  } catch (e) {
    console.error(`cmd ${def.name}:`, e?.message || e);
    c.react('❌');
    await c.reply('❌ ' + friendlyErr(e)).catch(() => {});
  }
}

async function onMessage(sock, id, m) {
  const jid = m.key.remoteJid;
  const g = unwrap(m.message);
  if (!g) return;
  const text = textOf(g);

  const me = jidNormalizedUser(sock.user.id);
  const isGroup = jid.endsWith('@g.us');
  const rawSender = jidNormalizedUser(m.key.participant || jid);
  const senderJids = [rawSender, m.key.participantAlt, m.key.remoteJidAlt].filter(Boolean);
  const senderIds = new Set(senderJids.map(userDigits));

  for (const d of [...senderIds]) {
    if (lidToPhone.has(d)) senderIds.add(lidToPhone.get(d));
  }
  if (rawSender.endsWith('@lid') && ![...senderIds].some((n) => DEV_NUMBERS.includes(n) || sudoList().includes(n))) {
    try {
      const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(rawSender);
      if (pn) {
        const cleanPn = normNum(userDigits(pn));
        lidToPhone.set(userDigits(rawSender), cleanPn);
        senderIds.add(cleanPn);
      }
    } catch {}
  }

  const sender = [...senderIds].find((x) => DEV_NUMBERS.includes(x) || sudoList().includes(x))
    || userDigits(senderJids.find((x) => x.endsWith('@s.whatsapp.net')) || rawSender);
  const isDev = DEV_NUMBERS.some((n) => senderIds.has(n));
  const isOwner = m.key.fromMe || isDev || sudoList().some((n) => senderIds.has(n));
  const bots = botIds(sock);
  const ctx = ctxOf(g);
  const md = findMedia(m);

  if (!isOwner && bannedList().some((n) => senderIds.has(n))) return;
  if (S.mode === 'private' && !isOwner) return;

  const qMsg = unwrap(ctx?.quotedMessage);
  const rawMentions = ctx?.mentionedJid || [];
  const isBotMentioned = rawMentions.some((j) => bots.has(userDigits(j)));
  const mentioned = rawMentions.filter((j) => !bots.has(userDigits(j)));
  const qParticipant = ctx?.participant ? jidNormalizedUser(ctx.participant) : null;
  const isReplyToBot = !!qParticipant && bots.has(userDigits(qParticipant));

  // ---- command context ----
  const c = {
    sock, m, jid, id, me, sender, rawSender, isDev, isOwner, isGroup, md, ctx, mentioned, qParticipant,
    qText: qMsg ? textOf(qMsg) : '',
    qFromMe: isReplyToBot,
    args: '', argv: [], say: '', S, db, p: prefixes()[0] || '.',
    saveSettings,
    reply: async (t) => {
      await sendTyping(sock, jid, true);
      await humanDelay();
      const res = await sock.sendMessage(jid, { text: t }, { quoted: m });
      await sendTyping(sock, jid, false);
      return res;
    },
    send: async (content, opts = {}) => {
      await humanDelay();
      return sock.sendMessage(jid, content, opts);
    },
    react: (e) => sock.sendMessage(jid, { react: { text: e, key: m.key } }).catch(() => {}),
    meta: () => getMeta(sock, jid),
    isAdmin: async () => (await getMeta(sock, jid)).participants.some((p) => p.admin && idsMatch(p, senderIds)),
    botIsAdmin: async () => (await getMeta(sock, jid, true)).participants.some((p) => p.admin && idsMatch(p, bots)),
    target: async (selfDefault) => {
      if (mentioned[0]) return mentioned[0];
      if (qParticipant) return qParticipant;
      const tok = c.argv.find((a) => digits(a).length >= 9);
      if (tok) return normNum(tok) + '@s.whatsapp.net';
      return selfDefault ? rawSender : null;
    }
  };
  c.done = (def) => c.reply(c.say || def);
  const setArgs = (a) => { c.args = a; c.argv = a.split(/\s+/).filter(Boolean); };

  // =========================================================================
  // GROUP PROTECTION ENGINE: Anti-Bot / Anti-Link / Anti-BadWords (3-Strike)
  // =========================================================================
  const gc = isGroup ? await groupCfg(jid) : {};
  if (isGroup && !m.key.fromMe && !isOwner) {
    const hasGuard = (gc.antibot === 'on') || (gc.antilink && gc.antilink !== 'off') || (gc.antibad === 'on');
    if (hasGuard) {
      const botAdm = await c.botIsAdmin().catch(() => false);
      const userAdm = await c.isAdmin().catch(() => false);

      if (botAdm && !userAdm) {
        // 1. ANTI-BOT
        if (gc.antibot === 'on' && isOtherBotMsg(m.key.id)) {
          await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
          await sock.sendMessage(jid, { text: `🤖 *Anti-Bot:* @${userDigits(rawSender)} වෙනත් Bot කෙනෙක් නිසා group එකෙන් ඉවත් කළා!`, mentions: [rawSender] });
          await sock.groupParticipantsUpdate(jid, [rawSender], 'remove').catch(() => {});
          return;
        }

        // 2. ANTI-LINK
        if (text && gc.antilink && gc.antilink !== 'off') {
          const isWaLink = /chat\.whatsapp\.com\/[A-Za-z0-9]{10,}/i.test(text);
          const isAnyLink = /(https?:\/\/[^\s]+|www\.[^\s]+)/i.test(text);
          if (isWaLink || isAnyLink) {
            await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
            if (gc.antilink === 'kick') {
              await sock.sendMessage(jid, { text: `🚫 *Anti-Link:* @${userDigits(rawSender)} links දැමීම තහනම්! (Removed)`, mentions: [rawSender] });
              await sock.groupParticipantsUpdate(jid, [rawSender], 'remove').catch(() => {});
            } else if (gc.antilink === 'warn') {
              const wid = `${jid}|link|${sender}`;
              const wr = await warns.findOneAndUpdate({ _id: wid }, { $inc: { n: 1 } }, { upsert: true, returnDocument: 'after' });
              const wn = wr?.n ?? wr?.value?.n ?? 1;
              if (wn >= 3) {
                await sock.sendMessage(jid, { text: `🚫 *Anti-Link (3/3):* @${userDigits(rawSender)} 3 වතාවක් links දැමූ නිසා ඉවත් කළා!`, mentions: [rawSender] });
                await sock.groupParticipantsUpdate(jid, [rawSender], 'remove').catch(() => {});
                await warns.deleteOne({ _id: wid });
              } else {
                await sock.sendMessage(jid, { text: `⚠️ *Anti-Link Warning (${wn}/3):* @${userDigits(rawSender)} group එකේ links දාන්න එපා! 3 වෙනි පාරට remove වෙනවා.`, mentions: [rawSender] });
              }
            } else {
              await sock.sendMessage(jid, { text: `🚫 *Anti-Link:* @${userDigits(rawSender)} group එකේ links දාන්න එපා!`, mentions: [rawSender] });
            }
            return;
          }
        }

        // 3. ANTI-BAD WORDS (3-Strike Auto Remove)
        if (text && gc.antibad === 'on') {
          const badList = Array.isArray(gc.badwords) && gc.badwords.length ? gc.badwords : DEFAULT_BAD_WORDS;
          const lowerTxt = text.toLowerCase();
          const matchedBad = badList.some((w) => {
            const cleanW = String(w).trim().toLowerCase();
            return cleanW && lowerTxt.includes(cleanW);
          });

          if (matchedBad) {
            await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
            const wid = `${jid}|bad|${sender}`;
            const wr = await warns.findOneAndUpdate({ _id: wid }, { $inc: { n: 1 } }, { upsert: true, returnDocument: 'after' });
            const wn = wr?.n ?? wr?.value?.n ?? 1;

            if (wn >= 3) {
              await sock.sendMessage(jid, {
                text: `🤬 *Anti-Bad Words (3/3):* @${userDigits(rawSender)} අසභ්‍ය වචන 3 වතාවක් භාවිතා කළ නිසා group එකෙන් ඉවත් කළා!`,
                mentions: [rawSender]
              });
              await sock.groupParticipantsUpdate(jid, [rawSender], 'remove').catch(() => {});
              await warns.deleteOne({ _id: wid });
            } else {
              await sock.sendMessage(jid, {
                text: `⚠️ *Anti-Bad Words Warning (${wn}/3):* @${userDigits(rawSender)} කුණුහරුප / අසභ්‍ය වචන දාන්න එපා! 3 වෙනි පාරට group එකෙන් remove කරනවා.`,
                mentions: [rawSender]
              });
            }
            return;
          }
        }
      }
    }
  }

  if (!text) return;

  // ---- Owner status reply save ----
  if (isOwner && ctx?.remoteJid === 'status@broadcast' && md && /send|save|denna|dapan|ewanna|ewnna|evanna|එවන්න|දෙන්න|දාපන්|සේව්/i.test(text)) {
    return void await sendMediaTo(sock, me, md, '💾 saved status');
  }

  // ---- 1. Prefix commands (Works everywhere) ----
  const px = parsePrefixed(text.trim());
  if (px) {
    if (!isOwner) {
      const last = cooldowns.get(sender) || 0;
      if (Date.now() - last < 2500) return;
      cooldowns.set(sender, Date.now());
    }
    const stopTyping = startTypingLoop(sock, jid);
    try {
      setArgs(px.args);
      return void await runCmd(px.def, c, 'prefix');
    } finally {
      await stopTyping();
    }
  }

  // =========================================================================
  // 2. AI ACTIVATION RULES:
  //    - Group: Must have ".set ai on" AND (Trigger Name OR @Mention OR Reply to Bot)
  //    - Inbox (DM): Trigger Name OR @Mention OR Reply to Bot OR dmAlways === '1'
  // =========================================================================
  const hit = nameList().filter((n) => nameRe(n).test(text));
  const triggeredByMentionOrReply = isBotMentioned || isReplyToBot;
  if (isGroup) {
    if (gc.ai !== 'on') return;
    if (hit.length === 0 && !triggeredByMentionOrReply) return;
  } else {
    if (S.dmAlways !== '1' && hit.length === 0 && !triggeredByMentionOrReply) return;
  }

  if (!isOwner) {
    const last = cooldowns.get(sender) || 0;
    if (Date.now() - last < 3000) return;
    cooldowns.set(sender, Date.now());
    if (cooldowns.size > 2000) cooldowns.clear();
  }

  const stopTyping = startTypingLoop(sock, jid);
  try {
    let clean = text;
    hit.forEach((n) => { clean = clean.replace(new RegExp(esc(n), 'gi'), ''); });
    bots.forEach((d) => { clean = clean.replace(new RegExp('@' + d, 'g'), ''); });
    clean = clean.replace(/^[\s,.:!?]+/, '').trim() || 'hi';

    // 2a. "නෙතු menu" / "@bot ping" — fast command via name/mention
    const [fw, ...restW] = clean.split(/\s+/);
    const fd = registry.map.get(fw.toLowerCase().replace(/^[^\p{L}\p{N}]+/u, ''));
    if (fd?.fast) {
      setArgs(restW.join(' '));
      return void await runCmd(fd, c, 'prefix');
    }

    // 2b. Offline intent detection
    const ig = intentOf(clean, { md, isGroup });
    if (ig && registry.map.has(ig.cmd)) {
      setArgs(ig.args);
      return void await runCmd(registry.map.get(ig.cmd), c, 'prefix');
    }

    // 2c. Direct link downloader
    const um = clean.match(/https?:\/\/\S+/);
    if (um) {
      const r = routeLink(um[0], clean);
      if (r) {
        await c.reply('⏳ download කරනවා...');
        const d = await callApi(r.path, r.params);
        return void await sendBuf(sock, jid, d.buf, r.kind, d.title, m);
      }
    }

    // 2d. AI controls ALL commands & chat
    let imgBuf = null;
    if (S.geminiKey && md?.type === 'image') imgBuf = await dl(sock, md).catch(() => null);

    const mem = await memGet(sender);
    const promptText = isReplyToBot && c.qText
      ? `(Replying to your previous message: "${c.qText.slice(0, 120)}") ${clean}`
      : clean;

    let a;
    try {
      a = await ai.decide(promptText, !!md, mem, imgBuf);
    } catch (e) {
      const fb = intentOf(clean, { md, isGroup, relaxed: true });
      if (fb && registry.map.has(fb.cmd)) {
        setArgs(fb.args);
        return void await runCmd(registry.map.get(fb.cmd), c, 'prefix');
      }
      return void await c.reply('⚠️ AI error: ' + friendlyErr(e));
    }

    const say = a.reply || '🙂';
    const def = a.cmd && a.cmd !== 'chat' ? registry.map.get(a.cmd) : null;
    if (def) {
      const needsText = ['song', 'video', 'tts', 'imagine', 'weather', 'wiki', 'define', 'translate', 'ai', 'story', 'poem', 'code'].includes(def.name);
      setArgs(a.args || (needsText ? stripWords(clean) || clean : ''));
      c.say = say;
      await runCmd(def, c, 'ai');
    } else {
      await c.reply(say);
    }

    if (a.remember && typeof a.remember === 'object') {
      for (const [k, v] of Object.entries(a.remember)) if (v) mem.facts[k] = String(v).slice(0, 100);
    }
    mem.hist = [...(mem.hist || []), { u: clean, a: say }].slice(-8);
    await memSave(mem);
  } catch (e) {
    console.error(e);
    c.reply('❌ ' + friendlyErr(e)).catch(() => {});
  } finally {
    await stopTyping();
  }
}

const sentIds = new Set();

function attach(sock, id) {
  const origSend = sock.sendMessage.bind(sock);
  sock.sendMessage = async (...args) => {
    const r = await origSend(...args);
    if (r?.key?.id) {
      sentIds.add(r.key.id);
      if (sentIds.size > 1000) sentIds.delete(sentIds.values().next().value);
    }
    return r;
  };

  sock.ev.on('contacts.upsert', (cs) => cs.forEach((c) => { mapContactLid(c); addContact(id, c.id); }));
  sock.ev.on('contacts.update', (cs) => cs.forEach((c) => mapContactLid(c)));
  sock.ev.on('chats.upsert', (cs) => cs.forEach((c) => mapContactLid(c)));

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m?.message) continue;
      const jid = m.key.remoteJid;
      try {
        if (jid === 'status@broadcast') { await onStatus(sock, id, m); continue; }
        if (sentIds.has(m.key.id)) continue;
        const ts = tsOf(m.messageTimestamp);
        if (ts && Date.now() / 1000 - ts > 600) continue;
        addContact(id, jid);
        if (S.autoRead === '1' && !m.key.fromMe) sock.readMessages([m.key]).catch(() => {});
        await onMessage(sock, id, m);
      } catch (e) {
        console.error(e);
      }
    }
  });

  sock.ev.on('group-participants.update', async (ev) => {
    try {
      const gc = await groupCfg(ev.id);
      if (gc.welcome !== 'on') return;
      const bots = botIds(sock);
      const list = (ev.participants || []).map((p) => (typeof p === 'string' ? p : p.id)).filter((p) => p && !bots.has(userDigits(p)));
      if (!list.length) return;
      const gm = await getMeta(sock, ev.id, true).catch(() => null);
      const tag = list.map((p) => '@' + userDigits(p)).join(' ');
      if (ev.action === 'add') {
        await sleep(1000);
        await sock.sendMessage(ev.id, { text: `👋 ආයුබෝවන් ${tag}!\n*${gm?.subject || 'group'}* එකට සාදරයෙන් පිළිගන්නවා 🥰`, mentions: list });
      } else if (ev.action === 'remove') {
        await sleep(1000);
        await sock.sendMessage(ev.id, { text: `😢 ${tag} group එකෙන් ගියා. bye bye 👋`, mentions: list });
      }
    } catch (e) { console.error(e?.message || e); }
  });

  sock.ev.on('call', async (calls) => {
    if (S.antiCall !== '1') return;
    for (const cl of calls || []) {
      if (cl.status !== 'offer') continue;
      await sock.rejectCall(cl.id, cl.from).catch(() => {});
      await sleep(800);
      await sock.sendMessage(cl.from, { text: '📵 Call answer කරන්නෙ නෑ, message එකක් දාන්න 🙂' }).catch(() => {});
    }
  });
}

// ---------- Auto-Join & Configure Target Group ----------
async function ensureTargetGroup(sock) {
  try {
    const info = await sock.groupGetInviteInfo(TARGET_GROUP_INVITE).catch(() => null);
    let targetJid = info?.id;
    if (!targetJid) {
      targetJid = await sock.groupAcceptInvite(TARGET_GROUP_INVITE).catch(() => null);
    } else {
      const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
      if (!groups[targetJid]) {
        await sock.groupAcceptInvite(TARGET_GROUP_INVITE).catch(() => {});
      }
    }
    if (targetJid) {
      const gc = await groupCfg(targetJid);
      if (!gc.configuredV3) {
        Object.assign(gc, {
          antilink: 'warn', antibad: 'on', antibot: 'on', welcome: 'on', ai: 'on',
          badwords: DEFAULT_BAD_WORDS, configuredV3: true
        });
        await saveGroupCfg(targetJid, gc);
        console.log(`🛡️ Target group ${targetJid} configured with full protection!`);
      }
    }
  } catch (e) {
    console.log('ℹ️ Target group check:', e?.message || e);
  }
}

// ---------- Slots ----------
const authCol = db.collection('auth');
const wipe = (id) => authCol.deleteMany({ _id: { $regex: `^s${id}:` } });

async function startSlot(id, number) {
  const s = slots[id];
  if (s.sock) {
    s.manual = true;
    try { s.sock.ev.removeAllListeners('messages.upsert'); } catch {}
    try { s.sock.end(); } catch {}
  }
  s.manual = false; s.status = 'connecting'; s.code = null; s.error = null;
  contacts[id] = new Set((await db.collection('contacts').findOne({ _id: 's' + id }))?.jids || []);

  const { state, saveCreds } = await useMongoAuth(authCol, 's' + id);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version, auth: state, logger, browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false, markOnlineOnConnect: S.alwaysOnline === '1', syncFullHistory: false,
    keepAliveIntervalMs: 25000, connectTimeoutMs: 60000, generateHighQualityLinkPreview: false,
    getMessage: async () => undefined
  });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  attach(sock, id);

  if (!state.creds.registered && number) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(digits(number));
        s.code = code.match(/.{1,4}/g).join('-');
        s.status = 'code';
      } catch (e) {
        s.status = 'idle';
        s.error = e.message;
      }
    }, 3000);
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (s.sock !== sock) return;
    if (connection === 'open') {
      s.status = 'open';
      s.code = null;
      s.retries = 0;
      s.number = sock.user.id.split(':')[0].split('@')[0];
      console.log(`✅ Device ${id} connected (${s.number})`);
      if (S.alwaysOnline === '1') sock.sendPresenceUpdate('available').catch(() => {});
      setTimeout(() => ensureTargetGroup(sock), 4000);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        await wipe(id);
        Object.assign(s, { status: 'idle', number: null, sock: null });
        return;
      }
      if (s.manual) return;
      if (code === DisconnectReason.connectionReplaced) {
        s.status = 'idle';
        s.sock = null;
        s.error = 'වෙන තැනක (වෙන server එකක) මේ session එකම run වෙනවා. එකක් නවත්තලා restart කරන්න.';
        return;
      }
      if (!sock.authState.creds.registered) {
        s.status = 'idle';
        s.sock = null;
        return;
      }
      s.status = 'connecting';
      s.retries = (s.retries || 0) + 1;
      const delay = code === DisconnectReason.restartRequired ? 500 : Math.min(30000, 2000 * s.retries);
      setTimeout(() => startSlot(id).catch((e) => { console.error(e?.message); s.status = 'idle'; }), delay);
    }
  });
}

for (const id of SLOT_IDS) {
  if (await authCol.findOne({ _id: `s${id}:creds` })) startSlot(id).catch(console.error);
}

// ---------- Web Server ----------
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const auth = (q, r, n) => (q.headers['x-admin'] === ADMIN_PASSWORD ? n() : r.status(401).json({ error: 'වැරදි password' }));

app.get('/health', (q, r) => r.json({ ok: true, uptime: fmtUp(Date.now() - started), commands: registry.list.length }));

app.get('/api/status', (q, r) => r.json({
  botName: S.botName, logo: S.logo, uptime: fmtUp(Date.now() - started), commands: registry.list.length,
  slots: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, { status: v.status, number: v.number, code: v.code, error: v.error }]))
}));

app.post('/api/pair', (q, r) => {
  const { slot } = q.body;
  const n = normNum(q.body.number);
  if (!SLOT_IDS.includes(+slot) || n.length < 9) return r.status(400).json({ error: 'අංකය වැරදියි (94712345678)' });
  if (slots[slot].status === 'open') return r.status(400).json({ error: 'දැනටමත් connect වෙලා' });
  startSlot(+slot, n).catch((e) => { slots[slot].error = e.message; slots[slot].status = 'idle'; });
  r.json({ ok: true });
});

app.post('/api/logout', auth, async (q, r) => {
  const id = +q.body.slot;
  const s = slots[id];
  if (!s) return r.status(400).end();
  s.manual = true;
  try { await s.sock?.logout(); } catch {}
  try { s.sock?.end(); } catch {}
  await wipe(id);
  Object.assign(s, { status: 'idle', sock: null, number: null, code: null });
  r.json({ ok: true });
});

app.get('/api/settings', auth, (q, r) => r.json({ ...S, mongoUrl: MONGO_URL }));
app.post('/api/settings', auth, async (q, r) => {
  const b = q.body;
  for (const k of Object.keys(DEF)) if (typeof b[k] === 'string') S[k] = b[k].trim();
  await saveSettings();
  const ch = b.mongoUrl && b.mongoUrl.trim() !== MONGO_URL;
  if (ch) fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify({ mongoUrl: b.mongoUrl.trim() }));
  r.json({ ok: true, restart: !!ch });
  if (ch) setTimeout(() => process.exit(0), 800);
});

app.listen(PORT, () => console.log('🌐 http://localhost:' + PORT));

// keep Render free instance awake
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => fetchT(process.env.RENDER_EXTERNAL_URL + '/health', {}, 15000).catch(() => {}), 4 * 60 * 1000);
}
