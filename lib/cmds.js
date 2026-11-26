// ---------- Modular Command Registry Loader ----------
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CATS = {
  general: '⚙️ General',
  ai: '🧠 AI',
  download: '📥 Download',
  media: '🖼️ Media',
  group: '👥 Group',
  tools: '🧰 Tools',
  fun: '🎉 Fun',
  owner: '👑 Owner'
};

export function createRegistry() {
  const map = new Map();
  const list = [];
  const reg = (d) => {
    d.aliases = d.aliases || [];
    d.perm = d.perm || 'all';
    list.push(d);
    map.set(d.name, d);
    d.aliases.forEach((a) => map.set(a, d));
  };
  return { map, list, reg };
}

export async function loadAllCommands(reg, K) {
  const cmdDir = path.join(__dirname, 'commands');
  const files = fs.readdirSync(cmdDir).filter((f) => f.endsWith('.js')).sort();
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(cmdDir, f)).href);
    if (typeof mod.default === 'function') {
      mod.default(reg, K);
    }
  }
}
