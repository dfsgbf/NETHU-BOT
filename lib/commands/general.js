import { fmtUp } from '../util.js';
import { CATS } from '../cmds.js';

const nameOf = (jid) => '@' + String(jid).split('@')[0].split(':')[0];

export default function (reg, K) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'general', desc, ...opt, run });

  a('menu', ['help', 'cmds', 'commands', 'list', 'මෙනු'], 'සියලුම commands', { fast: true }, async (c) => {
    const cats = Object.keys(CATS);
    const want = (c.args || '').toLowerCase().trim();
    const p = c.p;
    const visible = K.registry.list.filter((d) => d.name !== 'menu');
    if (want && CATS[want]) {
      const items = visible.filter((d) => d.cat === want);
      return c.reply(`*${CATS[want]}* (${items.length})\n\n` + items.map((d) => `• *${p}${d.name}*${d.usage ? ' ' + d.usage : ''}\n   ${d.desc}`).join('\n'));
    }
    let t = `╭───〔 🤖 *${c.S.botName} V3* 〕───\n│ 👋 Hi ${nameOf(c.rawSender)}!\n│ 🔰 Prefix: *${p}*   📦 Commands: *${visible.length}*\n│ ⏱️ Uptime: ${fmtUp(Date.now() - K.started)}\n╰──────────────\n`;
    for (const k of cats) {
      const items = visible.filter((d) => d.cat === k);
      if (!items.length) continue;
      t += `\n╭─〔 ${CATS[k]} 〕\n` + items.map((d) => `│ ${p}${d.name}`).join('\n') + '\n╰──────────\n';
    }
    t += `\n💡 *${p}menu <category>* → විස්තර සහිතව (${cats.join(', ')})\n💬 "${c.S.botName}" කියලා කතා කළොත් AI එකෙන් සියලුම commands පාලනය වෙනවා 🥰\n\n© MR HESHAN MD TECH WEB`;
    await c.send({ text: t, mentions: [c.rawSender] }, { quoted: c.m });
  });

  a('ping', ['speed', 'p'], 'Bot speed', { fast: true }, async (c) => {
    const t0 = Date.now();
    const r = await c.reply('🏓 Pinging...');
    await c.send({ text: `🏓 Pong! *${Date.now() - t0}ms*`, edit: r?.key }).catch(() => c.reply(`🏓 Pong! ${Date.now() - t0}ms`));
  });

  a('alive', ['bot', 'online'], 'Bot online ද බලන්න', { fast: true }, async (c) => {
    await c.reply(`✅ *${c.S.botName} V3 PRO* online!\n⏱️ Uptime: ${fmtUp(Date.now() - K.started)}\n🤖 AI: ${String(c.S.provider).toUpperCase()}\n📦 Commands: ${K.registry.list.length}\n🛡️ Anti-Ban: ${c.S.antiBan === '1' ? 'Active' : 'Off'}\n🔰 Prefix: ${c.p}`);
  });

  a('runtime', ['uptime'], 'Bot ඇවිල්ලා කොච්චර වෙලාද', { fast: true }, (c) => c.reply(`⏱️ Uptime: *${fmtUp(Date.now() - K.started)}*`));

  a('botinfo', ['info', 'stats'], 'Bot විස්තර', {}, async (c) => {
    const mem = process.memoryUsage();
    const open = Object.values(K.slots).filter((s) => s.status === 'open').length;
    await c.reply(`🤖 *${c.S.botName} V3 PRO*\n• Devices online: ${open}/${Object.keys(K.slots).length}\n• Commands: ${K.registry.list.length}\n• AI: ${c.S.provider}\n• RAM: ${(mem.rss / 1048576).toFixed(0)} MB\n• Node: ${process.version}\n• Uptime: ${fmtUp(Date.now() - K.started)}\n\n© MR HESHAN MD TECH WEB`);
  });

  a('owner', ['creator', 'dev', 'developer'], 'Developer / Owner contact', { fast: true }, async (c) => {
    const num = '94719845166';
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Dinidu Heshan (HESHAN OFC)\nORG:MR HESHAN MD TECH WEB\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`;
    await c.send({ contacts: { displayName: 'Dinidu Heshan', contacts: [{ vcard }] } }, { quoted: c.m });
  });

  a('photo', ['creatorpic', 'creatorphoto', 'send_photo'], 'Creator ගේ photo එක', { fast: true }, async (c) => {
    await K.sendCreatorPhoto(c.sock, c.jid, c.say || 'මේ ඉන්නේ මාව හදපු මගේ අයියා (දිනිදු හේෂාන්) 🥰❤️', c.m);
  });

  a('jid', ['lid', 'get_jid', 'getjid'], 'Chat/User JID & LID', { fast: true }, async (c) => {
    const target = c.qParticipant || c.rawSender;
    let t = `🆔 *JID / LID Details*\n\n• *Chat JID:* \`${c.jid}\`\n• *User:* \`${target}\``;
    if (c.m.key.participantAlt) t += `\n• *User (alt):* \`${c.m.key.participantAlt}\``;
    if (c.m.key.remoteJidAlt) t += `\n• *Chat (alt):* \`${c.m.key.remoteJidAlt}\``;
    await c.reply(t);
  });

  a('whoami', ['me', 'myinfo'], 'ඔයාගෙ info', {}, async (c) => {
    const mem = await K.memGet(c.sender);
    const facts = Object.entries(mem.facts || {}).map(([k, v]) => `• ${k}: ${v}`).join('\n') || '—';
    await c.reply(`👤 *+${c.sender}*\n🔰 Role: ${c.isDev ? 'Developer 👑' : c.isOwner ? 'Owner/Sudo 👑' : 'User'}\n\n🧠 මම මතක තියාගෙන ඉන්නේ:\n${facts}`);
  });

  a('forget', ['clearmemory'], 'මගේ memory මකන්න', {}, async (c) => {
    await K.memCol.deleteOne({ _id: c.sender });
    await c.reply('🗑️ ඔයා ගැන මතක ඔක්කොම මැකුවා!');
  });
}
