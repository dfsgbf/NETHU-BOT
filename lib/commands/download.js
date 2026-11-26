import { fmtNum } from '../util.js';

export default function (reg, K) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'download', desc, ...opt, run });
  const needArg = (c, what, ex) => c.reply(`${what}\nඋදා: ${c.p}${c.cmd.name} ${ex}`);

  a('song', ['play', 'ytmp3', 'yta', 'mp3', 'audio', 'sindu'], 'YouTube සින්දුව', { usage: '<නම | link>', ack: true }, async (c) => {
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

  a('video', ['ytmp4', 'ytv', 'mp4', 'vid'], 'YouTube වීඩියෝ', { usage: '<නම | link>', ack: true }, async (c) => {
    if (!c.args) return needArg(c, '🎬 වීඩියෝවේ නම දෙන්න.', 'despacito');
    const link = c.args.match(/https?:\/\/\S+/)?.[0];
    if (link) {
      const d = await K.callApi('/youtube/download', { url: link, quality: '720p', format: 'mp4' });
      return void (await K.sendBuf(c.sock, c.jid, d.buf, 'video', '', c.m));
    }
    const s = await K.getVideo(c.args);
    await K.sendBuf(c.sock, c.jid, s.buf, 'video', s.v.title, c.m);
  });

  a('yts', ['ytsearch', 'youtube'], 'YouTube search', { usage: '<නම>' }, async (c) => {
    if (!c.args) return needArg(c, '🔎 මොකක්ද හොයන්නේ?', 'lofi music');
    const vs = (await K.yts(c.args)).videos.slice(0, 6);
    if (!vs.length) return c.reply('😕 මුකුත් හම්බුනේ නෑ.');
    await c.reply('🔎 *YouTube results*\n\n' + vs.map((v, i) => `${i + 1}. *${v.title}*\n   ⏱️ ${v.timestamp} • 👁️ ${fmtNum(v.views)}\n   ${v.url}`).join('\n\n'));
  });

  const linkCmd = (name, aliases, desc) =>
    a(name, aliases, desc, { usage: '<link>', ack: true }, async (c) => {
      const link = (c.args || c.qText).match(/https?:\/\/\S+/)?.[0];
      if (!link) return needArg(c, '🔗 link එක දෙන්න.', 'https://...');
      const r = K.routeLink(link, c.args);
      if (!r) throw new Error('මේ link එක support නෑ');
      const d = await K.callApi(r.path, r.params);
      await K.sendBuf(c.sock, c.jid, d.buf, r.kind, d.title, c.m);
    });

  linkCmd('tiktok', ['tt', 'tik'], 'TikTok video (no watermark)');
  linkCmd('facebook', ['fb', 'fbdl'], 'Facebook video');
  linkCmd('instagram', ['ig', 'igdl', 'reels'], 'Instagram reel/post');
  linkCmd('pinterest', ['pin', 'pindl'], 'Pinterest image/video');
  linkCmd('spotify', ['sp', 'spdl'], 'Spotify song');
  linkCmd('download', ['dl', 'getmedia'], 'ඕනම link එකක් (YT/TikTok/FB/IG/Pinterest/Spotify)');
}
