import { digits, clip } from '../util.js';

const nameOf = (jid) => '@' + String(jid).split('@')[0].split(':')[0];

export default function (reg, K) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'group', desc, ...opt, run });
  const G = { group: true };

  const needBotAdmin = async (c) => {
    if (await c.botIsAdmin()) return true;
    await c.reply('🤖 මේක කරන්න මාව *group admin* කරන්න ඕන.');
    return false;
  };

  // --- Beautiful Box TagAll ---
  a('tagall', ['everyone', 'all', 'මෙන්ෂන්'], 'සියලුම members ලස්සනට tag කරන්න', { ...G, perm: 'admin', usage: '[message]' }, async (c) => {
    const gm = await c.meta();
    const msg = c.args || c.qText || c.say || 'Hey everyone! 👋';
    const members = gm.participants.map((p) => p.id);
    const list = members.map((id, i) => `│ ${String(i + 1).padStart(2, '0')}. @${id.split('@')[0]}`).join('\n');

    const text =
      `╭───〔 📢 *TAG ALL MEMBERS* 〕───\n` +
      `│ 👥 *Group:* ${gm.subject}\n` +
      `│ 👤 *Members:* ${members.length}\n` +
      `│ 💬 *Message:* ${msg}\n` +
      `├───────────────────────\n` +
      `${list}\n` +
      `╰───────────────────────\n` +
      `> 🤖 *${c.S.botName}*`;

    await c.send({ text, mentions: members }, { quoted: c.m });
  });

  a('hidetag', ['ht', 'notify'], 'Tag නොපෙන්වා සැවොම notify කරන්න', { ...G, perm: 'admin', usage: '<message>' }, async (c) => {
    const gm = await c.meta();
    await c.send({ text: c.args || c.qText || '📢', mentions: gm.participants.map((p) => p.id) });
  });

  a('tagadmin', ['admins', 'adminlist', 'listadmin'], 'Admin ලා tag කරන්න', G, async (c) => {
    const gm = await c.meta();
    const ad = gm.participants.filter((p) => p.admin);
    await c.send({ text: `👑 *Group Admins (${ad.length})*\n\n` + ad.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n'), mentions: ad.map((p) => p.id) }, { quoted: c.m });
  });

  a('ginfo', ['groupinfo', 'gcinfo'], 'Group විස්තර & Protection Status', G, async (c) => {
    const gm = await c.meta();
    const cfg = await K.groupCfg(c.jid);
    await c.reply(
      `╭───〔 👥 *GROUP INFO* 〕───\n` +
      `│ 🏷️ *Name:* ${gm.subject}\n` +
      `│ 🆔 *JID:* ${gm.id}\n` +
      `│ 👤 *Members:* ${gm.participants.length} (👑 ${gm.participants.filter((p) => p.admin).length})\n` +
      `│ 🧠 *Group AI:* ${cfg.ai === 'on' ? '✅ ON' : '❌ OFF'}\n` +
      `│ 🛡️ *Anti-Link:* ${cfg.antilink || 'off'}\n` +
      `│ 🤬 *Anti-Bad:* ${cfg.antibad || 'off'}\n` +
      `│ 🤖 *Anti-Bot:* ${cfg.antibot || 'off'}\n` +
      `│ 👋 *Welcome:* ${cfg.welcome || 'off'}\n` +
      `╰───────────────────────\n` +
      `📝 ${clip(gm.desc || '—', 250)}`
    );
  });

  const part = (name, aliases, action, desc, ok) =>
    a(name, aliases, desc, { ...G, perm: 'admin', usage: '<@tag | number | reply>' }, async (c) => {
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

  a('mute', ['close', 'lock', 'announce'], 'Group එක close (admins විතරක් message)', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupSettingUpdate(c.jid, 'announcement');
    await c.reply('🔇 Group එක close කළා. දැන් admins ට විතරයි.');
  });
  a('unmute', ['open', 'unlock'], 'Group එක open', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupSettingUpdate(c.jid, 'not_announcement');
    await c.reply('🔊 Group එක open කළා.');
  });
  a('link', ['glink', 'invitelink', 'grouplink'], 'Group invite link', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.reply('🔗 https://chat.whatsapp.com/' + (await c.sock.groupInviteCode(c.jid)));
  });
  a('revoke', ['resetlink'], 'Invite link reset', { ...G, perm: 'admin' }, async (c) => {
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupRevokeInvite(c.jid);
    await c.reply('♻️ Link එක reset කළා.');
  });
  a('setgname', ['setsubject', 'gname'], 'Group නම වෙනස් කරන්න', { ...G, perm: 'admin', usage: '<නම>' }, async (c) => {
    if (!c.args) return c.reply('✍️ අලුත් නම දෙන්න.');
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupUpdateSubject(c.jid, c.args.slice(0, 100));
    await c.reply('✅ Group නම වෙනස් කළා!');
  });
  a('setgdesc', ['setdesc', 'gdesc'], 'Group description වෙනස් කරන්න', { ...G, perm: 'admin', usage: '<text>' }, async (c) => {
    if (!c.args) return c.reply('✍️ description එක දෙන්න.');
    if (!(await needBotAdmin(c))) return;
    await c.sock.groupUpdateDescription(c.jid, c.args);
    await c.reply('✅ Group description වෙනස් කළා!');
  });
  a('setgpp', ['setgicon', 'gpp'], 'Group DP එක වෙනස් කරන්න (image reply)', { ...G, perm: 'admin', usage: '(image)' }, async (c) => {
    if (c.md?.type !== 'image') return c.reply('📸 රූපයකට reply කරලා කියන්න.');
    if (!(await needBotAdmin(c))) return;
    await c.sock.updateProfilePicture(c.jid, await K.dl(c.sock, c.md));
    await c.reply('✅ Group DP එක වෙනස් කළා!');
  });
  a('del', ['delete', 'මකන්න'], 'Message එකක් delete කරන්න (reply)', { perm: 'admin', usage: '(reply)' }, async (c) => {
    const x = c.ctx;
    if (!x?.stanzaId) return c.reply('🗑️ delete කරන්න ඕන message එකට reply කරන්න.');
    await c.sock.sendMessage(c.jid, { delete: { remoteJid: c.jid, fromMe: c.qFromMe, id: x.stanzaId, participant: x.participant } });
  });

  // --- Anti-Link / Anti-BadWords / Anti-Bot / Welcome / Group AI ---
  const toggleCfg = (name, aliases, field, vals, desc, needAdm = true) =>
    a(name, aliases, desc, { ...G, perm: 'admin', usage: vals.join('|') }, async (c) => {
      const v = (c.argv[0] || '').toLowerCase();
      const cfg = await K.groupCfg(c.jid);
      if (!vals.includes(v)) return c.reply(`⚙️ *${name}:* ${cfg[field] || 'off'}\nභාවිතය: ${c.p}${name} ${vals.join(' | ')}`);
      if (needAdm && v !== 'off' && !(await needBotAdmin(c))) return;
      cfg[field] = v;
      await K.saveGroupCfg(c.jid, cfg);
      await c.reply(`✅ *${name}* → *${v}*`);
    });

  toggleCfg('antilink', ['al'], 'antilink', ['off', 'delete', 'warn', 'kick'], 'Links delete / 3-warn / kick කරන්න');
  toggleCfg('antibad', ['antibadwords', 'antitoxic', 'abw'], 'antibad', ['on', 'off'], 'අසභ්‍ය වචන delete කර 3 වෙනිදාට remove කරන්න');
  toggleCfg('antibot', ['ab'], 'antibot', ['on', 'off'], 'වෙනත් Bots ලා auto remove කරන්න');
  toggleCfg('welcome', [], 'welcome', ['on', 'off'], 'අලුත් members ට welcome / bye message', false);
  toggleCfg('groupai', ['gai'], 'ai', ['on', 'off'], 'මේ group එකට AI chat ON/OFF කරන්න', false);

  a('addbad', ['addbadword'], 'Anti-Bad list එකට වචනයක් add කරන්න', { ...G, perm: 'admin', usage: '<වචනය>' }, async (c) => {
    const w = c.args.trim().toLowerCase();
    if (!w) return c.reply(`✍️ ${c.p}addbad <වචනය>`);
    const cfg = await K.groupCfg(c.jid);
    const list = Array.isArray(cfg.badwords) && cfg.badwords.length ? [...cfg.badwords] : [...(K.DEFAULT_BAD_WORDS || [])];
    if (!list.includes(w)) list.push(w);
    cfg.badwords = list;
    await K.saveGroupCfg(c.jid, cfg);
    await c.reply(`✅ "${w}" Anti-Bad list එකට add කළා.`);
  });

  a('delbad', ['delbadword', 'removebad'], 'Anti-Bad list එකෙන් වචනයක් අයින් කරන්න', { ...G, perm: 'admin', usage: '<වචනය>' }, async (c) => {
    const w = c.args.trim().toLowerCase();
    if (!w) return c.reply(`✍️ ${c.p}delbad <වචනය>`);
    const cfg = await K.groupCfg(c.jid);
    const list = Array.isArray(cfg.badwords) && cfg.badwords.length ? [...cfg.badwords] : [...(K.DEFAULT_BAD_WORDS || [])];
    cfg.badwords = list.filter((x) => x.toLowerCase() !== w);
    await K.saveGroupCfg(c.jid, cfg);
    await c.reply(`✅ "${w}" අයින් කළා.`);
  });

  a('badwords', ['badlist'], 'Anti-Bad වචන ලැයිස්තුව බලන්න', { ...G, perm: 'admin' }, async (c) => {
    const cfg = await K.groupCfg(c.jid);
    const list = Array.isArray(cfg.badwords) && cfg.badwords.length ? cfg.badwords : (K.DEFAULT_BAD_WORDS || []);
    await c.reply(`🤬 *Anti-Bad Words (${list.length})*\n\n${list.join(', ')}`);
  });

  a('warn', [], 'Warn කරන්න (3 වෙනිදාට kick)', { ...G, perm: 'admin', usage: '@tag' }, async (c) => {
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

  a('resetwarn', ['unwarn'], 'Warns අයින් කරන්න', { ...G, perm: 'admin', usage: '@tag' }, async (c) => {
    const t = await c.target(false);
    if (!t) return c.reply(`⚠️ ${c.p}resetwarn @tag`);
    const d = digits(t);
    await K.warns.deleteMany({ _id: { $in: [`${c.jid}|${d}`, `${c.jid}|bad|${d}`, `${c.jid}|link|${d}`] } });
    await c.reply('✅ සියලුම Warns අයින් කළා.');
  });

  a('warns', ['checkwarn'], 'Warns බලන්න', { ...G, usage: '[@tag]' }, async (c) => {
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
}
