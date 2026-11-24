// ---------- Local (offline) intent detection: Sinhala / Singlish / English ----------
// Works without the AI API, so common requests never fail even if the AI is down.

const FILLER = new Set([
  // sinhala
  'දෙන්න', 'දෙන්නකො', 'දෙන්නෝ', 'දෙන්නකෝ', 'දාන්න', 'දාපන්', 'දාපං', 'එවන්න', 'එවපන්', 'ඕන', 'ඕනි', 'ඕනෙ', 'ඕණ', 'ගන්න', 'හොයලා', 'සොයලා',
  'කරන්න', 'කරපන්', 'කො', 'කෝ', 'බන්', 'මට', 'ඔයා', 'එකක්', 'එක', 'ටිකක්', 'පොඩ්ඩක්', 'පොඩි', 'සින්දුව', 'සිංදුව', 'සින්දුවක්', 'සිංදුවක්', 'ගීතය', 'ගීතයක්',
  'වීඩියෝව', 'වීඩියෝවක්', 'වීඩියෝ', 'විඩියෝ', 'කාලගුණය', 'කාලගුණ', 'තියෙන්නේ', 'කොහොමද', 'කොහොම', 'මොකක්ද', 'දැන්', 'අද',
  // english / singlish
  'denna', 'dennako', 'dapan', 'danna', 'ewanna', 'ewapan', 'oni', 'ona', 'one', 'hoyala', 'play', 'send', 'download', 'song', 'mp3', 'video', 'mp4',
  'please', 'pls', 'plz', 'ekak', 'eka', 'sindu', 'sinduwa', 'sindhuwa', 'gana', 'mata', 'me', 'the', 'a', 'of', 'weather', 'in', 'at', 'is', 'how', 'what',
  'kohomada', 'kohomed', 'tiyenne', 'thiyenne', 'dan', 'ada', 'today', 'now'
]);

const SI_REQ = /(දෙන්න|දෙන්නකො|දෙන්නකෝ|දෙන්නෝ|දාන්න|දාපන්|දාපං|එවන්න|එවපන්|ඕන|ඕනි|ඕනෙ|ඕණ|ගන්න|හොයලා|සොයලා|කරන්න|කරපන්|ඇහුම්|අහන්න)/;
const EN_REQ = /\b(play|send|download|denna|dennako|dapan|danna|ewanna|ewapan|oni|ona|one|hoyala|plz|pls|please|need|want)\b/i;
const hasReq = (t) => SI_REQ.test(t) || EN_REQ.test(t);

const SONG_KW = /(සින්දු|සිංදු|ගීත)|\b(song|sindu|sindhu|sinduwa|gana|mp3)\b/i;
const VIDEO_KW = /(වීඩියෝ|විඩියෝ)|\b(video|vedio|mp4)\b/i;

export function stripWords(clean) {
  return clean
    .split(/\s+/)
    .filter((t) => t && !FILLER.has(t.toLowerCase().replace(/^[.,!?:;'"()]+|[.,!?:;'"()]+$/g, '')))
    .join(' ')
    .trim();
}

const wc = (t) => t.trim().split(/\s+/).length;

/**
 * @param {string} clean   message without the bot name
 * @param {{md?:object, isGroup?:boolean, relaxed?:boolean}} o
 * @returns {{cmd:string,args:string}|null}
 */
export function intentOf(clean, { md = null, isGroup = false, relaxed = false } = {}) {
  const t = clean.trim();
  if (!t) return null;

  // 1. jid / lid
  if (/\b(jid|lid)\b/i.test(t)) return { cmd: 'jid', args: '' };

  // 2. sudo add
  if (/\bsudo\b/i.test(t) && /(add|set|change|danna|දාන්න|කරන්න|වෙනස්)/i.test(t)) return { cmd: 'addsudo', args: t };

  // 3. viewonce / saved media recovery
  if (md?.isQuoted && /(viewonce|view once|ආයෙ|ආයේ|open|බලන්න|save|එවන්න|දෙන්න)/i.test(t) && !/(status|ස්ටේටස්)/i.test(t)) return { cmd: 'vv', args: '' };

  // 4. creator / bot photo
  if (/(photo|pic|image|dp|පොටෝ|ෆොටෝ|පින්තූර|රූප)/i.test(t) && /(dinidu|heshan|creator|owner|ඔයාගේ|ඔයාගෙ|දිනිදු|හේෂාන්|හදපු)/i.test(t)) return { cmd: 'photo', args: '' };

  // 5. sticker
  if (/(sticker|ස්ටිකර්|ස්ටික්කර්|stikar|stiker)/i.test(t) && (md || relaxed || hasReq(t))) return { cmd: 'sticker', args: '' };

  // 6. dp
  if (/\b(dp|pp|profile ?pic)\b|ඩීපී/i.test(t)) {
    if (md?.type === 'image') return { cmd: 'setdp', args: '' };
    const num = t.match(/\+?\d[\d\s-]{7,14}\d/);
    if (num) return { cmd: 'dp', args: num[0] };
  }

  // 7. video (before song so "video eka" is not a song)
  if (VIDEO_KW.test(t) && !SONG_KW.test(t) && (hasReq(t) || relaxed)) return { cmd: 'video', args: stripWords(t) };

  // 8. song
  if (SONG_KW.test(t) && (hasReq(t) || relaxed)) return { cmd: 'song', args: stripWords(t) };

  // 9. menu / help
  if (wc(t) <= 6 && /(\bmenu\b|මෙනු|\bcommands?\b|කමාන්ඩ්|\bhelp\b|උදව්)/i.test(t)) return { cmd: 'menu', args: '' };

  // 10. alive
  if (wc(t) <= 4 && /(\balive\b|ඉන්නවද|ඉන්නවාද|online ද)/i.test(t)) return { cmd: 'alive', args: '' };

  // 11. weather
  if (/(weather|කාලගුණ|වැස්ස|\brain\b|උෂ්ණත්ව)/i.test(t)) return { cmd: 'weather', args: stripWords(t.replace(/(weather|කාලගුණය?|වැස්ස|rain|උෂ්ණත්වය?)/gi, ' ')) };

  // 12. time
  if (wc(t) <= 5 && /(වෙලාව|වේලාව|what.?s the time|time kiyada|time kiyd)/i.test(t)) return { cmd: 'time', args: '' };

  // 13. calculator (pure expression)
  if (/^[\d\s+\-*/().%^×÷,]+$/.test(t) && /\d/.test(t) && /[+\-*/%^×÷]/.test(t)) return { cmd: 'calc', args: t };

  // 14. tag all
  if (isGroup && /(tag ?all|everyone|හැමෝවම|හැමෝම|සියලුම|සියලු ?දෙනාම)/i.test(t) && /(tag|mention|කතා|කරන්න)/i.test(t)) return { cmd: 'tagall', args: '' };

  return null;
}
