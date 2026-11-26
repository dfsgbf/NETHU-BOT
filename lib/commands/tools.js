import crypto from 'crypto';
import { clip, getJson, getText, calc, fmtNum } from '../util.js';

const TZ = {
  colombo: 'Asia/Colombo', srilanka: 'Asia/Colombo', sl: 'Asia/Colombo', london: 'Europe/London', dubai: 'Asia/Dubai',
  tokyo: 'Asia/Tokyo', newyork: 'America/New_York', delhi: 'Asia/Kolkata', singapore: 'Asia/Singapore', sydney: 'Australia/Sydney'
};

export default function (reg) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'tools', desc, ...opt, run });

  a('calc', ['math', 'calculate', 'ගණනය'], 'ගණිත ගණනය', { usage: '<2+2*5>' }, async (c) => {
    if (!c.args) return c.reply(`🧮 උදා: ${c.p}calc (25*4)+sqrt(81)`);
    try { await c.reply(`🧮 ${c.args}\n= *${calc(c.args)}*`); } catch { await c.reply('❌ expression එක වැරදියි.'); }
  });

  a('weather', ['w', 'කාලගුණය'], 'කාලගුණය', { usage: '<නගරය>' }, async (c) => {
    const city = c.args || 'Colombo';
    const j = await getJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, 20000);
    const cur = j.current_condition?.[0];
    if (!cur) throw new Error('නගරය හොයාගන්න බැරි උනා');
    const area = j.nearest_area?.[0];
    await c.reply(`🌤️ *${area?.areaName?.[0]?.value || city}*\n🌡️ දැන්: *${cur.temp_C}°C* | 💧 Humidity: ${cur.humidity}% | 💨 Wind: ${cur.windspeedKmph} km/h`);
  });

  a('wiki', ['wikipedia', 'whatis'], 'Wikipedia', { usage: '<මාතෘකාව>' }, async (c) => {
    if (!c.args) return c.reply(`📚 උදා: ${c.p}wiki Sri Lanka`);
    const lang = /[\u0D80-\u0DFF]/.test(c.args) ? 'si' : 'en';
    const j = await getJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(c.args)}`, 15000).catch(() => null);
    if (!j?.extract) return c.reply('😕 හම්බුනේ නෑ.');
    await c.reply(`📚 *${j.title}*\n\n${clip(j.extract, 900)}`);
  });

  a('define', ['dict', 'meaning'], 'English word meaning', { usage: '<word>' }, async (c) => {
    if (!c.args) return c.reply(`📖 උදා: ${c.p}define serendipity`);
    const j = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(c.args.split(' ')[0])}`, 15000).catch(() => null);
    const e = j?.[0];
    if (!e) return c.reply('😕 වචනය හම්බුනේ නෑ.');
    await c.reply(`📖 *${e.word}*\n` + e.meanings.slice(0, 3).map((m) => `• _${m.partOfSpeech}_: ${m.definitions[0].definition}`).join('\n'));
  });

  a('time', ['date', 'වෙලාව', 'clock'], 'වෙලාව / දිනය', { usage: '[නගරය]' }, async (c) => {
    const q = (c.args || 'colombo').toLowerCase().replace(/\s+/g, '');
    const tz = TZ[q] || (c.args.includes('/') ? c.args.trim() : 'Asia/Colombo');
    try {
      const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' }).format(new Date());
      await c.reply(`🕒 *${tz}*\n${f}`);
    } catch { await c.reply('❌ timezone එක වැරදියි.'); }
  });

  a('currency', ['cur', 'convert', 'exchange'], 'Currency convert', { usage: '<amount> <FROM> <TO>' }, async (c) => {
    const m = c.args.match(/^([\d.,]+)\s*([a-zA-Z]{3})\s*(?:to|->|=|\s)?\s*([a-zA-Z]{3})$/);
    if (!m) return c.reply(`💱 ${c.p}currency 100 usd lkr`);
    const [, amt, f, t] = m;
    const j = await getJson(`https://open.er-api.com/v6/latest/${f.toUpperCase()}`, 15000);
    const r = j?.rates?.[t.toUpperCase()];
    if (!r) return c.reply('😕 currency code වැරදියි.');
    const n = parseFloat(amt.replace(/,/g, ''));
    await c.reply(`💱 ${fmtNum(n)} ${f.toUpperCase()} = *${fmtNum((n * r).toFixed(2))} ${t.toUpperCase()}*`);
  });

  a('shorten', ['short', 'tinyurl'], 'Link එක කෙටි කරන්න', { usage: '<link>' }, async (c) => {
    const l = (c.args || c.qText).match(/https?:\/\/\S+/)?.[0];
    if (!l) return c.reply('🔗 link එකක් දෙන්න.');
    await c.reply('🔗 ' + (await getText(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(l)}`, 15000)).trim());
  });

  a('password', ['pass', 'genpass'], 'ශක්තිමත් password එකක්', { usage: '[length]' }, async (c) => {
    const n = Math.min(Math.max(parseInt(c.args) || 14, 6), 40);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
    const p = Array.from(crypto.randomBytes(n), (b) => chars[b % chars.length]).join('');
    await c.reply(`🔐 \`${p}\``);
  });

  a('base64', ['b64'], 'Base64 encode/decode', { usage: 'enc|dec <text>' }, async (c) => {
    const m = c.args.match(/^(enc|encode|dec|decode)\s+([\s\S]+)$/i);
    if (!m) return c.reply(`🔐 ${c.p}base64 enc hello`);
    await c.reply(/^enc/i.test(m[1]) ? Buffer.from(m[2]).toString('base64') : Buffer.from(m[2], 'base64').toString('utf8'));
  });

  a('reverse', ['rev'], 'Text ආපස්සට', { usage: '<text>' }, (c) => c.reply([...(c.args || c.qText || '')].reverse().join('') || '✍️ text එකක් දෙන්න'));
  a('upper', ['uppercase'], 'UPPERCASE', { usage: '<text>' }, (c) => c.reply((c.args || c.qText || '').toUpperCase() || '✍️ text එකක් දෙන්න'));
  a('lower', ['lowercase'], 'lowercase', { usage: '<text>' }, (c) => c.reply((c.args || c.qText || '').toLowerCase() || '✍️ text එකක් දෙන්න'));
  a('count', ['wordcount', 'len'], 'අකුරු / වචන ගණන', { usage: '<text | reply>' }, (c) => {
    const t = c.args || c.qText || '';
    return c.reply(`🔢 අකුරු: *${[...t].length}* | 📝 වචන: *${t.trim() ? t.trim().split(/\s+/).length : 0}*`);
  });

  a('bmi', [], 'BMI ගණනය', { usage: '<kg> <cm>' }, async (c) => {
    const [kg, cm] = c.argv.map(parseFloat);
    if (!kg || !cm) return c.reply(`⚖️ ${c.p}bmi 65 170`);
    const b = kg / ((cm / 100) ** 2);
    const s = b < 18.5 ? 'අඩු බර 🥲' : b < 25 ? 'සාමාන්‍යයි ✅' : b < 30 ? 'වැඩි බර ⚠️' : 'තරබාරුයි 🚨';
    await c.reply(`⚖️ BMI: *${b.toFixed(1)}* — ${s}`);
  });

  a('age', ['birthday'], 'වයස ගණනය', { usage: 'YYYY-MM-DD' }, async (c) => {
    const d = new Date(c.args);
    if (isNaN(d)) return c.reply(`🎂 ${c.p}age 2005-03-15`);
    const n = new Date();
    let y = n.getFullYear() - d.getFullYear(), mo = n.getMonth() - d.getMonth(), da = n.getDate() - d.getDate();
    if (da < 0) { mo--; da += 30; }
    if (mo < 0) { y--; mo += 12; }
    await c.reply(`🎂 වයස: *${y}* අවුරුදු ${mo} මාස ${da} දින`);
  });

  a('random', ['rand', 'number'], 'Random number', { usage: '[min] [max]' }, (c) => {
    let [mn, mx] = c.argv.map(Number);
    if (!isFinite(mn)) { mn = 1; mx = 100; } else if (!isFinite(mx)) { mx = mn; mn = 1; }
    return c.reply(`🎲 *${Math.floor(Math.random() * (mx - mn + 1)) + mn}*`);
  });
}
