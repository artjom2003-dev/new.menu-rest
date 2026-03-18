const { Client } = require('pg');
const c = new Client({ host:'localhost', port:5432, database:'menurest', user:'menurest', password:'menurest_dev_pass' });

function normalize(s) {
  return s.toLowerCase()
    .replace(/[«»"''\-.,;:!?&+()[\]{}#@/\\]/g, '')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, '')
    .trim();
}

c.connect().then(async () => {
  const res = await c.query(`
    SELECT id, name,
      CASE
        WHEN description ~ '^«[^»]+»' THEN substring(description from '^«([^»]+)»')
        WHEN description ~ E'^"[^"]+"' THEN substring(description from E'^"([^"]+)"')
        WHEN description ~ E'^[A-Za-zА-Яа-яЁё0-9&.,\\'\\' ()]+\\s—' THEN trim(substring(description from E'^(.+?)\\s—'))
        ELSE NULL
      END as desc_name,
      LEFT(description, 150) as desc_start
    FROM restaurants
    WHERE description IS NOT NULL AND description != ''
  `);

  let mismatches = [];
  for (const r of res.rows) {
    if (!r.desc_name) continue;
    const nn = normalize(r.name);
    const dn = normalize(r.desc_name);
    if (nn === dn) continue;
    if (nn.includes(dn) || dn.includes(nn)) continue;
    // Skip KFC
    if (nn === 'kfc') continue;
    // Check char-level similarity to skip transliteration
    const longer = Math.max(nn.length, dn.length);
    let common = 0;
    for (let i = 0; i < Math.min(nn.length, dn.length); i++) {
      if (nn[i] === dn[i]) common++;
    }
    if (common / longer > 0.55) continue;

    mismatches.push({ id: r.id, name: r.name, desc_name: r.desc_name });
  }

  mismatches.sort((a, b) => a.id - b.id);

  console.log('Truly different names (card name vs description name):');
  console.log('Total: ' + mismatches.length);
  console.log('');
  for (const m of mismatches) {
    console.log(`${m.id} | [${m.name}] -> [${m.desc_name}]`);
  }
  c.end();
}).catch(e => console.error(e.message));
