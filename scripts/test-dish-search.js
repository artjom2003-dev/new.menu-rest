const { Client } = require('pg');
const c = new Client({ host:'localhost', port:5432, database:'menurest', user:'menurest', password:'menurest_dev_pass' });
c.connect().then(async () => {
  const terms = ['торт', 'тирамису', 'чизкейк', 'наполеон', 'медовик', 'брауни', 'эклер', 'штрудель', 'десерт', 'пирожн', 'капкейк', 'профитрол', 'панна-котт'];

  const conditions = terms.map((_, i) =>
    `EXISTS (SELECT 1 FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id WHERE rd.restaurant_id = r.id AND d.name ILIKE $${i+1})`
  ).join(' OR ');

  const subConditions = terms.map((_, i) => `d.name ILIKE $${i+1}`).join(' OR ');

  const res = await c.query(`
    SELECT r.id, r.name,
      (SELECT string_agg(d.name, ', ') FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id WHERE rd.restaurant_id = r.id AND (${subConditions})) as matching_dishes
    FROM restaurants r
    WHERE r.status = 'published' AND (${conditions})
    ORDER BY r.rating DESC
    LIMIT 20
  `, terms.map(t => `%${t}%`));

  console.log('Restaurants with tort-related dishes:');
  console.log('Total:', res.rowCount);
  for (const r of res.rows) {
    console.log(r.id + ' | ' + r.name + ' | ' + r.matching_dishes);
  }
  c.end();
}).catch(e => console.error(e.message));
