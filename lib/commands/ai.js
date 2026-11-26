import { clip, getBuf } from '../util.js';

export default function (reg, K) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'ai', desc, ...opt, run });

  const aiCmd = (name, aliases, desc, usage, build, extra = {}) =>
    a(name, aliases, desc, { usage, ack: true, ...extra }, async (c) => {
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
    return `Translate the following text to ${lang}. Output ONLY the translation:\n${text}`;
  }, { example: 'si How are you?' });
  aiCmd('summarize', ['sum', 'summary', 'සාරාංශ'], 'Text එකක් සාරාංශ කරන්න', '<text | reply>', (i) => `Summarize this in short bullet points in the same language:\n${i}`);
  aiCmd('explain', ['eli5', 'පැහැදිලි'], 'සරලව පැහැදිලි කරන්න', '<දෙයක්>', (i) => `Explain this simply:\n${i}`);
  aiCmd('rewrite', ['fix', 'grammar', 'improve'], 'Text එක හොඳට ලියන්න', '<text | reply>', (i) => `Rewrite this text with natural tone. Output ONLY improved text:\n${i}`);
  aiCmd('story', ['කතාව'], 'කෙටි කතාවක්', '<මාතෘකාව>', (i) => `Write a short story (max 150 words) about: ${i}. Use the topic's language.`);
  aiCmd('poem', ['කවිය', 'kavi'], 'කවියක්', '<මාතෘකාව>', (i) => `Write a short poem about: ${i}. Use the topic's language.`);
  aiCmd('caption', ['cap'], 'Photo caption ideas', '<මාතෘකාව>', (i) => `Give 5 catchy captions with emojis for: ${i}`);
  aiCmd('code', ['coding'], 'Code ලියන්න', '<ඉල්ලීම>', (i) => `${i}\n(Give short, correct code in a code block.)`);
  aiCmd('email', ['letter'], 'Email / ලිපියක් ලියන්න', '<විස්තරය>', (i) => `Write a short professional email for: ${i}`);
  aiCmd('quote', ['motivate', 'motivation'], 'Motivational quote', '', () => 'Give one powerful motivational quote in Sinhala/English.', { noInput: true });
  aiCmd('joke', ['jokes', 'විහිළුව'], 'විහිළුවක්', '', () => 'Tell one short clean funny joke in Sinhala/Singlish.', { noInput: true });
  aiCmd('fact', ['facts', 'funfact'], 'Random fact', '', () => 'Tell one surprising random fact in Sinhala.', { noInput: true });
  aiCmd('riddle', ['prahelika'], 'ප්‍රහේලිකාවක්', '', () => 'Give one fun riddle in Sinhala with the answer at the bottom.', { noInput: true });
  aiCmd('pickup', ['pickupline'], 'Pickup line 😏', '', () => 'Give one cute romantic pickup line in Singlish.', { noInput: true });
  aiCmd('compliment', ['praise'], 'Compliment එකක්', '<නම>', (i) => `Give a sweet compliment to ${i || 'someone special'} in Singlish.`, { noInput: true });
  aiCmd('advice', ['upades'], 'උපදෙසක්', '<ප්‍රශ්නය>', (i) => `Give short caring advice for: ${i}`);

  a('imagine', ['img', 'draw', 'aiimage'], 'AI රූපයක් හදන්න', { usage: '<විස්තරය>', ack: true }, async (c) => {
    if (!c.args) return c.reply(`🎨 උදා: ${c.p}imagine a cute cat in space`);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(c.args)}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
    const { buf, type } = await getBuf(url, 90000, 15);
    if (!/image/.test(type)) throw new Error('රූපය හදන්න බැරි උනා');
    await c.send({ image: buf, caption: `🎨 ${clip(c.args, 150)}` }, { quoted: c.m });
  });

  a('tts', ['say', 'voice', 'කියවන්න'], 'Text -> Voice note', { usage: '[si|en|ta] <text>', ack: true }, async (c) => {
    let lang = 'si';
    let text = c.args || c.qText;
    const m = text.match(/^([a-z]{2}(?:-[A-Za-z]{2})?)\s+([\s\S]+)$/);
    if (m) { lang = m[1]; text = m[2]; }
    if (!text) return c.reply(`🔊 උදා: ${c.p}tts si ආයුබෝවන්`);
    const { buf } = await getBuf(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(text.slice(0, 190))}`, 30000, 10);
    await c.send({ audio: buf, mimetype: 'audio/mpeg', ptt: true }, { quoted: c.m });
  });
}
