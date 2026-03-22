'use client';

import { useState, useEffect, useRef } from 'react';
import { useOwner } from '@/components/owner/OwnerContext';
import { ownerApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import type { MenuDish } from '@/types/owner';

interface DishForm {
  name: string;
  description: string;
  composition: string;
  categoryName: string;
  price: string;
  weightGrams: string;
  volumeMl: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
}

const emptyForm: DishForm = {
  name: '', description: '', composition: '', categoryName: '',
  price: '', weightGrams: '', volumeMl: '', calories: '', protein: '', fat: '', carbs: '',
};

export default function OwnerMenuPage() {
  const { myRestaurant } = useOwner();
  const { toast } = useToast();

  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<DishForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DishForm>({ ...emptyForm });
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [showKbzhu, setShowKbzhu] = useState(false);
  const [editShowExtra, setEditShowExtra] = useState(false);
  const [editShowKbzhu, setEditShowKbzhu] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);

  // Load menu
  useEffect(() => {
    if (!myRestaurant) return;
    ownerApi.getMenu().then(res => {
      setDishes(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [myRestaurant]);

  if (!myRestaurant) return <p className="text-[var(--text2)]">Ресторан не найден.</p>;

  // Group by category
  const grouped: Record<string, MenuDish[]> = {};
  for (const d of dishes) {
    const cat = d.categoryName || 'Без категории';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(d);
  }

  const updateField = (setter: (v: DishForm) => void, prev: DishForm, field: keyof DishForm, value: string) => {
    setter({ ...prev, [field]: value });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast('Введите название блюда', 'error');
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, unknown> = { name: form.name.trim() };
      if (form.description) data.description = form.description;
      if (form.composition) data.composition = form.composition;
      if (form.categoryName) data.categoryName = form.categoryName;
      if (form.price) data.price = Math.round(Number(form.price) * 100); // рубли → копейки
      if (form.weightGrams) data.weightGrams = Number(form.weightGrams);
      if (form.volumeMl) data.volumeMl = Number(form.volumeMl);
      if (form.calories) data.calories = Number(form.calories);
      if (form.protein) data.protein = Number(form.protein);
      if (form.fat) data.fat = Number(form.fat);
      if (form.carbs) data.carbs = Number(form.carbs);

      const res = await ownerApi.createDish(data as never);
      setDishes(prev => [...prev, res.data]);
      setForm({ ...emptyForm });
      setShowAdd(false);
      setShowExtra(false);
      setShowKbzhu(false);
      toast('Блюдо добавлено', 'success');
    } catch { toast('Ошибка при добавлении', 'error'); }
    finally { setSaving(false); }
  };

  const startEdit = (d: MenuDish) => {
    setEditingId(d.id);
    setEditForm({
      name: d.dish.name || '',
      description: d.dish.description || '',
      composition: d.dish.composition || '',
      categoryName: d.categoryName || '',
      price: d.price ? String(d.price / 100) : '',
      weightGrams: d.dish.weightGrams ? String(d.dish.weightGrams) : '',
      volumeMl: d.dish.volumeMl ? String(d.dish.volumeMl) : '',
      calories: d.dish.calories ? String(d.dish.calories) : '',
      protein: d.dish.protein ? String(d.dish.protein) : '',
      fat: d.dish.fat ? String(d.dish.fat) : '',
      carbs: d.dish.carbs ? String(d.dish.carbs) : '',
    });
    const hasExtra = !!(d.dish.description || d.dish.composition || d.dish.weightGrams || d.dish.volumeMl);
    setEditShowExtra(hasExtra);
    setEditShowKbzhu(!!(d.dish.calories || d.dish.protein || d.dish.fat || d.dish.carbs));
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = { name: editForm.name.trim() };
      data.description = editForm.description || null;
      data.composition = editForm.composition || null;
      data.categoryName = editForm.categoryName || 'Основное меню';
      data.price = editForm.price ? Math.round(Number(editForm.price) * 100) : 0;
      data.weightGrams = editForm.weightGrams ? Number(editForm.weightGrams) : null;
      data.volumeMl = editForm.volumeMl ? Number(editForm.volumeMl) : null;
      data.calories = editForm.calories ? Number(editForm.calories) : null;
      data.protein = editForm.protein ? Number(editForm.protein) : null;
      data.fat = editForm.fat ? Number(editForm.fat) : null;
      data.carbs = editForm.carbs ? Number(editForm.carbs) : null;

      const res = await ownerApi.updateDish(editingId, data);
      setDishes(prev => prev.map(d => d.id === editingId ? res.data : d));
      setEditingId(null);
      toast('Блюдо обновлено', 'success');
    } catch { toast('Ошибка обновления', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить блюдо из меню?')) return;
    try {
      await ownerApi.deleteDish(id);
      setDishes(prev => prev.filter(d => d.id !== id));
      toast('Блюдо удалено', 'success');
    } catch { toast('Ошибка удаления', 'error'); }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      await ownerApi.uploadMenuPdf(file);
      toast('PDF загружен! Мы обработаем его и добавим блюда в меню.', 'success');
    } catch { toast('Ошибка загрузки PDF', 'error'); }
    finally { setUploadingPdf(false); if (pdfRef.current) pdfRef.current.value = ''; }
  };

  const fs: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 10,
    border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, var(--accent), #ff8c42)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  };

  const renderDishForm = (f: DishForm, setF: (v: DishForm) => void, extra: boolean, setExtra: (v: boolean) => void, kbzhu: boolean, setKbzhu: (v: boolean) => void) => (
    <div className="flex flex-col gap-3">
      {/* Main row: name + price + category — all inline */}
      <div className="flex gap-2 items-end">
        <div style={{ flex: 2 }}>
          <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">Название *</label>
          <input value={f.name} onChange={e => updateField(setF, f, 'name', e.target.value)} style={fs} placeholder="Цезарь с креветками" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">Цена, ₽</label>
          <input type="number" value={f.price} onChange={e => updateField(setF, f, 'price', e.target.value)} style={fs} placeholder="590" />
        </div>
        <div style={{ flex: 1 }}>
          <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">Категория</label>
          <input value={f.categoryName} onChange={e => updateField(setF, f, 'categoryName', e.target.value)} style={fs} placeholder="Салаты" />
        </div>
      </div>

      {/* Expand toggle */}
      {!extra && (
        <button onClick={() => setExtra(true)} className="border-0 cursor-pointer text-[12px] self-start"
          style={{ color: 'var(--text3)', background: 'none', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>
          Описание, граммовка, КБЖУ...
        </button>
      )}

      {/* Extra fields — hidden by default */}
      {extra && (
        <>
          <div>
            <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">Описание</label>
            <input value={f.description} onChange={e => updateField(setF, f, 'description', e.target.value)} style={fs} placeholder="Краткое описание блюда" />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">Состав</label>
            <input value={f.composition} onChange={e => updateField(setF, f, 'composition', e.target.value)} style={fs} placeholder="Креветки, салат романо, пармезан, сухарики" />
          </div>

          <div className="flex gap-2">
            <div style={{ flex: 1 }}>
              <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">Граммовка, г</label>
              <input type="number" value={f.weightGrams} onChange={e => updateField(setF, f, 'weightGrams', e.target.value)} style={fs} placeholder="250" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">Объём, мл</label>
              <input type="number" value={f.volumeMl} onChange={e => updateField(setF, f, 'volumeMl', e.target.value)} style={fs} placeholder="" />
            </div>
          </div>

          {/* КБЖУ toggle */}
          {!kbzhu ? (
            <button onClick={() => setKbzhu(true)} className="border-0 cursor-pointer text-[12px] self-start"
              style={{ color: 'var(--text3)', background: 'none', padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>
              + КБЖУ
            </button>
          ) : (
            <div className="flex gap-2">
              {(['calories', 'protein', 'fat', 'carbs'] as const).map(key => (
                <div key={key} style={{ flex: 1 }}>
                  <label className="block text-[11px] text-[var(--text3)] mb-1 font-semibold">
                    {{ calories: 'Ккал', protein: 'Белки, г', fat: 'Жиры, г', carbs: 'Углеводы, г' }[key]}
                  </label>
                  <input type="number" value={f[key]} onChange={e => updateField(setF, f, key, e.target.value)} style={fs} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="font-serif text-[22px] font-bold text-[var(--text)] mb-5">Управление меню</h1>

      {/* Top actions */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => { setShowAdd(!showAdd); setEditingId(null); }} style={btnPrimary}>
          + Добавить блюдо
        </button>

        <button onClick={() => pdfRef.current?.click()} disabled={uploadingPdf}
          className="border cursor-pointer transition-all"
          style={{
            padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'var(--bg2)', borderColor: 'var(--accent)', color: 'var(--accent)',
          }}>
          {uploadingPdf ? 'Загрузка...' : '📄 Загрузить PDF-меню'}
        </button>
        <input ref={pdfRef} type="file" accept=".pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />
      </div>

      {/* PDF info */}
      <div className="rounded-[12px] p-4 mb-6" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.15)' }}>
        <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>
          <strong>PDF-меню:</strong> Загрузите файл с меню, и мы автоматически извлечём блюда с ценами.
          Обработка может занять несколько минут. Или добавляйте блюда вручную через &laquo;+&raquo;.
          Сохранить блюдо можно сразу после ввода названия.
        </p>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-[16px] border p-5 mb-6" style={{ borderColor: 'var(--accent)', background: 'var(--bg2)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Новое блюдо</h3>
          {renderDishForm(form, setForm, showExtra, setShowExtra, showKbzhu, setShowKbzhu)}
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={saving || !form.name.trim()} style={{ ...btnPrimary, opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={() => { setShowAdd(false); setForm({ ...emptyForm }); setShowExtra(false); setShowKbzhu(false); }}
              className="border-0 cursor-pointer"
              style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--bg3)', color: 'var(--text2)' }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Menu list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div style={{ width: 32, height: 32, border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : dishes.length === 0 ? (
        <div className="rounded-[16px] p-8 text-center" style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
          <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>Меню пока пустое. Добавьте первое блюдо или загрузите PDF.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="rounded-[16px] border p-5" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--card-border)' }}>
                {category} <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}>({items.length})</span>
              </h3>

              <div className="flex flex-col gap-2">
                {items.map(d => (
                  <div key={d.id}>
                    {editingId === d.id ? (
                      /* Edit mode */
                      <div className="rounded-[12px] p-4" style={{ background: 'var(--bg)', border: '1px solid var(--accent)' }}>
                        {renderDishForm(editForm, setEditForm, editShowExtra, setEditShowExtra, editShowKbzhu, setEditShowKbzhu)}
                        <div className="flex gap-2 mt-3">
                          <button onClick={handleUpdate} disabled={saving || !editForm.name.trim()} style={{ ...btnPrimary, padding: '7px 16px', fontSize: 12, opacity: saving ? 0.6 : 1 }}>
                            {saving ? '...' : 'Сохранить'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="border-0 cursor-pointer"
                            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--bg3)', color: 'var(--text2)' }}>
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center justify-between rounded-[10px] px-4 py-3 transition-all"
                        style={{ background: d.isAvailable ? 'var(--bg)' : 'rgba(255,60,60,0.03)', border: '1px solid var(--card-border)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{d.dish.name}</span>
                            {d.dish.weightGrams && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.dish.weightGrams} г</span>}
                            {d.dish.volumeMl && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.dish.volumeMl} мл</span>}
                            {!d.isAvailable && <span style={{ fontSize: 10, color: '#ff4444', fontWeight: 600, background: 'rgba(255,60,60,0.1)', padding: '2px 6px', borderRadius: 4 }}>Скрыто</span>}
                          </div>
                          {d.dish.description && <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>{d.dish.description}</p>}
                        </div>

                        <div className="flex items-center gap-3">
                          {d.price > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{(d.price / 100).toLocaleString('ru')} ₽</span>}

                          <button onClick={() => startEdit(d)} className="border-0 cursor-pointer"
                            style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--bg3)', color: 'var(--text2)' }}>
                            Изменить
                          </button>
                          <button onClick={() => handleDelete(d.id)} className="border-0 cursor-pointer"
                            style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(255,60,60,0.08)', color: '#ff4444' }}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
