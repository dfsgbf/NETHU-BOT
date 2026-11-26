import { getBuf } from '../util.js';

const nameOf = (jid) => '@' + String(jid).split('@')[0].split(':')[0];

export default function (reg, K) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'media', desc, ...opt, run });

  a('sticker', ['s', 'stiker', 'stik', 'ස්ටිකර්'], 'රූපයක් sticker කරන්න', { usage: '(image / reply)', fast: true }, async (c) => {
    if (!c.md || !['image', 'sticker'].includes(c.md.type)) return c.reply(`🖼️ රූපයක් එක්ක ${c.p}sticker කියන්න.`);
    const buf = await K.dl(c.sock, c.md);
    await c.send({ sticker: await K.toWebp(buf) }, { quoted: c.m });
  });

  a('toimg', ['toimage', 'stickertoimg'], 'Sticker -> රූපය', { usage: '(sticker reply)' }, async (c) => {
    if (c.md?.type !== 'sticker') return c.reply(`🖼️ sticker එකකට reply කරලා ${c.p}toimg කියන්න.`);
    const buf = await K.dl(c.sock, c.md);
    await c.send({ image: await K.toPng(buf), caption: '✅ Done' }, { quoted: c.m });
  });

  a('vv', ['viewonce', 'retrieve', 'ආයෙ'], 'ViewOnce / media ආයෙ එවන්න', { perm: 'owner', usage: '(reply)' }, async (c) => {
    if (!c.md) return c.reply('👀 ආයෙ බලන්න ඕන photo/video එකට reply කරන්න.');
    await K.sendMediaTo(c.sock, c.jid, c.md, c.say || '👀 මෙන්න ඒක ආයෙමත් 🥰', c.m);
  });

  a('save', ['savestatus', 'save_status'], 'Media/Status save කරන්න', { perm: 'owner', usage: '(reply)' }, async (c) => {
    if (!c.md) return c.reply('📎 save කරන්න ඕන status/රූපයට reply කරන්න.');
    await K.sendMediaTo(c.sock, c.me, c.md, '💾 saved');
    await c.done('💾 Saved!');
  });

  a('dp', ['getdp', 'get_dp', 'pp', 'profile'], 'කෙනෙකුගේ DP එක ගන්න', { usage: '<number | @tag | reply>' }, async (c) => {
    const t = await c.target(true);
    if (!t) return c.reply(`📞 උදා: ${c.p}dp 0771234567`);
    const url = await c.sock.profilePictureUrl(t, 'image').catch(() => null);
    if (!url) return c.reply('😕 dp එක ගන්න බැරි උනා.');
    await c.send({ image: { url }, caption: `${c.say || '🖼️ DP'} ${nameOf(t)}`, mentions: [t] }, { quoted: c.m });
  });

  a('bio', ['about', 'getbio'], 'කෙනෙකුගේ bio එක', { usage: '<number | @tag | reply>' }, async (c) => {
    const t = await c.target(true);
    if (!t) return c.reply('📞 අංකයක් දෙන්න / tag කරන්න.');
    const r = await c.sock.fetchStatus(t).catch(() => null);
    const st = Array.isArray(r) ? r[0]?.status?.status ?? r[0]?.status : r?.status?.status ?? r?.status;
    await c.reply(st ? `📝 ${nameOf(t)}\n${typeof st === 'string' ? st : JSON.stringify(st)}` : '😕 bio එක ගන්න බැරි උනා.');
  });

  a('setdp', ['setpp', 'set_dp', 'fulldp'], 'Bot ගේ DP එක වෙනස් කරන්න', { perm: 'owner', usage: '(image)' }, async (c) => {
    if (c.md?.type !== 'image') return c.reply('📸 රූපයකට reply කරලා කියන්න.');
    await c.sock.updateProfilePicture(c.me, await K.dl(c.sock, c.md));
    await c.done('✅ DP එක වෙනස් කළා!');
  });

  a('setname', ['set_name', 'setwaname'], 'Bot ගේ WhatsApp නම වෙනස් කරන්න', { perm: 'owner', usage: '<නම>' }, async (c) => {
    if (!c.args) return c.reply('✍️ අලුත් නම දෙන්න.');
    await c.sock.updateProfileName(c.args.slice(0, 25));
    await c.done('✅ නම වෙනස් කළා!');
  });

  a('setbio', ['set_bio', 'setabout'], 'Bot ගේ bio එක වෙනස් කරන්න', { perm: 'owner', usage: '<text>' }, async (c) => {
    if (!c.args) return c.reply('✍️ bio එක දෙන්න.');
    await c.sock.updateProfileStatus(c.args.slice(0, 139));
    await c.done('✅ bio එක වෙනස් කළා!');
  });

  a('poststatus', ['post_status', 'status', 'poststory'], 'WhatsApp status එකක් දාන්න', { perm: 'owner', usage: '<text | image/video>' }, async (c) => {
    const opts = { statusJidList: [...(K.contacts[c.id] || []), c.me], backgroundColor: '#315575', font: 3 };
    if (c.md && ['image', 'video'].includes(c.md.type)) {
      const buf = await K.dl(c.sock, c.md);
      await c.sock.sendMessage('status@broadcast', c.md.type === 'image' ? { image: buf, caption: c.args || '' } : { video: buf, caption: c.args || '' }, opts);
    } else {
      if (!c.args) return c.reply('✍️ status text එක දෙන්න.');
      await c.sock.sendMessage('status@broadcast', { text: c.args }, opts);
    }
    await c.done('✅ Status එක දැම්මා!');
  });

  a('qr', ['qrcode'], 'QR code හදන්න', { usage: '<text | link>' }, async (c) => {
    const t = c.args || c.qText;
    if (!t) return c.reply(`🔳 උදා: ${c.p}qr https://google.com`);
    const { buf } = await getBuf(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=10&data=${encodeURIComponent(t)}`, 20000, 5);
    await c.send({ image: buf, caption: '🔳 QR Code' }, { quoted: c.m });
  });
}
