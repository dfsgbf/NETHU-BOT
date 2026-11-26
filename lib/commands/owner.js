import { digits, normNum, sleep } from '../util.js';

const nameOf = (jid) => '@' + String(jid).split('@')[0].split(':')[0];

export default function (reg, K) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'owner', desc, perm: 'owner', ...opt, run });

  a('addsudo', ['setsudo', 'set_sudo', 'sudo'], 'Sudo user කෙනෙක් add කරන්න', { usage: '<number | @tag>' }, async (c) => {
    let n = '';
    const t = c.mentioned[0] || c.qParticipant;
    const m = c.args.match(/\+?\d[\d\s-]{7,15}\d/);
    if (m) n = normNum(m[0]);
    else if (t) n = digits(t.split('@')[0]);
    if (!n || n.length < 9) return c.reply(`📞 නිවැරදි අංකයක් දෙන්න.\nඋදා: ${c.p}addsudo 0771234567`);
    if (!K.sudoList().includes(n)) { c.S.sudo = c.S.sudo ? `${c.S.sudo},${n}` : n; await c.saveSettings(); }
    await c.reply(`✅ *+${n}* Sudo list එකට add කළා.`);
  });

  a('delsudo', ['removesudo'], 'Sudo අයින් කරන්න', { usage: '<number>' }, async (c) => {
    const m = c.args.match(/\+?\d[\d\s-]{7,15}\d/);
    const n = m ? normNum(m[0]) : digits((c.mentioned[0] || c.qParticipant || '').split('@')[0]);
    if (!n) return c.reply(`📞 ${c.p}delsudo 0771234567`);
    c.S.sudo = String(c.S.sudo).split(',').map((x) => x.trim()).filter((x) => x && digits(x) !== n).join(',');
    await c.saveSettings();
    await c.reply(`✅ +${n} Sudo list එකෙන් අයින් කළා.`);
  });

  a('sudolist', ['sudos'], 'Developer / Sudo ලැයිස්තුව', {}, (c) => c.reply('👑 *Developer & Sudo*\n' + (K.sudoList().map((x) => '• +' + x).join('\n') || '—')));

  a('block', [], 'Block කරන්න', { usage: '<@tag | number | reply>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}block 0771234567`);
    await c.sock.updateBlockStatus(t, 'block');
    await c.reply('🚫 Blocked ' + nameOf(t));
  });

  a('unblock', [], 'Unblock කරන්න', { usage: '<number>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}unblock 0771234567`);
    await c.sock.updateBlockStatus(t, 'unblock');
    await c.reply('✅ Unblocked ' + nameOf(t));
  });

  a('ban', ['banuser'], 'Bot භාවිතයෙන් user කෙනෙක්ව ban කරන්න', { usage: '<number | @tag>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}ban 0771234567`);
    const n = digits(t.split('@')[0]);
    const list = String(c.S.banned || '').split(',').filter(Boolean);
    if (!list.includes(n)) list.push(n);
    c.S.banned = list.join(',');
    await c.saveSettings();
    await c.reply(`⛔ +${n} ban කළා.`);
  });

  a('unban', ['unbanuser'], 'Ban අයින් කරන්න', { usage: '<number | @tag>' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`📞 ${c.p}unban 0771234567`);
    const n = digits(t.split('@')[0]);
    c.S.banned = String(c.S.banned || '').split(',').filter((x) => x && x !== n).join(',');
    await c.saveSettings();
    await c.reply(`✅ +${n} unban කළා.`);
  });

  a('setprefix', ['prefix'], 'Command prefix වෙනස් කරන්න', { usage: '<.>' }, async (c) => {
    if (!c.args) return c.reply(`🔰 දැන් prefix: *${c.S.prefix}*`);
    c.S.prefix = c.args.replace(/\s+/g, '').slice(0, 10);
    await c.saveSettings();
    await c.reply(`✅ Prefix → *${c.S.prefix}*`);
  });

  a('mode', [], 'public / private mode', { usage: 'public|private' }, async (c) => {
    const v = (c.argv[0] || '').toLowerCase();
    if (!['public', 'private'].includes(v)) return c.reply(`🔒 දැන්: *${c.S.mode}*\n${c.p}mode public | private`);
    c.S.mode = v;
    await c.saveSettings();
    await c.reply(`✅ Mode → *${v}*`);
  });

  const SETKEYS = {
    statusseen: ['statusSeen', 'Status auto seen'],
    statusreact: ['statusReact', 'Status auto react'],
    statussave: ['statusSave', 'Status auto save'],
    autoread: ['autoRead', 'Auto read'],
    autotyping: ['autoTyping', 'Typing'],
    alwaysonline: ['alwaysOnline', 'Always online'],
    anticall: ['antiCall', 'Anti call'],
    antiban: ['antiBan', 'Anti-Ban Safe Delay']
  };

  a('set', ['settings', 'toggle', 'config'], 'Settings on/off (.set ai on | .set autoread on)', { usage: '<key> on|off' }, async (c) => {
    const k = (c.argv[0] || '').toLowerCase();
    const v = (c.argv[1] || '').toLowerCase();

    if (k === 'ai') {
      if (!c.isGroup) return c.reply('👥 `.set ai on` හෝ `.set ai off` පාවිච්චි කරන්නේ Group එකක් ඇතුළේ විතරයි.');
      if (!['on', 'off'].includes(v)) {
        const gc = await K.groupCfg(c.jid);
        return c.reply(`🧠 මේ Group එකේ AI: *${gc.ai === 'on' ? 'ON' : 'OFF'}*\nභාවිතය: ${c.p}set ai on | off`);
      }
      const gc = await K.groupCfg(c.jid);
      gc.ai = v;
      await K.saveGroupCfg(c.jid, gc);
      return c.reply(`✅ මේ Group එකට AI Chat → *${v.toUpperCase()}* (trigger words කිව්වම වැඩ කරයි)`);
    }

    if (!SETKEYS[k] || !['on', 'off'].includes(v)) {
      return c.reply(
        '⚙️ *Bot Settings*\n\n' +
        `• *ai* — මේ Group එකේ AI (Group එකකදී): ${c.p}set ai on|off\n` +
        Object.entries(SETKEYS).map(([n, [f, d]]) => `• *${n}* — ${d}: ${c.S[f] === '1' ? '✅ on' : '❌ off'}`).join('\n') +
        `\n\nභාවිතය: ${c.p}set autoread on`
      );
    }
    c.S[SETKEYS[k][0]] = v === 'on' ? '1' : '0';
    await c.saveSettings();
    await c.reply(`✅ ${SETKEYS[k][1]} → *${v}*`);
  });

  a('setbotname', ['botname'], 'Bot ගේ නම', { usage: '<නම>' }, async (c) => {
    if (!c.args) return c.reply(`🤖 දැන්: *${c.S.botName}*`);
    c.S.botName = c.args.slice(0, 30);
    await c.saveSettings();
    await c.reply(`✅ Bot name → *${c.S.botName}*`);
  });

  a('addname', ['addtrigger'], 'AI Trigger නමක් add කරන්න', { usage: '<නම>' }, async (c) => {
    const n = c.args.trim().toLowerCase();
    if (!n) return c.reply(`✍️ ${c.p}addname manika`);
    const list = c.S.names.split(',').map((x) => x.trim()).filter(Boolean);
    if (!list.map((x) => x.toLowerCase()).includes(n)) list.push(n);
    c.S.names = list.join(',');
    await c.saveSettings();
    await c.reply(`✅ "${n}" trigger word එක add කළා.`);
  });

  a('delname', ['removename'], 'AI Trigger නමක් අයින් කරන්න', { usage: '<නම>' }, async (c) => {
    const n = c.args.trim().toLowerCase();
    c.S.names = c.S.names.split(',').map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== n).join(',');
    await c.saveSettings();
    await c.reply(`✅ "${n}" අයින් කළා.`);
  });

  a('names', ['triggers'], 'AI Trigger words ලැයිස්තුව', {}, (c) => c.reply('📛 *AI Trigger Words:*\n' + c.S.names.split(',').join(', ')));

  a('groups', ['gclist', 'mygroups'], 'Bot ඉන්න groups', {}, async (c) => {
    const g = Object.values(await c.sock.groupFetchAllParticipating());
    await c.reply(`👥 *Groups (${g.length})*\n\n` + g.slice(0, 40).map((x, i) => `${i + 1}. ${x.subject} (${x.participants.length})`).join('\n'));
  });

  a('broadcast', ['bc', 'bcgc'], 'සියලුම groups වලට safe broadcast', { usage: '<message>', ack: true }, async (c) => {
    const text = c.args || c.qText;
    if (!text) return c.reply(`📣 ${c.p}broadcast <message>`);
    const g = Object.keys(await c.sock.groupFetchAllParticipating());
    let ok = 0;
    for (const id of g) {
      try { await c.sock.sendMessage(id, { text: `📣 *Broadcast*\n\n${text}` }); ok++; } catch {}
      await sleep(3500);
    }
    await c.reply(`✅ groups ${ok}/${g.length} කට යැව්වා.`);
  });

  a('join', ['joingroup'], 'Group invite link එකකට join වෙන්න', { usage: '<link>' }, async (c) => {
    const code = c.args.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)?.[1];
    if (!code) return c.reply(`🔗 ${c.p}join https://chat.whatsapp.com/xxxx`);
    await c.sock.groupAcceptInvite(code);
    await c.reply('✅ Join වුනා!');
  });

  a('leave', ['leavegroup'], 'Group එකෙන් bot එළියට', { group: true }, async (c) => {
    await c.reply('👋 bye bye!');
    await c.sock.groupLeave(c.jid);
  });

  a('restart', ['reboot'], 'Bot restart', {}, async (c) => {
    await c.reply('♻️ Restart වෙනවා... (තත්පර 10-20කින් එනවා)');
    setTimeout(() => process.exit(0), 1000);
  });
}
