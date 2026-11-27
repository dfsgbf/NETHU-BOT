// ---------- AI engine: chamindu API (default) -> Gemini -> Pollinations fallback ----------
import { fetchT } from './util.js';

const MAX_URL = 6000;
const CREATOR_PHOTO = '[https://files.catbox.moe/17p3nr.jpg](https://files.catbox.moe/17p3nr.jpg)';

const cleanStr = (s) => (typeof s?.toWellFormed === 'function'
  ? s.toWellFormed()
  : String(s ?? '').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ''));

const safeEncode = (s) => encodeURIComponent(cleanStr(s));

export function parseAI(out) {
  let s = String(out ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
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

function getPersona(S) {
  if (S.aiPersona === 'boy') {
    return `You are "${S.botName}", a real 20yo Sri Lankan guy (NOT an AI/bot).
Style: Cocky, slightly arrogant (ලොකුකම), sharp-tongued (ටිකක් සැර), witty know-it-all (පණ්ඩිත), savage comebacks in casual Sinhala/Singlish ("අනේ මේ", "පිස්සුද බන්", "පණ්ඩිතයා වෙන්න එපා", "හරි හරි 😏"). Deny being a bot/AI like a real guy.`;
  }
  return `You are "${S.botName}", a real 19yo Sri Lankan girlfriend (NOT an AI/bot).
Style: Deeply romantic, sweet, caring, playful in Sinhala/Singlish ("bbh", "sudu", "manika", "බබා", "මැණික", "සුදූ", "🥰", "❤️"). Deny being a bot/AI like a real girl.`;
}

export function createAI({ getS, apiBase, apiKey, getCmdNames }) {
  const SYS = () => {
    const S = getS();
    return `${getPersona(S)}
Never say you are an AI/bot. Creator (only if asked): Dinidu Heshan, 19, Embilipitiya (0719845166 only if asked).
Reply ONLY JSON: {"cmd":"","args":"","reply":"","remember":{}}
cmd = command from list below or "chat". args = command arg. reply = short natural WhatsApp reply (1-2 sentences, vary your wording every time).
Map: creator/bot pic->"photo", viewonce->"vv", sudo->"addsudo", jid/lid->"jid", song->"song", video->"video", sticker->"sticker", tagall->"tagall", else->"chat".
Cmds: ${getCmdNames().join(' ')}`;
  };

  const PLAIN_SYS = () => {
    const S = getS();
    return `${getPersona(S)} Never admit being an AI/bot. Reply naturally in the user's language (Sinhala/Singlish/English), concise.`;
  };

  function buildPrompt(text, hasMedia, mem, nHist = 2, lim = 350) {
    const facts = cleanStr(Object.entries(mem?.facts || {}).map(([k, v]) => `${k}:${v}`).join(';').slice(0, 150)) || 'none';
    const hist = (mem?.hist || []).slice(-nHist).map((h) => `U:${cleanStr(String(h.u || '').slice(0, 60))}\nR:${cleanStr(String(h.a || '').slice(0, 60))}`).join('\n');
    return `Facts:${facts}\n${hist ? hist + '\n' : ''}User:${cleanStr(String(text || '').slice(0, lim))}${hasMedia ? ' [media]' : ''}\nJSON:`;
  }

  async function viaChatgpt(prompt) {
    const nonce = Math.floor(Math.random() * 1e9);
    const r = await fetchT(`${apiBase}/ai/chatgpt?prompt=${safeEncode(prompt)}&_=${nonce}&api_key=${apiKey}`, {}, 45000);
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
    const seed = Math.floor(Math.random() * 1e9);
    const r = await fetchT(`[https://text.pollinations.ai/$](https://text.pollinations.ai/$){safeEncode(prompt)}?seed=${seed}&json=false`, {}, 45000);
    if (!r.ok) throw new Error('Pollinations error ' + r.status);
    const t = (await r.text()).trim();
    if (!t || /^\s*</.test(t)) throw new Error('Pollinations empty/html');
    return t;
  }

  async function viaGemini(system, prompt, img, json) {
    const S = getS();
    if (!S.geminiKey) throw new Error('no gemini key');
    const parts = [{ text: cleanStr(prompt) }];
    if (img) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img.toString('base64') } });
    const r = await fetchT(`[https://generativelanguage.googleapis.com/v1beta/models/$](https://generativelanguage.googleapis.com/v1beta/models/$){S.model || 'gemini-2.5-flash'}:generateContent?key=${S.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: cleanStr(system) }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { ...(json ? { responseMimeType: 'application/json' } : {}), temperature: 0.95 }
      })
    }, 45000);
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('');
    if (!t) throw new Error('Gemini: ' + (j?.error?.message || 'no response'));
    return t;
  }

  function fit(system, build) {
    let n = 2, lim = 300, full;
    for (;;) {
      full = cleanStr(system + '\n' + build(n, lim));
      if (safeEncode(full).length <= MAX_URL) return full;
      if (n > 0) n--;
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
        if (p === 'gemini') return await viaGemini(system, build(6, 500), img, json);
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
