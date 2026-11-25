// ---------- Command registry (100+ commands) ----------
import crypto from 'crypto';
import { digits, pick, clip, getJson, getText, getBuf, normNum, calc, fmtUp, fmtNum, sleep, seedPct } from './util.js';

export const CATS = {
  general: '⚙️ General', ai: '🧠 AI', download: '📥 Download', media: '🖼️ Media',
  group: '👥 Group', tools: '🧰 Tools', fun: '🎉 Fun', owner: '👑 Owner'
};

export function createRegistry() {
  const map = new Map();
  const list = [];
  const reg = (d) => {
    d.aliases = d.aliases || [];
    d.perm = d.perm || 'all';
    list.push(d);
    map.set(d.name, d);
    d.aliases.forEach((a) => map.set(a, d));
  };
  return { map, list, reg };
}

const TZ = {
  colombo: 'Asia/Colombo', srilanka: 'Asia/Colombo', sl: 'Asia/Colombo', london: 'Europe/London', uk: 'Europe/London', dubai: 'Asia/Dubai',
  tokyo: 'Asia/Tokyo', japan: 'Asia/Tokyo', newyork: 'America/New_York', ny: 'America/New_York', usa: 'America/New_York', la: 'America/Los_Angeles',
  delhi: 'Asia/Kolkata', india: 'Asia/Kolkata', singapore: 'Asia/Singapore', sydney: 'Australia/Sydney', paris: 'Europe/Paris', berlin: 'Europe/Berlin',
  doha: 'Asia/Qatar', qatar: 'Asia/Qatar', riyadh: 'Asia/Riyadh', kuwait: 'Asia/Kuwait', italy: 'Europe/Rome', rome: 'Europe/Rome', toronto: 'America/Toronto',
  malaysia: 'Asia/Kuala_Lumpur', kl: 'Asia/Kuala_Lumpur', korea: 'Asia/Seoul', seoul: 'Asia/Seoul', moscow: 'Europe/Moscow'
};

const BALL = ['ඔව් 100%! ✅', 'නෑ බබා ❌', 'සමහරවිට 🤔', 'හොඳට හිතල ආයෙ අහන්න 🔮', 'නිසැකවම! 🔥', 'මම හිතන්නෙ නෑ 😕', 'ඒක ඉතින් ඔයාට බලාගන්න වෙනවා 😜', 'සල්ලි ගාණක් එනවා 💰 (විහිළුවක්)'];
const TRUTH = ['ඔයාගෙ පළවෙනි crush කවුද?', 'අන්තිමට බොරුවක් කිව්වෙ කාටද?', 'ඔයාගෙ ලොකුම බය මොකක්ද?', 'phone එකේ තියෙන ලැජ්ජම photo එක මොකක්ද?', 'කවදාහරි කාට හරි රහසක් කියල තියෙනවද?', 'ජීවිතේ ලැජ්ජාම මොහොත මොකක්ද?', 'ඔයා හොර රහසේ කැමති සින්දුව මොකක්ද?'];
const DARE = ['ඔයාගෙ ලස්සනම selfie එක group එකට දාන්න 📸', 'ඊළඟ මැසේජ් 3 emoji වලින් විතරක් යවන්න', 'ඔයාගෙ crush ට "hi" කියන්න 😏', 'විනාඩියක් සිංදුවක් කියන්න voice note එකකින් 🎤', 'ඔයාගෙ ෆෝන් එකේ 5 වෙනි photo එක දාන්න', 'ඔයාගෙ status එකේ "I love Nethu" කියල දාන්න 😂'];
const REACT_ACTION = {
  hug: ['🤗', 'hugs'], slap: ['👋', 'slaps'], kiss: ['😘', 'kisses'], pat: ['🥰', 'pats'], punch: ['👊', 'punches'], cuddle: ['🫂', 'cuddles']
};

const nameOf = (jid) => '@' + String(jid).split('@')[0].split(':')[0];

export function registerCommands(reg, K) {
  const a = (name, aliases, cat, desc, opt, run) => reg({ name, aliases, cat, desc, ...opt, run });

  // =============== GENERAL ===============
  a('menu', ['help', 'cmds', 'commands', 'list', 'මෙනු'], 'general', 'සියලුම commands', { fast: true }, async (c) => {
    const cats = Object.keys(CATS);
    const want = (c.args || '').toLowerCase().trim();
    const p = c.p;
    const visible = K.registry.list.filter((d) => d.name !== 'menu');
    if (want && CATS[want]) {
      const items = visible.filter((d) => d.cat === want);
      return c.reply(`*${CATS[want]}* (${items.length})\n\n` + items.map((d) => `• *${p}${d.name}*${d.usage ? ' ' + d.usage : ''}\n   ${d.desc}`).join('\n'));
    }
    let t = `╭───〔 🤖 *${c.S.botName}* 〕───\n│ 👋 Hi ${nameOf(c.rawSender)}!\n│ 🔰 Prefix: *${p}*   📦 Commands: *${visible.length}*\n│ ⏱️ Uptime: ${fmtUp(Date.now() - K.started)}\n╰──────────────\n`;
    for (const k of cats) {
      const items = visible.filter((d) => d.cat === k);
      if (!items.length) continue;
      t += `\n╭─〔 ${CATS[k]} 〕\n` + items.map((d) => `│ ${p}${d.name}`).join('\n') + '\n╰──────────\n';
    }
    t += `\n💡 *${p}menu <category>* → විස්තර සහිතව (${cats.join(', ')})\n💬 "${c.S.botName}" කියලා සාමාන්‍ය විදිහට කතා කරන්නත් පුළුවන් — මම තේරුම් ගන්නවා 🥰\n\n© MR HESHAN MD TECH WEB`;
    await c.send({ text: t, mentions: [c.rawSender] }, { quoted: c.m });
  });

  a('ping', ['speed', 'p'], 'general', 'Bot speed', { fast: true }, async (c) => {
    const t0 = Date.now();
    const r = await c.reply('🏓 Pinging...');
    await c.send({ text: `🏓 Pong! *${Date.now() - t0}ms*`, edit: r?.key }).catch(() => c.reply(`🏓 Pong! ${Date.now() - t0}ms`));
  });

  a('alive', ['bot', 'online'], 'general', 'Bot online ද බලන්න', { fast: true }, async (c) => {
    await c.reply(`✅ *${c.S.botName}* online!\n⏱️ Uptime: ${fmtUp(Date.now() - K.started)}\n🤖 AI: ${String(c.S.provider).toUpperCase()}\n📦 Commands: ${K.registry.list.length}\n🔰 Prefix: ${c.p}`);
  });

  a('runtime', ['uptime'], 'general', 'Bot ඇවිල්ලා කොච්චර වෙලාද', { fast: true }, (c) => c.reply(`⏱️ Uptime: *${fmtUp(Date.now() - K.started)}*`));

  a('botinfo', ['info', 'stats'], 'general', 'Bot විස්තර', {}, async (c) => {
    const mem = process.memoryUsage();
    const open = Object.values(K.slots).filter((s) => s.status === 'open').length;
    await c.reply(`🤖 *${c.S.botName}*\n• Devices online: ${open}/${Object.keys(K.slots).length}\n• Commands: ${K.registry.list.length}\n• AI: ${c.S.provider}\n• RAM: ${(mem.rss / 1048576).toFixed(0)} MB\n• Node: ${process.version}\n• Uptime: ${fmtUp(Date.now() - K.started)}\n\n© MR HESHAN MD TECH WEB`);
  });

  a('owner', ['creator', 'dev', 'developer'], 'general', 'Owner / creator contact', { fast: true }, async (c) => {
    const num = '94719845166';
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Dinidu Heshan\nORG:MR HESHAN MD TECH WEB\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`;
    await c.send({ contacts: { displayName: 'Dinidu Heshan', contacts: [{ vcard }] } }, { quoted: c.m });
  });

  a('photo', ['creatorpic', 'creatorphoto', 'send_photo'], 'general', 'Creator ගේ photo එක', { fast: true }, async (c) => {
    await K.sendCreatorPhoto(c.sock, c.jid, c.say || 'මේ ඉන්නේ මාව හදපු මගේ අයියා (දිනිදු හේෂාන්) 🥰❤️', c.m);
  });

  a('jid', ['lid', 'get_jid', 'getjid'], 'general', 'Chat/User JID & LID', { fast: true }, async (c) => {
    const target = c.qParticipant || c.rawSender;
    let t = `🆔 *JID / LID Details*\n\n• *Chat JID:* \`${c.jid}\`\n• *User:* \`${target}\``;
    if (c.m.key.participantAlt) t += `\n• *User (alt):* \`${c.m.key.participantAlt}\``;
    if (c.m.key.remoteJidAlt) t += `\n• *Chat (alt):* \`${c.m.key.remoteJidAlt}\``;
    await c.reply(t);
  });

  a('whoami', ['me', 'myinfo'], 'general', 'ඔයාගෙ info', {}, async (c) => {
    const mem = await K.memGet(c.sender);
    const facts = Object.entries(mem.facts || {}).map(([k, v]) => `• ${k}: ${v}`).join('\n') || '—';
    await c.reply(`👤 *+${c.sender}*\n🔰 Role: ${c.isOwner ? 'Owner/Sudo 👑' : 'User'}\n\n🧠 මම මතක තියාගෙන ඉන්නේ:\n${facts}`);
  });

  a('forget', ['clearmemory'], 'general', 'මගේ memory මකන්න', {}, async (c) => {
    await K.memCol.deleteOne({ _id: c.sender });
    await c.reply('🗑️ ඔයා ගැන මතක ඔක්කොම මැකුවා!');
  });

  // =============== AI ===============
  const aiCmd = (name, aliases, desc, usage, build, extra = {}) =>
    a(name, aliases, 'ai', desc, { usage, ack: true, ...extra }, async (c) => {
      const input = c.args || c.qText;
      if (!input && !extra.noInput) return c.reply(`✍️ ${usage || 'text එකක් දෙන්න'}\nඋදා: ${c.p}${name} ${extra.example || '...'}`);
      const out = await K.ai.text(build(input, c));
      await c.reply(out);
    });

  aiCmd('ai', ['ask', 'gpt', 'chatgpt', 'chat', 'ප්‍රශ්නය'], 'AI එකෙන් ඕනම දෙයක් අහන්න', '<ප්‍රශ්නය>', (i) => i, { example: 'ශ්‍රී ලංකාවේ අගනුවර මොකක්ද?' });
  aiCmd('translate', ['tr', 'පරිවර්තනය'], 'පරිවර්තනය (tr si hello)', '<භාෂාව> <text>', (i) => {
    const m = i.match(/^(\S+)\s+([\s\S]+)$/);
    const lang = m && m[1].length <= 12 ? m[1] : 'Sinhala';
    const text = m && m[1].length <= 12 ? m[2] : i;
    return `Translate the following text to ${lang}. Output ONLY the translation, nothing else:\n${text}`;
  }, { example: 'si How are you?' });
  aiCmd('summarize', ['sum', 'summary', 'සාරාංශ'], 'Text එකක් සාරාංශ කරන්න (reply කරලත් පුළුවන්)', '<text | reply>', (i) => `Summarize this in a few short bullet points in the same language:\n${i}`);
  aiCmd('explain', ['eli5', 'පැහැදිලි'], 'සරලව පැහැදිලි කරන්න', '<දෙයක්>', (i) => `Explain this simply, like I am 12:\n${i}`, { example: 'black holes' });
  aiCmd('rewrite', ['fix', 'grammar', 'improve'], 'Text එක හොඳට ලියන්න / grammar fix', '<text | reply>', (i) => `Rewrite this text with perfect grammar and a natural tone. Output ONLY the improved text:\n${i}`);
  aiCmd('story', ['කතාව'], 'කෙටි කතාවක්', '<මාතෘකාව>', (i) => `Write a short, engaging story (max 150 words) about: ${i}. Use the language of the topic.`, { example: 'බල්ලෙක් සහ පූසෙක්' });
  aiCmd('poem', ['කවිය', 'kavi'], 'කවියක්', '<මාතෘකාව>', (i) => `Write a short poem about: ${i}. Use the language of the topic.`, { example: 'අම්මා' });
  aiCmd('caption', ['cap'], 'Photo caption ideas', '<මාතෘකාව>', (i) => `Give 5 catchy social media captions (with emojis) for: ${i}`);
  aiCmd('code', ['coding'], 'Code ලියන්න / පැහැදිලි කරන්න', '<ඉල්ලීම>', (i) => `${i}\n(Give short, correct code in a code block and 2-line explanation.)`, { example: 'python hello world' });
  aiCmd('email', ['letter'], 'Email / ලිපියක් ලියන්න', '<විස්තරය>', (i) => `Write a short, polite, professional email/letter for: ${i}`);
  aiCmd('quote', ['motivate', 'motivation'], 'Motivational quote', '', () => 'Give one powerful motivational quote with a one-line meaning. Mix Sinhala and English.', { noInput: true });
  aiCmd('joke', ['jokes', 'විහිළුව'], 'විහිළුවක්', '', () => 'Tell one short clean funny joke in Sinhala (Singlish ok). Add an emoji.', { noInput: true });
  aiCmd('fact', ['facts', 'funfact'], 'Random fact', '', () => 'Tell one surprising random fact in Sinhala with an emoji.', { noInput: true });
  aiCmd('riddle', ['prahelika'], 'ප්‍රහේලිකාවක්', '', () => 'Give one fun riddle in Sinhala. Put the answer at the end after "Answer:" hidden-style (just write it after 5 blank lines).', { noInput: true });
  aiCmd('pickup', ['pickupline'], 'Pickup line 😏', '', () => 'Give one cute, harmless romantic pickup line in Singlish.', { noInput: true });
  aiCmd('compliment', ['praise'], 'Compliment එකක්', '<නම>', (i) => `Give a sweet, genuine compliment to ${i || 'someone special'} in Sinhala/Singlish.`, { noInput: true });
  aiCmd('advice', ['upades'], 'උපදෙසක්', '<ප්‍රශ්නය>', (i) => `Give short, practical, caring advice for: ${i}`, { example: 'exam එකට බයයි' });

  a('imagine', ['img', 'draw', 'aiimage'], 'ai', 'AI රූපයක් හදන්න', { usage: '<විස්තරය (English හොඳයි)>', ack: true }, async (c) => {
    if (!c.args) return c.reply(`🎨 විස්තරයක් දෙන්න. උදා: ${c.p}imagine a cute cat in space`);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(c.args)}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
    const { buf, type } = await getBuf(url, 90000, 15);
    if (!/image/.test(type)) throw new Error('රූපය හදන්න බැරි උනා, ආයෙ try කරන්න');
    await c.send({ image: buf, caption: `🎨 ${clip(c.args, 150)}` }, { quoted: c.m });
  });

  a('tts', ['say', 'voice', 'කියවන්න'], 'ai', 'Text -> Voice note', { usage: '[si|en|ta|hi...] <text>', ack: true }, async (c) => {
    let lang = 'si';
    let text = c.args || c.qText;
    const m = text.match(/^([a-z]{2}(?:-[A-Za-z]{2})?)\s+([\s\S]+)$/);
    if (m) { lang = m[1]; text = m[2]; }
    if (!text) return c.reply(`🔊 text එකක් දෙන්න. උදා: ${c.p}tts si ආයුබෝවන්`);
    const { buf } = await getBuf(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text.slice(0, 190))}`, 30000, 10);
    await c.send({ audio: buf, mimetype: 'audio/mpeg', ptt: true }, { quoted: c.m });
  });

  // =============== DOWNLOAD ===============
  const needArg = (c, what, ex) => c.reply(`${what}\nඋදා: ${c.p}${c.cmd.name} ${ex}`);

  a('song', ['play', 'ytmp3', 'yta', 'mp3', 'audio', 'sindu'], 'download', 'YouTube සින්දුව (නම / link)', { usage: '<නම | link>', ack: true }, async (c) => {
    if (!c.args) return needArg(c, '🎶 සින්දුවේ නම දෙන්න.', 'ma diha');
    const link = c.args.match(/https?:\/\/\S+/)?.[0];
    if (link) {
      const d = await K.callApi('/youtube/mp3', { url: link, quality: '320kbps' });
      return void (await K.sendBuf(c.sock, c.jid, d.buf, 'audio', '', c.m));
    }
    const s = await K.getSong(c.args);
    const v = s.v;
    await c.send({ image: { url: v.thumbnail || v.image }, caption: `🎶 *${v.title}*\n👤 ${v.author?.name || '-'}\n⏱️ ${v.timestamp || '-'}   👁️ ${fmtNum(v.views)}` }, { quoted: c.m }).catch(() => c.reply(`🎶 ${v.title}`));
    await K.sendBuf(c.sock, c.jid, s.buf, 'audio', '', c.m);
  });

  a('video', ['ytmp4', 'ytv', 'mp4', 'vid'], 'download', 'YouTube වීඩියෝ (නම / link)', { usage: '<නම | link>', ack: true }, async (c) => {
    if (!c.args) return needArg(c, '🎬 වීඩියෝවේ නම දෙන්න.', 'despacito');
    const link = c.args.match(/https?:\/\/\S+/)?.[0];
    if (link) {
      const d = await K.callApi('/youtube/download', { url: link, quality: '720p', format: 'mp4' });
      return void (await K.sendBuf(c.sock, c.jid, d.buf, 'video', '', c.m));
    }
    const s = await K.getVideo(c.args);
    await K.sendBuf(c.sock, c.jid, s.buf, 'video', s.v.title, c.m);
  });

  a('yts', ['ytsearch', 'youtube'], 'download', 'YouTube search', { usage: '<නම>' }, async (c) => {
    if (!c.args) return needArg(c, '🔎 මොකක්ද හොයන්නේ?', 'lofi music');
    const vs = (await K.yts(c.args)).videos.slice(0, 6);
    if (!vs.length) return c.reply('😕 මුකුත් හම්බුනේ නෑ.');
    await c.reply('🔎 *YouTube results*\n\n' + vs.map((v, i) => `${i + 1}. *${v.title}*\n   ⏱️ ${v.timestamp} • 👁️ ${fmtNum(v.views)}\n   ${v.url}`).join('\n\n') + `\n\n🎶 ${c.p}song <නම> | 🎬 ${c.p}video <නම>`);
  });

  const linkCmd = (name, aliases, rx, desc) =>
    a(name, aliases, 'download', desc, { usage: '<link>', ack: true }, async (c) => {
      const link = (c.args || c.qText).match(/https?:\/\/\S+/)?.[0];
      if (!link) return needArg(c, '🔗 link එක දෙන්න.', 'https://...');
      const r = K.routeLink(link, c.args);
      if (!r) throw new Error('මේ link එක support නෑ');
      const d = await K.callApi(r.path, r.params);
      await K.sendBuf(c.sock, c.jid, d.buf, r.kind, d.title, c.m);
    });
  linkCmd('tiktok', ['tt', 'tik'], /tiktok/, 'TikTok video (no watermark)');
  linkCmd('facebook', ['fb', 'fbdl'], /facebook|fb\.watch/, 'Facebook video');
  linkCmd('instagram', ['ig', 'igdl', 'reels'], /instagram/, 'Instagram reel/post');
  linkCmd('pinterest', ['pin', 'pindl'], /pinterest|pin\.it/, 'Pinterest image/video');
  linkCmd('spotify', ['sp', 'spdl'], /spotify/, 'Spotify song');
  linkCmd('download', ['dl', 'getmedia'], /./, 'ඕනම link එකක් (YT/TikTok/FB/IG/Pinterest/Spotify)');

  // =============== MEDIA ===============
  a('sticker', ['s', 'stiker', 'stik', 'ස්ටිකර්'], 'media', 'රූපයක් sticker කරන්න', { usage: '(image / reply)', fast: true }, async (c) => {
    if (!c.md || !['image', 'sticker'].includes(c.md.type)) return c.reply(`🖼️ රූපයක් එක්ක (හෝ රූපයකට reply කරලා) ${c.p}sticker කියන්න.\n(වීඩියෝ sticker දැනට support නෑ)`);
    const buf = await K.dl(c.sock, c.md);
    await c.send({ sticker: await K.toWebp(buf) }, { quoted: c.m });
  });

  a('toimg', ['toimage', 'stickertoimg'], 'media', 'Sticker -> රූපය', { usage: '(sticker reply)' }, async (c) => {
    if (c.md?.type !== 'sticker') return c.reply(`🖼️ sticker එකකට reply කරලා ${c.p}toimg කියන්න.`);
    const buf = await K.dl(c.sock, c.md);
    await c.send({ image: await K.toPng(buf), caption: '✅ Done' }, { quoted: c.m });
  });

  a('vv', ['viewonce', 'retrieve', 'ආයෙ'], 'media', 'ViewOnce / media ආයෙ එවන්න', { perm: 'owner', usage: '(reply)' }, async (c) => {
    if (!c.md) return c.reply('👀 ආයෙ බලන්න ඕන photo/video එකට reply කරලා කියන්න.');
    await K.sendMediaTo(c.sock, c.jid, c.md, c.say || '👀 මෙන්න ඒක ආයෙමත් 🥰', c.m);
  });

  a('save', ['savestatus', 'save_status'], 'media', 'Media/Status එක owner ගේ chat එකට save කරන්න', { perm: 'owner', usage: '(reply)' }, async (c) => {
    if (!c.md) return c.reply('📎 save කරන්න ඕන status/රූපයට reply කරන්න.');
    await K.sendMediaTo(c.sock, c.me, c.md, '💾 saved');
    await c.done('💾 Saved!');
  });

  a('dp', ['getdp', 'get_dp', 'pp', 'profile'], 'media', "කෙනෙකුගේ DP එක ගන්න", { usage: '<number | @tag | reply>' }, async (c) => {
    const t = await c.target(true);
    if (!t) return c.reply(`📞 අංකයක් දෙන්න / tag කරන්න / reply කරන්න.\nඋදා: ${c.p}dp 0771234567`);
    const url = await c.sock.profilePictureUrl(t, 'image').catch(() => null);
    if (!url) return c.reply('😕 dp එක ගන්න බැරි උනා (නැත්නම් hide කරලා).');
    await c.send({ image: { url }, caption: `${c.say || '🖼️ DP'} ${nameOf(t)}`, mentions: [t] }, { quoted: c.m });
  });

  a('bio', ['about', 'getbio'], 'media', 'කෙනෙකුගේ bio එක', { usage: '<number | @tag | reply>' }, async (c) => {
    const t = await c.target(true);
    if (!t) return c.reply(`📞 අංකයක් දෙන්න / tag කරන්න.`);
    const r = await c.sock.fetchStatus(t).catch(() => null);
    const st = Array.isArray(r) ? r[0]?.status?.status ?? r[0]?.status : r?.status?.status ?? r?.status;
    await c.reply(st ? `📝 ${nameOf(t)}\n${typeof st === 'string' ? st : JSON.stringify(st)}` : '😕 bio එක ගන්න බැරි උනා.');
  });

  a('setdp', ['setpp', 'set_dp', 'fulldp'], 'media', 'Bot ගේ DP එක වෙනස් කරන්න', { perm: 'owner', usage: '(image)' }, async (c) => {
    if (c.md?.type !== 'image') return c.reply('📸 රූපයක් එක්ක (හෝ රූපයකට reply කරලා) කියන්න.');
    await c.sock.updateProfilePicture(c.me, await K.dl(c.sock, c.md));
    await c.done('✅ DP එක වෙනස් කළා!');
  });

  a('setname', ['set_name', 'setwaname'], 'media', 'Bot ගේ WhatsApp නම වෙනස් කරන්න', { perm: 'owner', usage: '<නම>' }, async (c) => {
    if (!c.args) return needArg(c, '✍️ අලුත් නම දෙන්න.', 'Nethu AI');
    await c.sock.updateProfileName(c.args.slice(0, 25));
    await c.done('✅ නම වෙනස් කළා!');
  });

  a('setbio', ['set_bio', 'setabout'], 'media', 'Bot ගේ bio එක වෙනස් කරන්න', { perm: 'owner', usage: '<text>' }, async (c) => {
    if (!c.args) return needArg(c, '✍️ bio එක දෙන්න.', 'Nethu is online 💖');
    await c.sock.updateProfileStatus(c.args.slice(0, 139));
    await c.done('✅ bio එක වෙනස් කළා!');
  });

  a('poststatus', ['post_status', 'status', 'poststory'], 'media', 'WhatsApp status එකක් දාන්න', { perm: 'owner', usage: '<text | image/video>' }, async (c) => {
    const opts = { statusJidList: [...(K.contacts[c.id] || []), c.me], backgroundColor: '#315575', font: 3 };
    if (c.md && ['image', 'video'].includes(c.md.type)) {
      const buf = await K.dl(c.sock, c.md);
      await c.sock.sendMessage('status@broadcast', c.md.type === 'image' ? { image: buf, caption: c.args || '' } : { video: buf, caption: c.args || '' }, opts);
    } else {
      if (!c.args) return c.reply('✍️ status text එක දෙන්න, නැත්නම් රූපයක් එක්ක කියන්න.');
      await c.sock.sendMessage('status@broadcast', { text: c.args }, opts);
    }
    await c.done('✅ Status එක දැම්මා!');
  });

  a('qr', ['qrcode'], 'media', 'QR code හදන්න', { usage: '<text | link>' }, async (c) => {
    const t = c.args || c.qText;
    if (!t) return needArg(c, '🔳 text/link එකක් දෙන්න.', 'https://google.com');
    const { buf } = await getBuf(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(t)}`, 20000, 5);
    await c.send({ image: buf, caption: '🔳 QR Code' }, { quoted: c.m });
  });

  // =============== TOOLS ===============
  a('calc', ['math', 'calculate', 'ගණනය'], 'tools', 'ගණිත ගණනය', { usage: '<2+2*5>', fast: false }, async (c) => {
    if (!c.args) return needArg(c, '🧮 expression එකක් දෙන්න.', '(25*4)+sqrt(81)');
    try { await c.reply(`🧮 ${c.args}\n= *${calc(c.args)}*`); } catch { await c.reply('❌ expression එක වැරදියි. (+ - * / % ^ sqrt() sin() log() pi)'); }
  });

  a('weather', ['w', 'කාලගුණය'], 'tools', 'කාලගුණය', { usage: '<නගරය>' }, async (c) => {
    const city = c.args || 'Colombo';
    const j = await getJson(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, 20000);
    const cur = j.current_condition?.[0];
    if (!cur) throw new Error('නගරය හොයාගන්න බැරි උනා');
    const area = j.nearest_area?.[0];
    const today = j.weather?.[0];
    await c.reply(`🌤️ *${area?.areaName?.[0]?.value || city}, ${area?.country?.[0]?.value || ''}*\n\n🌡️ දැන්: *${cur.temp_C}°C* (feels ${cur.FeelsLikeC}°C)\n☁️ ${cur.weatherDesc?.[0]?.value}\n💧 Humidity: ${cur.humidity}%\n💨 Wind: ${cur.windspeedKmph} km/h\n📈 අද: ${today?.mintempC}° - ${today?.maxtempC}°C\n🌧️ වැස්ස chance: ${today?.hourly?.[4]?.chanceofrain ?? '-'}%`);
  });

  a('wiki', ['wikipedia', 'whatis'], 'tools', 'Wikipedia', { usage: '<මාතෘකාව>' }, async (c) => {
    if (!c.args) return needArg(c, '📚 මාතෘකාවක් දෙන්න.', 'Sri Lanka');
    const lang = /[\u0D80-\u0DFF]/.test(c.args) ? 'si' : 'en';
    const sum = async (t) => getJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`, 15000);
    let j;
    try { j = await sum(c.args); } catch {
      const s = await getJson(`https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(c.args)}&limit=1&format=json`, 15000);
      if (!s?.[1]?.[0]) return c.reply('😕 හම්බුනේ නෑ.');
      j = await sum(s[1][0]);
    }
    await c.reply(`📚 *${j.title}*\n\n${clip(j.extract || '-', 900)}\n\n🔗 ${j.content_urls?.desktop?.page || ''}`);
  });

  a('define', ['dict', 'meaning', 'dictionary'], 'tools', 'English word meaning', { usage: '<word>' }, async (c) => {
    if (!c.args) return needArg(c, '📖 වචනයක් දෙන්න.', 'serendipity');
    const j = await getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(c.args.split(' ')[0])}`, 15000).catch(() => null);
    const e = j?.[0];
    if (!e) return c.reply('😕 වචනය හම්බුනේ නෑ.');
    const defs = e.meanings.slice(0, 3).map((m) => `• _${m.partOfSpeech}_: ${m.definitions[0].definition}`).join('\n');
    await c.reply(`📖 *${e.word}* ${e.phonetic || ''}\n\n${defs}`);
  });

  a('time', ['date', 'වෙලාව', 'clock'], 'tools', 'වෙලාව / දිනය', { usage: '[නගරය]' }, async (c) => {
    const q = (c.args || 'colombo').toLowerCase().replace(/\s+/g, '');
    const tz = TZ[q] || (c.args.includes('/') ? c.args.trim() : 'Asia/Colombo');
    try {
      const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' }).format(new Date());
      await c.reply(`🕒 *${tz}*\n${f}`);
    } catch { await c.reply('❌ timezone එක වැරදියි. (උදා: colombo, london, dubai, Asia/Tokyo)'); }
  });

  a('currency', ['cur', 'convert', 'exchange'], 'tools', 'Currency convert', { usage: '<amount> <FROM> <TO>' }, async (c) => {
    const m = c.args.match(/^([\d.,]+)\s*([a-zA-Z]{3})\s*(?:to|->|=|\s)?\s*([a-zA-Z]{3})$/);
    if (!m) return c.reply(`💱 ${c.p}currency 100 usd lkr`);
    const [, amt, f, t] = m;
    const j = await getJson(`https://open.er-api.com/v6/latest/${f.toUpperCase()}`, 15000);
    const r = j?.rates?.[t.toUpperCase()];
    if (!r) return c.reply('😕 currency code වැරදියි.');
    const n = parseFloat(amt.replace(/,/g, ''));
    await c.reply(`💱 ${fmtNum(n)} ${f.toUpperCase()} = *${fmtNum((n * r).toFixed(2))} ${t.toUpperCase()}*\n(1 ${f.toUpperCase()} = ${r} ${t.toUpperCase()})`);
  });

  a('shorten', ['short', 'tinyurl'], 'tools', 'Link එක කෙටි කරන්න', { usage: '<link>' }, async (c) => {
    const l = (c.args || c.qText).match(/https?:\/\/\S+/)?.[0];
    if (!l) return needArg(c, '🔗 link එකක් දෙන්න.', 'https://...');
    await c.reply('🔗 ' + (await getText(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(l)}`, 15000)).trim());
  });

  a('password', ['pass', 'genpass'], 'tools', 'ශක්තිමත් password එකක්', { usage: '[length]' }, async (c) => {
    const n = Math.min(Math.max(parseInt(c.args) || 14, 6), 40);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
    const p = Array.from(crypto.randomBytes(n), (b) => chars[b % chars.length]).join('');
    await c.reply(`🔐 \`${p}\``);
  });

  a('base64', ['b64'], 'tools', 'Base64 encode/decode', { usage: 'enc|dec <text>' }, async (c) => {
    const m = c.args.match(/^(enc|encode|dec|decode)\s+([\s\S]+)$/i);
    if (!m) return c.reply(`🔐 ${c.p}base64 enc hello\n${c.p}base64 dec aGVsbG8=`);
    await c.reply(/^enc/i.test(m[1]) ? Buffer.from(m[2]).toString('base64') : Buffer.from(m[2], 'base64').toString('utf8'));
  });

  a('reverse', ['rev'], 'tools', 'Text ආපස්සට', { usage: '<text>' }, (c) => c.reply([...(c.args || c.qText || '')].reverse().join('') || '✍️ text එකක් දෙන්න'));
  a('upper', ['uppercase'], 'tools', 'UPPERCASE', { usage: '<text>' }, (c) => c.reply((c.args || c.qText || '').toUpperCase() || '✍️ text එකක් දෙන්න'));
  a('lower', ['lowercase'], 'tools', 'lowercase', { usage: '<text>' }, (c) => c.reply((c.args || c.qText || '').toLowerCase() || '✍️ text එකක් දෙන්න'));
  a('count', ['wordcount', 'len'], 'tools', 'අකුරු / වචන ගණන', { usage: '<text | reply>' }, (c) => {
    const t = c.args || c.qText || '';
    return c.reply(`🔢 අකුරු: *${[...t].length}*\n📝 වචන: *${t.trim() ? t.trim().split(/\s+/).length : 0}*`);
  });

  a('bmi', [], 'tools', 'BMI ගණනය', { usage: '<kg> <cm>' }, async (c) => {
    const [kg, cm] = c.argv.map(parseFloat);
    if (!kg || !cm) return c.reply(`⚖️ ${c.p}bmi 65 170`);
    const b = kg / ((cm / 100) ** 2);
    const s = b < 18.5 ? 'අඩු බර 🥲' : b < 25 ? 'සාමාන්‍යයි ✅' : b < 30 ? 'වැඩි බර ⚠️' : 'තරබාරුයි 🚨';
    await c.reply(`⚖️ BMI: *${b.toFixed(1)}* — ${s}`);
  });

  a('age', ['birthday'], 'tools', 'වයස ගණනය', { usage: 'YYYY-MM-DD' }, async (c) => {
    const d = new Date(c.args);
    if (isNaN(d)) return c.reply(`🎂 ${c.p}age 2005-03-15`);
    const n = new Date();
    let y = n.getFullYear() - d.getFullYear(), mo = n.getMonth() - d.getMonth(), da = n.getDate() - d.getDate();
    if (da < 0) { mo--; da += 30; }
    if (mo < 0) { y--; mo += 12; }
    const next = new Date(n.getFullYear(), d.getMonth(), d.getDate());
    if (next < n) next.setFullYear(n.getFullYear() + 1);
    await c.reply(`🎂 වයස: *${y}* අවුරුදු ${mo} මාස ${da} දින\n🎉 ඊළඟ birthday එකට: ${Math.ceil((next - n) / 864e5)} දින`);
  });

  a('random', ['rand', 'number'], 'tools', 'Random number', { usage: '[min] [max]' }, (c) => {
    let [mn, mx] = c.argv.map(Number);
    if (!isFinite(mn)) { mn = 1; mx = 100; } else if (!isFinite(mx)) { mx = mn; mn = 1; }
    return c.reply(`🎲 *${Math.floor(Math.random() * (mx - mn + 1)) + mn}*`);
  });

  // =============== FUN ===============
  a('dice', ['roll'], 'fun', 'දාදු කැටය', {}, (c) => c.reply(`🎲 *${1 + Math.floor(Math.random() * 6)}*`));
  a('flip', ['coin', 'toss'], 'fun', 'කාසිය උඩ දාන්න', {}, (c) => c.reply(Math.random() < 0.5 ? '🪙 *Head* (සිරස)' : '🪙 *Tail* (අංක)'));
  a('choose', ['pickone', 'select'], 'fun', 'එකක් තෝරන්න (a | b | c)', { usage: 'a | b | c' }, (c) => {
    const o = c.args.split(/[|,]/).map((x) => x.trim()).filter(Boolean);
    return o.length < 2 ? c.reply(`🤔 ${c.p}choose pizza | burger | rice`) : c.reply(`🎯 මම තෝරන්නේ: *${pick(o)}*`);
  });
  a('8ball', ['ball', 'eightball'], 'fun', 'Magic 8 ball', { usage: '<ප්‍රශ්නය>' }, (c) => c.reply(c.args ? `🎱 ${pick(BALL)}` : `🎱 ප්‍රශ්නයක් අහන්න. ${c.p}8ball මම පාස් වෙයිද?`));
  a('ship', ['love', 'match'], 'fun', 'Love % බලන්න', { usage: '@a @b | නම1 නම2' }, (c) => {
    const names = c.mentioned.length >= 2 ? c.mentioned.map(nameOf) : c.args.split(/[&|,+]| and | සහ /i).map((x) => x.trim()).filter(Boolean);
    if (names.length < 2) return c.reply(`💞 ${c.p}ship Kasun | Nimali`);
    const p = seedPct([names[0], names[1]].sort().join('&'));
    const bar = '█'.repeat(Math.round(p / 10)) + '░'.repeat(10 - Math.round(p / 10));
    return c.send({ text: `💞 *${names[0]}* ❤️ *${names[1]}*\n\n[${bar}] *${p}%*\n${p > 80 ? 'පට්ටම ගැලපෙනවා! 😍' : p > 50 ? 'හොඳයි, try කරන්න 🥰' : p > 25 ? 'ටිකක් අමාරුයි 😅' : 'අනේ නෑ බන් 💔'}`, mentions: c.mentioned }, { quoted: c.m });
  });
  a('rateme', ['rating', 'howcute', 'howlucky'], 'fun', 'ඔයාට ලකුණු දෙනවා', { usage: '[දෙයක්]' }, (c) => c.reply(`⭐ ${c.args || 'ඔයා'}: *${seedPct((c.args || c.sender) + new Date().toDateString())}/100*`));
  a('truth', ['tod'], 'fun', 'Truth question', {}, (c) => c.reply('🫣 *Truth:* ' + pick(TRUTH)));
  a('dare', [], 'fun', 'Dare challenge', {}, (c) => c.reply('😈 *Dare:* ' + pick(DARE)));
  for (const [k, [em, verb]] of Object.entries(REACT_ACTION)) {
    a(k, [], 'fun', `${k} කෙනෙක්ට ${em}`, { usage: '@tag' }, async (c) => {
      const t = await c.target(false);
      const to = t ? nameOf(t) : 'everyone';
      await c.send({ text: `${em} ${nameOf(c.rawSender)} ${verb} ${to}`, mentions: [c.rawSender, ...(t ? [t] : [])] }, { quoted: c.m });
    });
  }
  a('poll', ['vote'], 'fun', 'Poll එකක් හදන්න', { usage: 'ප්‍රශ්නය | option1 | option2' }, async (c) => {
    const p = c.args.split('|').map((x) => x.trim()).filter(Boolean);
    if (p.length < 3) return c.reply(`📊 ${c.p}poll කැමති දේ මොකක්ද? | Pizza | Burger | Rice`);
    await c.send({ poll: { name: p[0], values: p.slice(1, 13), selectableCount: 1 } });
  });

  // =============== GROUP ===============
  const G = { group: true };
  const needBotAdmin = async (c) => {
    if (await c.botIsAdmin()) return true;
    await c.reply('🤖 මේක කරන්න මාව *group admin* කරන්න ඕන.');
    return false;
  };

  a('tagall', ['everyone', 'all', 'මෙන්ෂන්'], 'group', 'සියලුම members tag කරන්න', { ...G, perm: 'admin', usage: '[message]' }, async (c) => {
    const gm = await c.meta();
    const msg = c.args || c.qText || c.say || '';
    await c.send({ text: `📢 ${msg}\n\n` + gm.participants.map((p) => '@' + p.id.split('@')[0]).join(' '), mentions: gm.participants.map((p) => p.id) }, { quoted: c.m });
  });

  a('hidetag', ['ht', 'notify'], 'group', 'Tag නොපෙන්වා සැවොම notify කරන්න', { ...G, perm: 'admin', usage: '<message>' }, async (c) => {
    const gm = await c.meta();
    await c.send({ text: c.args || c.qText || '📢', mentions: gm.participants.map((p) => p.id) });
  });

  a('admins', ['adminlist', 'listadmin'], 'group', 'Admin ලා ලැයිස්තුව', G, async (c) => {
    const gm = await c.meta();
    const ad = gm.participants.filter((p) => p.admin);
    await c.send({ text: `👑 *Admins (${ad.length})*\n\n` + ad.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n'), mentions: ad.map((p) => p.id) }, { quoted: c.m });
  });

  a('ginfo', ['groupinfo', 'gcinfo'], 'group', 'Group විස්තර', G, async (c) => {
    const gm = await c.meta();
    const cfg = await K.groupCfg(c.jid);
    await c.reply(
      `👥 *${gm.subject}*\n\n` +
      `🆔 ${gm.id}\n` +
      `👤 Members: ${gm.participants.length}\n` +
      `👑 Admins: ${gm.participants.filter((p) => p.admin).length}\n` +
      `🛡️ Anti-Link: *${cfg.antilink || 'off'}*\n` +
      `🤬 Anti-Bad: *${cfg.antibad || 'off'}*\n` +
      `🤖 Anti-Bot: *${cfg.antibot || 'off'}*\n` +
      `👋 Welcome: *${cfg.welcome || 'off'}*\n` +
      `📅 Created: ${gm.creation ? new Date(gm.creation * 1000).toLocaleDateString('en-GB') : '-'}\n` +
      `📝 ${clip(gm.desc || '—', 300)}`
    );
  });

  const part = (name, aliases, action, desc, ok) =>
    a(name, aliases, 'group', desc, { ...G, perm: 'admin', usage: '<@tag | number | reply>' }, async (c) => {
      if (!(await needBotAdmin(c))) return;
      const t = await c.target(false);
      if (!t) return c.reply(`📞 ${c.p}${name} @tag / number / reply`);
      const r = await c.sock.groupParticipantsUpdate(c.jid, [t], action);
      const st = r?.[0]?.status;
      if (st && String(st) !== '200') return c.reply(`⚠️ කරන්න බැරි උනා (status ${st}).`);
      await c.send({ text: `${ok} ${nameOf(t)}`, mentions: [t] }, { quoted: c.m });
    });
  part('kick', ['remove', 'ban_user', 'අයින්'], 'remove', 'Member කෙනෙක්ව අයින් කරන්න', '👢 Removed:');
  part('add', ['invite_user'], 'add', 'Member කෙනෙක් add කරන්න', '✅ Added:');
  part('promote', ['makeadmin'], 'promote', 'Admin කරන්න', '👑 Promoted:');
  part('demote', ['removeadmin'], 'demote', 'Admin අයින් කරන්න', '⬇️ Demoted:');

  a('mute', ['close', 'lock', 'announce'], 'group', 'Group එක close (admins විතරක් message)', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupSettingUpdate(c.jid, 'announcement');
    await c.reply('🔇 Group එක close කළා. දැන් admins ට විතරයි.');
  });
  a('unmute', ['open', 'unlock'], 'group', 'Group එක open', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupSettingUpdate(c.jid, 'not_announcement');
    await c.reply('🔊 Group එක open කළා.');
  });
  a('link', ['glink', 'invitelink', 'grouplink'], 'group', 'Group invite link', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.reply('🔗 https://chat.whatsapp.com/' + (await c.sock.groupInviteCode(c.jid)));
  });
  a('revoke', ['resetlink'], 'group', 'Invite link reset', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupRevokeInvite(c.jid);
    await c.reply('♻️ Link එක reset කළා. ' + c.p + 'link එකෙන් අලුත් එක ගන්න.');
  });
  a('setgname', ['setsubject', 'gname'], 'group', 'Group නම වෙනස් කරන්න', { ...G, perm: 'admin', usage: '<නම>' }, async (c) => {
    if (!c.args) return c.reply('✍️ අලුත් නම දෙන්න.');
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupUpdateSubject(c.jid, c.args.slice(0, 100));
    await c.reply('✅ නම වෙනස් කළා!');
  });
  a('setgdesc', ['setdesc', 'gdesc'], 'group', 'Group description', { ...G, perm: 'admin', usage: '<text>' }, async (c) => {
    if (!c.args) return c.reply('✍️ description එක දෙන්න.');
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupUpdateDescription(c.jid, c.args);
    await c.reply('✅ description එක වෙනස් කළා!');
  });
  a('del', ['delete', 'මකන්න'], 'group', 'Message එකක් delete කරන්න (reply)', { perm: 'admin', usage: '(reply)' }, async (c) => {
    const x = c.ctx;
    if (!x?.stanzaId) return c.reply('🗑️ delete කරන්න ඕන message එකට reply කරන්න.');
    await c.sock.sendMessage(c.jid, { delete: { remoteJid: c.jid, fromMe: c.qFromMe, id: x.stanzaId, participant: x.participant } });
  });

  // --- Anti-Link / Anti-BadWords / Anti-Bot / Welcome ---
  const toggleCfg = (name, aliases, field, vals, desc) =>
    a(name, aliases, 'group', desc, { ...G, perm: 'admin', usage: vals.join('|') }, async (c) => {
      const v = (c.argv[0] || '').toLowerCase();
      const cfg = await K.groupCfg(c.jid);
      if (!vals.includes(v)) return c.reply(`⚙️ *${name}:* ${cfg[field] || 'off'}\nභාවිතය: ${c.p}${name} ${vals.join(' | ')}`);
      if (v !== 'off' && !(await needBotAdmin(c))) return;
      cfg[field] = v;
      await K.saveGroupCfg(c.jid, cfg);
      await c.reply(`✅ *${name}* → *${v}*`);
    });

  toggleCfg('antilink', ['al'], 'antilink', ['off', 'delete', 'warn', 'kick'], 'Group links delete / 3-warn / kick කරන්න');
  toggleCfg('antibad', ['antibadwords', 'antitoxic', 'abw'], 'antibad', ['on', 'off'], 'අසභ්‍ය වචන delete කර 3 වෙනිදාට remove කරන්න');
  toggleCfg('antibot', ['ab'], 'antibot', ['on', 'off'], 'වෙනත් Bots ලා auto remove කරන්න');
  toggleCfg('welcome', [], 'welcome', ['on', 'off'], 'අලුත් members ට welcome / bye message');

  // --- Bad Words List Management ---
  a('addbad', ['addbadword'], 'group', 'Anti-Bad list එකට වචනයක් add කරන්න', { ...G, perm: 'admin', usage: '<වචනය>' }, async (c) => {
    const w = c.args.trim().toLowerCase();
    if (!w) return c.reply(`✍️ ${c.p}addbad <වචනය>`);
    const cfg = await K.groupCfg(c.jid);
    const list = Array.isArray(cfg.badwords) && cfg.badwords.length ? [...cfg.badwords] : [...(K.DEFAULT_BAD_WORDS || [])];
    if (!list.includes(w)) list.push(w);
    cfg.badwords = list;
    await K.saveGroupCfg(c.jid, cfg);
    await c.reply(`✅ "${w}" Anti-Bad list එකට add කළා. (මුළු වචන: ${list.length})`);
  });

  a('delbad', ['delbadword', 'removebad'], 'group', 'Anti-Bad list එකෙන් වචනයක් අයින් කරන්න', { ...G, perm: 'admin', usage: '<වචනය>' }, async (c) => {
    const w = c.args.trim().toLowerCase();
    if (!w) return c.reply(`✍️ ${c.p}delbad <වචනය>`);
    const cfg = await K.groupCfg(c.jid);
    const list = Array.isArray(cfg.badwords) && cfg.badwords.length ? [...cfg.badwords] : [...(K.DEFAULT_BAD_WORDS || [])];
    cfg.badwords = list.filter((x) => x.toLowerCase() !== w);
    await K.saveGroupCfg(c.jid, cfg);
    await c.reply(`✅ "${w}" Anti-Bad list එකෙන් අයින් කළා.`);
  });

  a('badwords', ['badlist'], 'group', 'Anti-Bad වචන ලැයිස්තුව බලන්න', { ...G, perm: 'admin' }, async (c) => {
    const cfg = await K.groupCfg(c.jid);
    const list = Array.isArray(cfg.badwords) && cfg.badwords.length ? cfg.badwords : (K.DEFAULT_BAD_WORDS || []);
    await c.reply(`🤬 *Anti-Bad Words (${list.length})*\n\n${list.join(', ')}\n\n➕ Add: ${c.p}addbad <වචනය>\n➖ Remove: ${c.p}delbad <වචනය>`);
  });

  // --- Manual Warns ---
  a('warn', [], 'group', 'Warn කරන්න (3 වෙනිදාට kick)', { ...G, perm: 'admin', usage: '@tag' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`⚠️ ${c.p}warn @tag`);
    const id = c.jid + '|' + digits(t);
    const r = await K.warns.findOneAndUpdate({ _id: id }, { $inc: { n: 1 } }, { upsert: true, returnDocument: 'after' });
    const n = r?.n ?? r?.value?.n ?? 1;
    await c.send({ text: `⚠️ ${nameOf(t)} warn ${n}/3`, mentions: [t] }, { quoted: c.m });
    if (n >= 3) {
      if (await c.botIsAdmin()) { await c.sock.groupParticipantsUpdate(c.jid, [t], 'remove').catch(() => {}); await K.warns.deleteOne({ _id: id }); await c.reply('👢 3 warns — remove කළා.'); }
      else await c.reply('🤖 kick කරන්න මාව admin කරන්න ඕන.');
    }
  });
  a('resetwarn', ['unwarn'], 'group', 'Warns අයින් කරන්න', { ...G, perm: 'admin', usage: '@tag' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`⚠️ ${c.p}resetwarn @tag`);
    const d = digits(t);
    await K.warns.deleteMany({ _id: { $in: [`${c.jid}|${d}`, `${c.jid}|bad|${d}`, `${c.jid}|link|${d}`] } });
    await c.reply('✅ සියලුම Warns (Manual / BadWords / AntiLink) අයින් කළා.');
  });
  a('warns', ['checkwarn'], 'group', 'Warns බලන්න', { ...G, usage: '[@tag]' }, async (c) => {
    const t = (await c.target(false)) || c.rawSender;
    const d = digits(t);
    const [mW, bW, lW] = await Promise.all([
      K.warns.findOne({ _id: `${c.jid}|${d}` }),
      K.warns.findOne({ _id: `${c.jid}|bad|${d}` }),
      K.warns.findOne({ _id: `${c.jid}|link|${d}` })
    ]);
    await c.send({
      text: `⚠️ *Warnings for ${nameOf(t)}*\n• Manual: *${mW?.n || 0}/3*\n• Bad Words: *${bW?.n || 0}/3*\n• Anti-Link: *${lW?.n || 0}/3*`,
      mentions: [t]
    }, { quoted: c.m });
  });

  // =============== OWNER ===============
  const O = { perm: 'owner' };
  a('addsudo', ['setsudo', 'set_sudo', 'sudo'], 'owner', 'Sudo user කෙනෙක් add කරන්න', { ...O, usage: '<number | @tag>' }, async (c) => {
    let n = '';
    const t = c.mentioned[0] || c.qParticipant;
    const m = c.args.match(/\+?\d[\d\s-]{7,15}\d/);
    if (m) n = normNum(m[0]);
    else if (t) n = digits(t.split('@')[0]);
    if (!n || n.length < 9) return c.reply(`📞 නිවැරදි අංකයක් දෙන්න.\nඋදා: ${c.p}addsudo 0771234567`);
    if (!K.sudoList().includes(n)) { c.S.sudo = c.S.sudo ? `${c.S.sudo},${n}` : n; await c.saveSettings(); }
    await c.reply(`✅ හරි බබා! *+${n}* Sudo list එකට add කළා. දැන් එයාටත් මාව control කරන්න පුළුවන් 🥰`);
  });
  a('delsudo', ['removesudo'], 'owner', 'Sudo අයින් කරන්න', { ...O, usage: '<number>' }, async (c) => {
    const m = c.args.match(/\+?\d[\d\s-]{7,15}\d/);
    const n = m ? normNum(m[0]) : digits((c.mentioned[0] || c.qParticipant || '').split('@')[0]);
    if (!n) return c.reply(`📞 ${c.p}delsudo 0771234567`);
    c.S.sudo = String(c.S.sudo).split(',').map((x) => x.trim()).filter((x) => x && digits(x) !== n).join(',');
    await c.saveSettings();
    await c.reply(`✅ +${n} Sudo list එකෙන් අයින් කළා.`);
  });
  a('sudolist', ['sudos'], 'owner', 'Sudo ලැයිස්තුව', O, (c) => c.reply('👑 *Owner/Sudo*\n' + (K.sudoList().map((x) => '• +' + x).join('\n') || '—')));

  a('block', [], 'owner', 'Block කරන්න', { ...O, usage: '<@tag | number | reply>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}block 0771234567`);
    await c.sock.updateBlockStatus(t, 'block');
    await c.reply('🚫 Blocked ' + nameOf(t));
  });
  a('unblock', [], 'owner', 'Unblock කරන්න', { ...O, usage: '<number>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}unblock 0771234567`);
    await c.sock.updateBlockStatus(t, 'unblock');
    await c.reply('✅ Unblocked ' + nameOf(t));
  });
  a('ban', ['banuser'], 'owner', 'Bot භාවිතයෙන් user කෙනෙක්ව ban කරන්න', { ...O, usage: '<number | @tag>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}ban 0771234567`);
    const n = digits(t.split('@')[0]);
    const list = String(c.S.banned || '').split(',').filter(Boolean);
    if (!list.includes(n)) list.push(n);
    c.S.banned = list.join(',');
    await c.saveSettings();
    await c.reply(`⛔ +${n} ban කළා.`);
  });
  a('unban', ['unbanuser'], 'owner', 'Ban අයින් කරන්න', { ...O, usage: '<number | @tag>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}unban 0771234567`);
    const n = digits(t.split('@')[0]);
    c.S.banned = String(c.S.banned || '').split(',').filter((x) => x && x !== n).join(',');
    await c.saveSettings();
    await c.reply(`✅ +${n} unban කළා.`);
  });

  a('setprefix', ['prefix'], 'owner', 'Command prefix වෙනස් කරන්න', { ...O, usage: '<.>' }, async (c) => {
    if (!c.args) return c.reply(`🔰 දැන් prefix: *${c.S.prefix}*\nවෙනස් කරන්න: ${c.p}setprefix !`);
    c.S.prefix = c.args.replace(/\s+/g, '').slice(0, 10);
    await c.saveSettings();
    await c.reply(`✅ Prefix → *${c.S.prefix}*`);
  });
  a('mode', [], 'owner', 'public / private mode', { ...O, usage: 'public|private' }, async (c) => {
    const v = (c.argv[0] || '').toLowerCase();
    if (!['public', 'private'].includes(v)) return c.reply(`🔒 දැන්: *${c.S.mode}*\n${c.p}mode public | private`);
    c.S.mode = v;
    await c.saveSettings();
    await c.reply(`✅ Mode → *${v}* ${v === 'private' ? '(owner/sudo ට විතරයි)' : ''}`);
  });

  const SETKEYS = {
    statusseen: ['statusSeen', 'Status auto seen'], statusreact: ['statusReact', 'Status auto react'], statussave: ['statusSave', 'Status auto save'],
    autoread: ['autoRead', 'Auto read'], autotyping: ['autoTyping', 'Typing'], alwaysonline: ['alwaysOnline', 'Always online'],
    anticall: ['antiCall', 'Anti call'], dmalways: ['dmAlways', 'DM එකේ නමක් නැතුවත් reply'], replytobot: ['replyToBot', 'Bot ගේ message එකට reply කළාම respond']
  };
  a('set', ['settings', 'toggle', 'config'], 'owner', 'Settings on/off (.set autoread on)', { ...O, usage: '<key> on|off' }, async (c) => {
    const k = (c.argv[0] || '').toLowerCase();
    const v = (c.argv[1] || '').toLowerCase();
    if (!SETKEYS[k] || !['on', 'off'].includes(v)) {
      return c.reply('⚙️ *Settings*\n\n' + Object.entries(SETKEYS).map(([n, [f, d]]) => `• *${n}* — ${d}: ${c.S[f] === '1' ? '✅ on' : '❌ off'}`).join('\n') + `\n\nභාවිතය: ${c.p}set autoread on`);
    }
    c.S[SETKEYS[k][0]] = v === 'on' ? '1' : '0';
    await c.saveSettings();
    await c.reply(`✅ ${SETKEYS[k][1]} → *${v}*`);
  });
  a('setbotname', ['botname'], 'owner', 'Bot ගේ නම', { ...O, usage: '<නම>' }, async (c) => {
    if (!c.args) return c.reply(`🤖 දැන්: *${c.S.botName}*`);
    c.S.botName = c.args.slice(0, 30);
    await c.saveSettings();
    await c.reply(`✅ Bot name → *${c.S.botName}*`);
  });
  a('addname', ['addtrigger'], 'owner', 'Bot කතා කරන නමක් add කරන්න', { ...O, usage: '<නම>' }, async (c) => {
    const n = c.args.trim().toLowerCase();
    if (!n) return c.reply(`✍️ ${c.p}addname manika`);
    const list = c.S.names.split(',').map((x) => x.trim()).filter(Boolean);
    if (!list.map((x) => x.toLowerCase()).includes(n)) list.push(n);
    c.S.names = list.join(',');
    await c.saveSettings();
    await c.reply(`✅ "${n}" නම add කළා. දැන් නම් ${list.length}ක්.`);
  });
  a('delname', ['removename'], 'owner', 'Bot ගේ නමක් අයින් කරන්න', { ...O, usage: '<නම>' }, async (c) => {
    const n = c.args.trim().toLowerCase();
    c.S.names = c.S.names.split(',').map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== n).join(',');
    await c.saveSettings();
    await c.reply(`✅ "${n}" අයින් කළා.`);
  });
  a('names', ['triggers'], 'owner', 'Bot ට කතා කරන්න පුළුවන් නම්', O, (c) => c.reply('📛 ' + c.S.names.split(',').join(', ')));

  a('groups', ['gclist', 'mygroups'], 'owner', 'Bot ඉන්න groups', O, async (c) => {
    const g = Object.values(await c.sock.groupFetchAllParticipating());
    await c.reply(`👥 *Groups (${g.length})*\n\n` + g.slice(0, 40).map((x, i) => `${i + 1}. ${x.subject} (${x.participants.length})`).join('\n'));
  });
  a('broadcast', ['bc', 'bcgc'], 'owner', 'සියලුම groups වලට message එකක්', { ...O, usage: '<message>', ack: true }, async (c) => {
    const text = c.args || c.qText;
    if (!text) return c.reply(`📣 ${c.p}broadcast <message>`);
    const g = Object.keys(await c.sock.groupFetchAllParticipating());
    let ok = 0;
    for (const id of g) {
      try { await c.sock.sendMessage(id, { text: `📣 *Broadcast*\n\n${text}` }); ok++; } catch {}
      await sleep(2500);
    }
    await c.reply(`✅ groups ${ok}/${g.length} කට යැව්වා.`);
  });
  a('join', ['joingroup'], 'owner', 'Group invite link එකකට join වෙන්න', { ...O, usage: '<link>' }, async (c) => {
    const code = c.args.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)?.[1];
    if (!code) return c.reply(`🔗 ${c.p}join https://chat.whatsapp.com/xxxx`);
    await c.sock.groupAcceptInvite(code);
    await c.reply('✅ Join වුනා!');
  });
  a('leave', ['leavegroup'], 'owner', 'Group එකෙන් bot එළියට', { ...O, group: true }, async (c) => {
    await c.reply('👋 bye bye!');
    await c.sock.groupLeave(c.jid);
  });
  a('restart', ['reboot'], 'owner', 'Bot restart', O, async (c) => {
    await c.reply('♻️ Restart වෙනවා... (තත්පර 10-20කින් එනවා)');
    setTimeout(() => process.exit(0), 1000);
  });
}
