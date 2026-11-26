import { pick, seedPct } from '../util.js';

const BALL = ['ඔව් 100%! ✅', 'නෑ බබා ❌', 'සමහරවිට 🤔', 'හොඳට හිතල ආයෙ අහන්න 🔮', 'නිසැකවම! 🔥', 'මම හිතන්නෙ නෑ 😕'];
const TRUTH = ['ඔයාගෙ පළවෙනි crush කවුද?', 'අන්තිමට බොරුවක් කිව්වෙ කාටද?', 'ඔයාගෙ ලොකුම බය මොකක්ද?', 'ජීවිතේ ලැජ්ජාම මොහොත මොකක්ද?'];
const DARE = ['ඔයාගෙ ලස්සනම selfie එක group එකට දාන්න 📸', 'ඊළඟ මැසේජ් 3 emoji වලින් විතරක් යවන්න', 'විනාඩියක් සිංදුවක් කියන්න voice note එකකින් 🎤'];
const REACT_ACTION = {
  hug: ['🤗', 'hugs'], slap: ['👋', 'slaps'], kiss: ['😘', 'kisses'], pat: ['🥰', 'pats'], punch: ['👊', 'punches'], cuddle: ['🫂', 'cuddles']
};
const nameOf = (jid) => '@' + String(jid).split('@')[0].split(':')[0];

export default function (reg) {
  const a = (name, aliases, desc, opt, run) => reg({ name, aliases, cat: 'fun', desc, ...opt, run });

  a('dice', ['roll'], 'දාදු කැටය', {}, (c) => c.reply(`🎲 *${1 + Math.floor(Math.random() * 6)}*`));
  a('flip', ['coin', 'toss'], 'කාසිය උඩ දාන්න', {}, (c) => c.reply(Math.random() < 0.5 ? '🪙 *Head* (සිරස)' : '🪙 *Tail* (අංක)'));
  a('choose', ['pickone', 'select'], 'එකක් තෝරන්න', { usage: 'a | b | c' }, (c) => {
    const o = c.args.split(/[|,]/).map((x) => x.trim()).filter(Boolean);
    return o.length < 2 ? c.reply(`🤔 ${c.p}choose pizza | burger`) : c.reply(`🎯 මම තෝරන්නේ: *${pick(o)}*`);
  });
  a('8ball', ['ball', 'eightball'], 'Magic 8 ball', { usage: '<ප්‍රශ්නය>' }, (c) => c.reply(c.args ? `🎱 ${pick(BALL)}` : '🎱 ප්‍රශ්නයක් අහන්න.'));
  a('ship', ['love', 'match'], 'Love % බලන්න', { usage: '@a @b | නම1 නම2' }, (c) => {
    const names = c.mentioned.length >= 2 ? c.mentioned.map(nameOf) : c.args.split(/[&|,+]| and | සහ /i).map((x) => x.trim()).filter(Boolean);
    if (names.length < 2) return c.reply(`💞 ${c.p}ship Kasun | Nimali`);
    const p = seedPct([names[0], names[1]].sort().join('&'));
    const bar = '█'.repeat(Math.round(p / 10)) + '░'.repeat(10 - Math.round(p / 10));
    return c.send({ text: `💞 *${names[0]}* ❤️ *${names[1]}*\n\n[${bar}] *${p}%*`, mentions: c.mentioned }, { quoted: c.m });
  });
  a('rateme', ['rating', 'howcute'], 'ඔයාට ලකුණු දෙනවා', { usage: '[දෙයක්]' }, (c) => c.reply(`⭐ ${c.args || 'ඔයා'}: *${seedPct((c.args || c.sender) + new Date().toDateString())}/100*`));
  a('truth', ['tod'], 'Truth question', {}, (c) => c.reply('🫣 *Truth:* ' + pick(TRUTH)));
  a('dare', [], 'Dare challenge', {}, (c) => c.reply('😈 *Dare:* ' + pick(DARE)));

  for (const [k, [em, verb]] of Object.entries(REACT_ACTION)) {
    a(k, [], `${k} කෙනෙක්ට ${em}`, { usage: '@tag' }, async (c) => {
      const t = await c.target(false);
      const to = t ? nameOf(t) : 'everyone';
      await c.send({ text: `${em} ${nameOf(c.rawSender)} ${verb} ${to}`, mentions: [c.rawSender, ...(t ? [t] : [])] }, { quoted: c.m });
    });
  }

  a('poll', ['vote'], 'Poll එකක් හදන්න', { usage: 'ප්‍රශ්නය | option1 | option2' }, async (c) => {
    const p = c.args.split('|').map((x) => x.trim()).filter(Boolean);
    if (p.length < 3) return c.reply(`📊 ${c.p}poll කැමති දේ? | Pizza | Burger`);
    await c.send({ poll: { name: p[0], values: p.slice(1, 13), selectableCount: 1 } });
  });
}
