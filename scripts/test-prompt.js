// Simulate the analyzeDishMatch logic
const dish = 'торт';
const related = ['тирамису', 'чизкейк', 'наполеон', 'медовик', 'брауни', 'эклер', 'штрудель', 'десерт', 'пирожн', 'капкейк', 'профитрол', 'панна-котт'];

const restaurants = [
  { name: 'Панчо Пицца', dishes: ['Тирамису с ванильным соусом', 'Пицца страчателла'], address: 'Мира проспект, 211', distanceKm: 12.8 },
  { name: 'Хюгге. Вино и сыр', dishes: ['Торт фисташка-малина', 'Манго чизкейк'], address: 'Тверская, 10', distanceKm: 3.2 },
  { name: 'Планета Суши', dishes: ['Ролл Филадельфия', 'Мисо суп'], address: 'Проспект Мира, 100', distanceKm: 6.3 },
];

for (const r of restaurants) {
  const exactMatch = r.dishes.find(d => d.toLowerCase().includes(dish));
  if (exactMatch) {
    console.log(`${r.name} | НАЙДЕНО В МЕНЮ: ${exactMatch} | Адрес: ${r.address} | ${r.distanceKm} км`);
    continue;
  }
  let found = false;
  for (const rel of related) {
    const sim = r.dishes.find(d => d.toLowerCase().includes(rel));
    if (sim) {
      console.log(`${r.name} | ПОХОЖЕЕ БЛЮДО В МЕНЮ: ${sim} | Адрес: ${r.address} | ${r.distanceKm} км`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`${r.name} | НЕТ СОВПАДЕНИЙ (отфильтровано, не отправляется в LLM)`);
  }
}
