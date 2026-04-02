import React, { useState, useRef } from 'react';

interface Ingredient {
  name: string;
  grossWeight: string;
  netWeight: string;
  finishedWeight: string;
}

interface TechCardData {
  dishName: string;
  cardNumber: string;
  organization: string;
  recipeSource: string;
  servingWeight: string;
  ingredients: Ingredient[];
  cookingProcess: string;
  servingInstructions: string;
  storageConditions: string;
  shelfLife: string;
  servingTemp: string;
  proteins: string;
  fats: string;
  carbs: string;
  calories: string;
  headChef: string;
  technologist: string;
}

const EMPTY_INGREDIENT: Ingredient = { name: '', grossWeight: '', netWeight: '', finishedWeight: '' };

const EMPTY_CARD: TechCardData = {
  dishName: '', cardNumber: '', organization: '', recipeSource: '',
  servingWeight: '', ingredients: [{ ...EMPTY_INGREDIENT }],
  cookingProcess: '', servingInstructions: '', storageConditions: '',
  shelfLife: '', servingTemp: '', proteins: '', fats: '', carbs: '',
  calories: '', headChef: '', technologist: '',
};

interface Props {
  dishName?: string;
  existingCard?: TechCardData;
  onClose: () => void;
  onSave: (data: TechCardData) => void;
}

export function TechCardModal({ dishName, existingCard, onClose, onSave }: Props) {
  const [card, setCard] = useState<TechCardData>(existingCard || { ...EMPTY_CARD, dishName: dishName || '' });
  const printRef = useRef<HTMLDivElement>(null);

  const updateField = (field: keyof TechCardData, value: string) => {
    setCard(prev => ({ ...prev, [field]: value }));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setCard(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === index ? { ...ing, [field]: value } : ing),
    }));
  };

  const addIngredient = () => {
    setCard(prev => ({ ...prev, ingredients: [...prev.ingredients, { ...EMPTY_INGREDIENT }] }));
  };

  const removeIngredient = (index: number) => {
    setCard(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== index) }));
  };

  const handleSave = () => {
    onSave(card);
  };

  const handleDownload = () => {
    // Generate printable HTML and open print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>ТК — ${card.dishName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; padding: 20mm; }
        h1 { font-size: 16pt; text-align: center; margin-bottom: 10pt; }
        h2 { font-size: 13pt; margin: 12pt 0 6pt; }
        table { width: 100%; border-collapse: collapse; margin: 8pt 0; }
        th, td { border: 1px solid #000; padding: 4pt 6pt; text-align: left; font-size: 11pt; }
        th { background: #f0f0f0; font-weight: bold; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 8pt; font-size: 11pt; }
        .section { margin: 10pt 0; }
        .section-title { font-weight: bold; font-size: 12pt; margin-bottom: 4pt; }
        .nutrition { display: flex; gap: 20pt; margin: 8pt 0; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30pt; }
        .sig-line { width: 200pt; border-bottom: 1px solid #000; text-align: center; padding-top: 4pt; }
        p { margin: 4pt 0; line-height: 1.5; }
        @media print { body { padding: 15mm; } }
      </style></head><body>
      <h1>ТЕХНОЛОГИЧЕСКАЯ КАРТА №${card.cardNumber || '___'}</h1>
      <div class="meta">
        <span><b>Организация:</b> ${card.organization || '________________________'}</span>
        <span><b>Дата:</b> ${new Date().toLocaleDateString('ru-RU')}</span>
      </div>
      <p><b>Наименование блюда:</b> ${card.dishName}</p>
      ${card.recipeSource ? `<p><b>Источник рецептуры:</b> ${card.recipeSource}</p>` : ''}

      <h2>Рецептура</h2>
      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование сырья</th>
            <th>Масса брутто, г</th>
            <th>Масса нетто, г</th>
            <th>Масса готового, г</th>
          </tr>
        </thead>
        <tbody>
          ${card.ingredients.map((ing, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${ing.name}</td>
              <td>${ing.grossWeight}</td>
              <td>${ing.netWeight}</td>
              <td>${ing.finishedWeight}</td>
            </tr>
          `).join('')}
          <tr style="font-weight:bold">
            <td colspan="4" style="text-align:right">Выход готового блюда:</td>
            <td>${card.servingWeight || '___'} г</td>
          </tr>
        </tbody>
      </table>

      <div class="section">
        <div class="section-title">Технология приготовления</div>
        <p>${card.cookingProcess.replace(/\n/g, '<br>')}</p>
      </div>

      <div class="section">
        <div class="section-title">Оформление и подача</div>
        <p>${card.servingInstructions || '—'}</p>
        ${card.servingTemp ? `<p><b>Температура подачи:</b> ${card.servingTemp}°C</p>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Условия хранения и реализации</div>
        <p>${card.storageConditions || '—'}</p>
        ${card.shelfLife ? `<p><b>Срок реализации:</b> ${card.shelfLife}</p>` : ''}
      </div>

      <div class="section">
        <div class="section-title">Пищевая ценность (на 1 порцию)</div>
        <div class="nutrition">
          <span>Белки: ${card.proteins || '—'} г</span>
          <span>Жиры: ${card.fats || '—'} г</span>
          <span>Углеводы: ${card.carbs || '—'} г</span>
          <span>Калорийность: ${card.calories || '—'} ккал</span>
        </div>
      </div>

      <div class="signatures">
        <div><div class="sig-line">${card.headChef || ''}</div><p style="text-align:center;font-size:10pt">Шеф-повар</p></div>
        <div><div class="sig-line">${card.technologist || ''}</div><p style="text-align:center;font-size:10pt">Технолог</p></div>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none";
  const labelCls = "text-xs font-medium text-text-secondary mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-surface rounded-2xl border border-border w-full max-w-3xl mx-4 shadow-2xl" ref={printRef}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Технологическая карта</h2>
            <p className="text-xs text-text-muted">ГОСТ 31987-2012</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { if (confirm('Очистить все поля техкарты?')) setCard({ ...EMPTY_CARD, dishName: dishName || '' }); }}
              className="px-4 py-2 rounded-xl text-red-400/70 text-xs font-medium hover:text-red-400 hover:bg-red-400/10 transition flex items-center gap-1.5">
              🗑 Очистить
            </button>
            <button onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-surface-3 text-text-secondary text-xs font-medium hover:text-primary hover:bg-primary/10 transition flex items-center gap-1.5">
              📄 Скачать / Печать
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center hover:text-text-primary transition">
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <label className={labelCls}>Наименование блюда *</label>
              <input value={card.dishName} onChange={e => updateField('dishName', e.target.value)} className={inputCls} placeholder="Борщ украинский" />
            </div>
            <div>
              <label className={labelCls}>Номер карты</label>
              <input value={card.cardNumber} onChange={e => updateField('cardNumber', e.target.value)} className={inputCls} placeholder="ТК-001" />
            </div>
            <div>
              <label className={labelCls}>Организация</label>
              <input value={card.organization} onChange={e => updateField('organization', e.target.value)} className={inputCls} placeholder="ООО «Манго»" />
            </div>
            <div>
              <label className={labelCls}>Источник рецептуры</label>
              <input value={card.recipeSource} onChange={e => updateField('recipeSource', e.target.value)} className={inputCls} placeholder="Сборник рецептур, 2015, стр. 42" />
            </div>
          </div>

          {/* Ingredients table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-text-primary">Рецептура (ингредиенты)</label>
              <button onClick={addIngredient} className="text-xs text-primary font-medium hover:underline">+ Добавить</button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-3">
                    <th className="px-3 py-2 text-left text-text-muted font-medium">Сырьё</th>
                    <th className="px-3 py-2 text-center text-text-muted font-medium w-24">Брутто, г</th>
                    <th className="px-3 py-2 text-center text-text-muted font-medium w-24">Нетто, г</th>
                    <th className="px-3 py-2 text-center text-text-muted font-medium w-24">Готовое, г</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {card.ingredients.map((ing, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)}
                          className="w-full bg-transparent text-text-primary text-xs focus:outline-none" placeholder="Название продукта" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={ing.grossWeight} onChange={e => updateIngredient(i, 'grossWeight', e.target.value)}
                          className="w-full bg-transparent text-text-primary text-xs text-center focus:outline-none" placeholder="0" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={ing.netWeight} onChange={e => updateIngredient(i, 'netWeight', e.target.value)}
                          className="w-full bg-transparent text-text-primary text-xs text-center focus:outline-none" placeholder="0" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={ing.finishedWeight} onChange={e => updateIngredient(i, 'finishedWeight', e.target.value)}
                          className="w-full bg-transparent text-text-primary text-xs text-center focus:outline-none" placeholder="0" />
                      </td>
                      <td className="px-1">
                        {card.ingredients.length > 1 && (
                          <button onClick={() => removeIngredient(i)} className="text-text-muted hover:text-red-400 text-[10px]">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className={labelCls}>Выход готового блюда (г)</label>
              <input value={card.servingWeight} onChange={e => updateField('servingWeight', e.target.value)}
                className="w-24 px-2 py-1 rounded-lg bg-surface-2 border border-border text-sm text-text-primary text-center focus:border-primary focus:outline-none" placeholder="250" />
            </div>
          </div>

          {/* Cooking process */}
          <div>
            <label className={labelCls}>Технология приготовления *</label>
            <textarea value={card.cookingProcess} onChange={e => updateField('cookingProcess', e.target.value)}
              className={`${inputCls} min-h-[100px] resize-y`}
              placeholder="Опишите пошаговый процесс приготовления: подготовка ингредиентов, температурный режим, время обработки..." />
          </div>

          {/* Serving & storage */}
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <div>
              <label className={labelCls}>Оформление и подача</label>
              <textarea value={card.servingInstructions} onChange={e => updateField('servingInstructions', e.target.value)}
                className={`${inputCls} min-h-[60px] resize-y`} placeholder="Посуда, гарнир, украшение..." />
            </div>
            <div>
              <label className={labelCls}>Условия хранения</label>
              <textarea value={card.storageConditions} onChange={e => updateField('storageConditions', e.target.value)}
                className={`${inputCls} min-h-[60px] resize-y`} placeholder="Температура, условия..." />
            </div>
            <div>
              <label className={labelCls}>Температура подачи (°C)</label>
              <input value={card.servingTemp} onChange={e => updateField('servingTemp', e.target.value)} className={inputCls} placeholder="65" />
            </div>
            <div>
              <label className={labelCls}>Срок реализации</label>
              <input value={card.shelfLife} onChange={e => updateField('shelfLife', e.target.value)} className={inputCls} placeholder="2 часа с момента приготовления" />
            </div>
          </div>

          {/* Nutrition */}
          <div>
            <label className="text-sm font-semibold text-text-primary mb-2 block">Пищевая ценность (на 1 порцию)</label>
            <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
              <div>
                <label className={labelCls}>Белки, г</label>
                <input value={card.proteins} onChange={e => updateField('proteins', e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Жиры, г</label>
                <input value={card.fats} onChange={e => updateField('fats', e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Углеводы, г</label>
                <input value={card.carbs} onChange={e => updateField('carbs', e.target.value)} className={inputCls} placeholder="0" />
              </div>
              <div>
                <label className={labelCls}>Ккал</label>
                <input value={card.calories} onChange={e => updateField('calories', e.target.value)} className={inputCls} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Шеф-повар</label>
              <input value={card.headChef} onChange={e => updateField('headChef', e.target.value)} className={inputCls} placeholder="ФИО" />
            </div>
            <div>
              <label className={labelCls}>Технолог / Калькулятор</label>
              <input value={card.technologist} onChange={e => updateField('technologist', e.target.value)} className={inputCls} placeholder="ФИО" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-surface-3 text-text-secondary text-sm font-medium hover:text-text-primary transition">
            Отмена
          </button>
          <button onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
