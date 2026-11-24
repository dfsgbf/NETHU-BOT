// ---------- AI engine: chamindu API (default) -> Gemini -> Pollinations fallback ----------
import { fetchT } from './util.js';

const MAX_URL = 6000; // GET url length budget (Sinhala chars cost 9 chars each when encoded)
const CREATOR_PHOTO = 'https://files.catbox.moe/17p3nr.jpg';

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

export function createAI({ getS, apiBase, apiKey, getCmdNames }) {
  const SYS = () => {
    const S = getS();
    return `You are "${S.botName}", a loving WhatsApp AI assistant (talk warm like bbh, sudu, manika). Reply in the user's language (Sinhala script / English / Singlish), keep it short.
Creator: Dinidu Heshan (heshan/dinidu), age 19, from Embilipitiya. If asked who made you, say this. Give phone 0719845166 ONLY if asked for his number.
Work out what the user wants. Output ONLY JSON: {"cmd":"","args":"","reply":"","remember":{}}
cmd = ONE command name from the list below that fulfils the request, or "chat" for normal conversation/questions.
args = the argument for that command (song name, city, number, text to translate, etc).
reply = short loving reply in the user's language (what you say while doing it, or the answer itself when cmd is chat).
Rules: photo/pic of you or your creator -> cmd "photo". Reply to a viewonce/photo/video asking to see it again -> "vv". Add sudo -> "addsudo" (args=number). jid/lid -> "jid". Song -> "song" (args=song name). Video -> "video" (args=name). Image to sticker -> "sticker". Change my WhatsApp name/bio/dp -> "setname"/"setbio"/"setdp". Post status -> "poststatus". Tag everyone -> "tagall". Anything you can answer yourself -> "chat".
Commands: ${getCmdNames().join(' ')}
remember = facts the user tells about themselves (name, age, place, likes) e.g. {"name":"Kasun"}, else {}.`;
  };

  const PLAIN_SYS = () => {
    const S = getS();
    return `You are "${S.botName}", a warm, helpful WhatsApp AI assistant made by Dinidu Heshan. Reply in the same language as the user (Sinhala script / English / Singlish). Be clear and concise (under 150 words unless asked for more). No markdown headings.`;
  };

  function buildPrompt(text, hasMedia, mem, nHist = 3, lim = 400) {
    const facts = Object.entries(mem?.facts || {}).map(([k, v]) => `${k}: ${v}`).join('; ').slice(0, 300) || 'none';
    const hist = (mem?.hist || []).slice(-nHist).map((h) => `U: ${h.u.slice(0, 60)}\nB: ${h.a.slice(0, 60)}`).join('\n');
    return `User memory: ${facts}\nRecent chat:\n${hist || '-'}\n\nMessage: ${text.slice(0, lim)}\n(media attached: ${hasMedia ? 'yes' : 'no'})\nOutput JSON only.`;
  }

  // ----- providers -----
  async function viaChatgpt(prompt) {
    const r = await fetchT(`${apiBase}/ai/chatgpt?prompt=${encodeURIComponent(prompt)}&api_key=${apiKey}`, {}, 45000);
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
    const r = await fetchT(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {}, 45000);
    if (!r.ok) throw new Error('Pollinations error ' + r.status);
    const t = (await r.text()).trim();
    if (!t) throw new Error('Pollinations empty');
    return t;
  }

  async function viaGemini(system, prompt, img, json) {
    const S = getS();
    if (!S.geminiKey) throw new Error('no gemini key');
    const parts = [{ text: prompt }];
    if (img) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img.toString('base64') } });
    const r = await fetchT(`https://generativelanguage.googleapis.com/v1beta/models/${S.model || 'gemini-2.5-flash'}:generateContent?key=${S.geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { ...(json ? { responseMimeType: 'application/json' } : {}), temperature: 0.8 }
      })
    }, 45000);
    const j = await r.json();
    const t = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('');
    if (!t) throw new Error('Gemini: ' + (j?.error?.message || 'no response'));
    return t;
  }

  // fit a GET prompt inside URL budget
  function fit(system, build) {
    let n = 6, lim = 400, full;
    for (;;) {
      full = system + '\n\n' + build(n, lim);
      if (encodeURIComponent(full).length <= MAX_URL) return full;
      if (n > 0) n = Math.max(0, n - 2);
      else if (lim > 40) lim = Math.floor(lim / 2);
      else return full.slice(0, 1500);
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
    // Understand a chat message -> {cmd,args,reply,remember}
    async decide(text, hasMedia, mem, img = null) {
      const out = await run(SYS(), (n, lim) => buildPrompt(text, hasMedia, mem, n, lim), { img, json: true });
      return parseAI(out);
    },
    // Plain text task (translate, summarise, story, ...)
    async text(task, img = null) {
      const out = await run(PLAIN_SYS(), (_n, lim) => `Task: ${task.slice(0, Math.max(lim * 6, 600))}`, { img, json: false });
      return String(out).trim();
    }
  };
}
