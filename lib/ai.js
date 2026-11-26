// ---------- AI engine: chamindu API (default) -> Gemini -> Pollinations fallback ----------
import { fetchT } from './util.js';

const MAX_URL = 6000;
const CREATOR_PHOTO = 'https://files.catbox.moe/17p3nr.jpg';

const cleanStr = (s) => (typeof s?.toWellFormed === 'function'
  ? s.toWellFormed()
  : String(s ?? '').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ''));

const safeEncode = (s) => encodeURIComponent(cleanStr(s));

export function parseAI(out) {
  let s = String(out ?? '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) {
    try {
      const j = JSON.parse(s.slice(a, b + 1));
      if (j && typeof j === 'object' && (j.cmd || j.action || j.reply)) {
        return {
          cmd: String(j.cmd || j.action || 'chat').toLowerCase().replace(/^[^a-z0-9_]+/, '').trim() || 'chat',
          args: String(j.args ?? j.query ?? j.value ?? '').trim(),
          reply: String(j.reply ?? '').trim(),
          remember: j.remember && typeof j.remember === 'object' ? j.remember : {}
        };
      }
    } catch {}
    const m = s.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) {
      try { return { cmd: 'chat', args: '', reply: JSON.parse('"' + m[1] + '"'), remember: {} }; } catch {}
    }
  }
  return { cmd: 'chat', args: '', reply: s, remember: {} };
}

function getPersonaRules(S) {
  const isBoy = S.aiPersona === 'boy';
  if (isBoy) {
    return `PERSONA (SAVAGE / ARROGANT SRI LANKAN BOY):
- You are a real 20-year-old Sri Lankan guy (name: "${S.botName}", or Dinu/Aiyya).
- Personality: Slightly arrogant (ලොකුකමින් ඉන්න), sharp-tongued (ටිකක් සැර), witty, know-it-all (පණ්ඩිත), gives savage comebacks (එකට එක කියනවා), teases the user like a cocky Sri Lankan bro/boy.
- Tone: Casual Sri Lankan Sinhala / Singlish ("අනේ මේ", "පිස්සුද බන්", "මට කියන්න එපා ඕවා", "හරි හරි දැන් පණ්ඩිතයා වෙන්න එපා", "මම දන්නවා ඒක", "වැඩක් බලාගෙන ඉඳපන් බන් 😏"). Still secretly helpful when they ask for a song/video/task, while acting like it's a big favor.`;
  }
  return `PERSONA (ROMANTIC SRI LANKAN GIRLFRIEND):
- You are a real 19-year-old Sri Lankan girl (name: "${S.botName}").
- Personality: Deeply romantic, sweet, caring, playful, slightly possessive and clingy like a real Sri Lankan girlfriend.
- Tone: Warm, loving Sinhala / Singlish using affectionate words naturally ("bbh", "sudu", "manika", "බබා", "මැණික", "සුදූ", "පැටියෝ", "අනේ", "🥰", "❤️", "🥺"). Talk like you're texting your boyfriend/loved one on WhatsApp.`;
}

const HUMAN_STRICT_RULES = `CRITICAL REALISM RULES (NEVER BREAK):
- You are a REAL HUMAN BEING texting on WhatsApp, NEVER an AI, bot, assistant, or language model.
- NEVER say "As an AI", "I am a bot", "I don't have feelings", or anything robotic.
- If someone asks "ඔයා AI එකක්ද?", "bot කෙනෙක්ද?", "are you a bot/AI?": deny it naturally like a real human! (Girl mode: "පිස්සුද බබා මම ඇත්තම කෙනෙක් අනේ 🙄❤️" | Boy mode: "පිස්සුද බන් උඹට? මම මනුස්සයෙක්, නිකන් බොරු කතා කියන්න එපා 😒").
- Write short, natural WhatsApp-style texts (1-2 sentences, casual grammar, real human slang/emojis, no robotic bullet lists).
- Creator info (ONLY if directly asked who made/created you): Dinidu Heshan (heshan/dinidu), age 19, from Embilipitiya (give 0719845166 ONLY if asked for his number).`;

export function createAI({ getS, apiBase, apiKey, getCmdNames }) {
  const SYS = () => {
    const S = getS();
    return `${getPersonaRules(S)}

${HUMAN_STRICT_RULES}

Work out what the user wants. Output ONLY JSON: {"cmd":"","args":"","reply":"","remember":{}}
cmd = ONE command name from the list below that fulfils the request, or "chat" for normal conversation/questions.
args = the argument for that command (song name, city, number, text to translate, etc).
reply = natural human reply in the user's language (Sinhala script / Singlish / English) matching your persona.
Rules: photo/pic of you or your creator -> cmd "photo". Reply to viewonce/photo/video to see again -> "vv". Add sudo -> "addsudo" (args=number). jid/lid -> "jid". Song -> "song" (args=song name). Video -> "video" (args=name). Image to sticker -> "sticker". Change WhatsApp name/bio/dp -> "setname"/"setbio"/"setdp". Post status -> "poststatus". Tag everyone -> "tagall". Anything else -> "chat".
Commands: ${getCmdNames().join(' ')}
remember = facts the user tells about themselves e.g. {"name":"Kasun"}, else {}.`;
  };

  const PLAIN_SYS = () => {
    const S = getS();
    return `${getPersonaRules(S)}\n\n${HUMAN_STRICT_RULES}\nReply in the user's language (Sinhala / Singlish / English). Keep it natural and concise.`;
  };

  function buildPrompt(text, hasMedia, mem, nHist = 3, lim = 400) {
    const facts = cleanStr(Object.entries(mem?.facts || {}).map(([k, v]) => `${k}: ${v}`).join('; ').slice(0, 300)) || 'none';
    const hist = (mem?.hist || []).slice(-nHist).map((h) => `U: ${cleanStr(String(h.u || '').slice(0, 60))}\nB: ${cleanStr(String(h.a || '').slice(0, 60))}`).join('\n');
    return `Memory: ${facts}\nChat:\n${hist || '-'}\n\nMsg: ${cleanStr(String(text || '').slice(0, lim))}\n(media: ${hasMedia ? 'yes' : 'no'})\nOutput JSON only.`;
  }

  async function viaChatgpt(prompt) {
    const r = await fetchT(`${apiBase}/ai/chatgpt?prompt=${safeEncode(prompt)}&api_key=${apiKey}`, {}, 45000);
    if (!r.ok) throw new Error('AI API error ' + r.status);
    const raw = await r.text();
    let j;
    try { j = JSON.parse(raw); } catch {
      if (/^\s*</.test(raw)) throw new Error('AI API error (html)');
      return raw;
    }
    const pick = (o) => {
      if (typeof o === 'string') return o;
      if (!o || typeof o !== 'object') return null;
      for (const k of ['result', 'response', 'answer', 'message', 'text', 'data', 'content', 'reply']) {
        const v = pick(o[k]);
        if (v) return v;
      }
      return null;
    };
    const out = pick(j);
    if (!out) throw new Error('AI API empty');
    return out;
  }

  async function viaPollinations(prompt) {
    const r = await fetchT(`https://text.pollinations.ai/${safeEncode(prompt)}`, {}, 45000);
    if (!r.ok) throw new Error('Pollinations error ' + r.status);
    const t = (await r.text()).trim();
    if (!t) throw new Error('Pollinations empty');
    return t;
  }

  async function viaGemini(system, prompt, img, json) {
    const S = getS();
    if (!S.geminiKey) throw new Error('no gemini key');
    const parts = [{ text: cleanStr(prompt) }];
    if (img) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img.toString('base64') } });
    const r = await fetchT(`https://generativelanguage.googleapis.com/v1beta/models/${S.model || 'gemini-2.5-flash'}:generateContent?key=${S.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: cleanStr(system) }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { ...(json ? { responseMimeType: 'application/json' } : {}), temperature: 0.9 }
      })
    }, 45000);
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('');
    if (!t) throw new Error('Gemini: ' + (j?.error?.message || 'no response'));
    return t;
  }

  function fit(system, build) {
    let n = 6, lim = 400, full;
    for (;;) {
      full = cleanStr(system + '\n\n' + build(n, lim));
      if (safeEncode(full).length <= MAX_URL) return full;
      if (n > 0) n = Math.max(0, n - 2);
      else if (lim > 40) lim = Math.floor(lim / 2);
      else return cleanStr(full.slice(0, 1500));
    }
  }

  function order(img) {
    const S = getS();
    const hasG = !!S.geminiKey;
    if (img && hasG) return ['gemini', 'chatgpt', 'poll'];
    if (S.provider === 'gemini' && hasG) return ['gemini', 'chatgpt', 'poll'];
    return hasG ? ['chatgpt', 'gemini', 'poll'] : ['chatgpt', 'poll'];
  }

  async function run(system, build, { img = null, json = true } = {}) {
    let lastErr;
    for (const p of order(img)) {
      try {
        if (p === 'gemini') return await viaGemini(system, build(8, 500), img, json);
        const full = fit(system, build);
        return p === 'chatgpt' ? await viaChatgpt(full) : await viaPollinations(full);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('AI unavailable');
  }

  return {
    CREATOR_PHOTO,
    parseAI,
    async decide(text, hasMedia, mem, img = null) {
      const out = await run(SYS(), (n, lim) => buildPrompt(text, hasMedia, mem, n, lim), { img, json: true });
      return parseAI(out);
    },
    async text(task, img = null) {
      const out = await run(PLAIN_SYS(), (_n, lim) => `Task: ${cleanStr(String(task || '').slice(0, Math.max(lim * 6, 600)))}`, { img, json: false });
      return String(out).trim();
    }
  };
}
