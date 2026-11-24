// ---------- Small shared helpers ----------
export const digits = (x = '') => String(x).replace(/\D/g, '');
export const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));

// Sri Lankan friendly number normaliser (0771234567 / 771234567 -> 94771234567)
export function normNum(x) {
  let n = digits(x);
  if (n.startsWith('00')) n = n.slice(2);
  if (n.length === 10 && n[0] === '0') n = '94' + n.slice(1);
  else if (n.length === 9 && n[0] === '7') n = '94' + n;
  return n;
}

export const fetchT = (url, opts = {}, ms = 30000) => fetch(url, { ...opts, signal: AbortSignal.timeout(ms) });

export async function getJson(url, ms = 20000) {
  const r = await fetchT(url, { headers: { 'user-agent': 'Mozilla/5.0 NethuBot' } }, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

export async function getText(url, ms = 20000) {
  const r = await fetchT(url, { headers: { 'user-agent': 'Mozilla/5.0 NethuBot' } }, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

export async function getBuf(url, ms = 90000, maxMB = 100) {
  const r = await fetchT(url, { headers: { 'user-agent': 'Mozilla/5.0 NethuBot' } }, ms);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > maxMB * 1024 * 1024) throw new Error(`ෆයිල් එක ${maxMB}MB වලට වඩා වැඩියි`);
  return { buf, type: r.headers.get('content-type') || '' };
}

export function fmtUp(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d ? d + 'd ' : ''}${h}h ${m}m ${s % 60}s`;
}

export const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');

// Safe maths evaluator (digits, operators and a few functions only)
export function calc(expr) {
  const s = String(expr).toLowerCase().replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '').trim();
  if (!s) throw new Error('empty');
  const rest = s.replace(/\b(sqrt|sin|cos|tan|log|ln|abs|floor|ceil|round|pi|e)\b/g, '');
  if (!/^[\d+\-*/%().^\s]*$/.test(rest)) throw new Error('invalid');
  const js = s
    .replace(/\^/g, '**')
    .replace(/\bpi\b/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\bln\b/g, 'Math.log')
    .replace(/\blog\b/g, 'Math.log10')
    .replace(/\b(sqrt|sin|cos|tan|abs|floor|ceil|round)\b/g, 'Math.$1');
  const v = Function(`"use strict";return (${js})`)();
  if (typeof v !== 'number' || !isFinite(v)) throw new Error('invalid');
  return Math.round(v * 1e10) / 1e10;
}

// stable 0-100 number from text (ship / rate)
export function seedPct(str) {
  let h = 7;
  for (const ch of String(str).toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 101;
}
