import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ownerApi } from '../lib/api';

interface Dish {
  id: number;
  dishId: number;
  categoryName: string | null;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  dish: {
    id: number;
    name: string;
    description?: string;
    composition?: string;
    weightGrams?: number;
    volumeMl?: number;
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    imageUrl?: string;
  };
}

interface MenuCategory {
  category: string;
  dishes: Dish[];
}

const EMPTY_FORM = {
  name: '', description: '', composition: '', categoryName: '',
  price: '', weightGrams: '', volumeMl: '', calories: '', protein: '', fat: '', carbs: '',
};

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${
      type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>{message}</div>
  );
}

export function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create/edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  // New category
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Collapse/expand categories
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Category rename
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryRename, setCategoryRename] = useState('');
  const categoryInputRef = useRef<HTMLInputElement>(null);

  // Photo upload refs
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const loadMenu = useCallback(async () => {
    try {
      const res = await ownerApi.getMenu();
      const items: Dish[] = res.data || [];
      console.log('[loadMenu] got', items.length, 'items. First:', items[0]?.dish?.name);
      const map = new Map<string, Dish[]>();
      for (const d of items) {
        const cat = d.categoryName || 'Без категории';
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat)!.push(d);
      }
      const grouped: MenuCategory[] = [];
      for (const [category, dishes] of map) {
        grouped.push({ category, dishes });
      }
      setCategories(grouped);
    } catch (err) { console.error('[loadMenu] error:', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // Focus category rename input when editing starts
  useEffect(() => {
    if (editingCategory !== null && categoryInputRef.current) {
      categoryInputRef.current.focus();
      categoryInputRef.current.select();
    }
  }, [editingCategory]);

  const toggleCollapse = (category: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const startCategoryRename = (category: string) => {
    setEditingCategory(category);
    setCategoryRename(category);
  };

  const finishCategoryRename = async () => {
    if (!editingCategory || !categoryRename.trim() || categoryRename.trim() === editingCategory) {
      setEditingCategory(null);
      setCategoryRename('');
      return;
    }
    const newName = categoryRename.trim();
    const cat = categories.find(c => c.category === editingCategory);
    if (!cat) { setEditingCategory(null); return; }

    try {
      // Update all dishes in this category with the new category name
      await Promise.all(
        cat.dishes.map(dish => ownerApi.updateDish(dish.id, { categoryName: newName }))
      );
      showToast(`Категория переименована в "${newName}"`, 'success');
      // Update collapsed set if the old name was collapsed
      setCollapsed(prev => {
        if (prev.has(editingCategory!)) {
          const next = new Set(prev);
          next.delete(editingCategory!);
          next.add(newName);
          return next;
        }
        return prev;
      });
      await loadMenu();
    } catch {
      showToast('Ошибка переименования категории', 'error');
    }
    setEditingCategory(null);
    setCategoryRename('');
  };

  const handlePhotoUpload = async (dishId: number, file: File) => {
    setUploadingPhoto(dishId);
    try {
      await ownerApi.uploadDishPhoto(dishId, file);
      showToast('Фото загружено', 'success');
      await loadMenu();
    } catch {
      showToast('Ошибка загрузки фото', 'error');
    }
    setUploadingPhoto(null);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    // Open dish creation form pre-filled with this category
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryName: newCategoryName.trim() });
    setShowCategoryForm(false);
    setNewCategoryName('');
    setShowForm(true);
    showToast(`Добавьте первое блюдо в категорию "${newCategoryName.trim()}"`, 'success');
  };

  const openCreate = (categoryName?: string) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryName: categoryName || '' });
    setShowForm(true);
  };

  const openEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setForm({
      name: dish.dish.name,
      description: dish.dish.description || '',
      composition: dish.dish.composition || '',
      categoryName: dish.categoryName || '',
      price: String(dish.price),
      weightGrams: dish.dish.weightGrams ? String(dish.dish.weightGrams) : '',
      volumeMl: dish.dish.volumeMl ? String(dish.dish.volumeMl) : '',
      calories: dish.dish.calories ? String(dish.dish.calories) : '',
      protein: dish.dish.protein ? String(dish.dish.protein) : '',
      fat: dish.dish.fat ? String(dish.dish.fat) : '',
      carbs: dish.dish.carbs ? String(dish.dish.carbs) : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { showToast('Заполните название и цену', 'error'); return; }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        name: form.name,
        price: Number(form.price),
        categoryName: form.categoryName || undefined,
        description: form.description || undefined,
        composition: form.composition || undefined,
        weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
        volumeMl: form.volumeMl ? Number(form.volumeMl) : undefined,
        calories: form.calories ? Number(form.calories) : undefined,
        protein: form.protein ? Number(form.protein) : undefined,
        fat: form.fat ? Number(form.fat) : undefined,
        carbs: form.carbs ? Number(form.carbs) : undefined,
      };
      console.log('[handleSave] editingId:', editingId, 'data:', JSON.stringify(data));
      if (editingId) {
        const res = await ownerApi.updateDish(editingId, data);
        console.log('[handleSave] updateDish response:', res.data);
        showToast('Блюдо обновлено', 'success');
      } else {
        const res = await ownerApi.createDish(data);
        console.log('[handleSave] createDish response:', res.data);
        showToast('Блюдо добавлено', 'success');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadMenu();
    } catch (err) {
      console.error('[handleSave] ERROR:', err);
      showToast('Ошибка сохранения', 'error');
    }
    setSaving(false);
  };

  // Delete category
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{ category: string; dishIds: number[] } | null>(null);

  const handleDelete = async (id: number, name: string) => {
    try {
      await ownerApi.deleteDish(id);
      setCategories(prev => prev.map(c => ({
        ...c,
        dishes: c.dishes.filter(d => d.id !== id),
      })).filter(c => c.dishes.length > 0));
      showToast(`"${name}" удалено`, 'success');
    } catch (err: any) {
      showToast(`Ошибка: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    try {
      await Promise.all(deleteCategoryTarget.dishIds.map(id => ownerApi.deleteDish(id)));
      showToast(`Категория "${deleteCategoryTarget.category}" удалена (${deleteCategoryTarget.dishIds.length} блюд)`, 'success');
      await loadMenu();
    } catch { showToast('Ошибка удаления категории', 'error'); }
    setDeleteCategoryTarget(null);
  };

  const handleToggleAvailability = async (dish: Dish) => {
    try {
      await ownerApi.updateDish(dish.id, { isAvailable: !dish.isAvailable });
      await loadMenu();
    } catch { showToast('Ошибка', 'error'); }
  };

  const totalDishes = categories.reduce((s, c) => s + c.dishes.length, 0);

  // Filter
  const filtered = search
    ? categories.map(c => ({
        ...c,
        dishes: c.dishes.filter(d => d.dish.name.toLowerCase().includes(search.toLowerCase())),
      })).filter(c => c.dishes.length > 0)
    : categories;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Управление меню</h1>
          <p className="text-xs text-text-muted mt-1">{totalDishes} позиций · {categories.length} категорий</p>
        </div>
        <button onClick={() => setShowCategoryForm(true)}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition">
          + Категория
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none" />
      </div>

      {/* Delete category confirmation */}
      {deleteCategoryTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0" onClick={() => setDeleteCategoryTarget(null)} />
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm animate-slide-up relative z-10">
            <h2 className="text-base font-bold text-text-primary mb-2">Удалить категорию?</h2>
            <p className="text-sm text-text-muted mb-2">«{deleteCategoryTarget.category}»</p>
            <p className="text-xs text-red-400 mb-5">Будет удалено {deleteCategoryTarget.dishIds.length} блюд. Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmDeleteCategory()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition hover:opacity-90"
                style={{ background: '#EF4444', color: '#fff' }}>
                Удалить всё
              </button>
              <button
                onClick={() => setDeleteCategoryTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-3 text-text-secondary text-sm font-medium cursor-pointer hover:text-text-primary transition">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-32 px-4" onClick={() => setShowCategoryForm(false)}>
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-primary mb-4">Новая категория</h2>
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">Название категории</label>
              <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Например: Завтраки, Супы, Десерты..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none" />
            </div>
            <p className="text-[11px] text-text-muted mb-4">
              После создания категории вам нужно добавить в неё хотя бы одно блюдо
            </p>
            <div className="flex gap-3">
              <button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-40 transition">
                Создать и добавить блюдо
              </button>
              <button onClick={() => { setShowCategoryForm(false); setNewCategoryName(''); }}
                className="px-5 py-2.5 rounded-xl bg-surface-3 text-text-secondary text-sm font-medium hover:text-text-primary transition">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-20 px-4" onClick={() => setShowForm(false)}>
          <div className="bg-surface rounded-2xl border border-border p-6 w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-primary mb-4">{editingId ? 'Редактировать блюдо' : 'Новое блюдо'}</h2>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Название *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-primary focus:border-primary focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Цена (₽) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-primary focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Категория</label>
                  <input value={form.categoryName} onChange={e => setForm({ ...form, categoryName: e.target.value })}
                    list="categories-list"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-primary focus:border-primary focus:outline-none" />
                  <datalist id="categories-list">
                    {categories.map(c => <option key={c.category} value={c.category} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Описание</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-primary focus:border-primary focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Состав</label>
                <input value={form.composition} onChange={e => setForm({ ...form, composition: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-primary focus:border-primary focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Вес (г)</label>
                  <input type="number" value={form.weightGrams} onChange={e => setForm({ ...form, weightGrams: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-primary focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Объём (мл)</label>
                  <input type="number" value={form.volumeMl} onChange={e => setForm({ ...form, volumeMl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-primary focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">КБЖУ</label>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} placeholder="Ккал"
                    className="px-2 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none text-center" />
                  <input type="number" value={form.protein} onChange={e => setForm({ ...form, protein: e.target.value })} placeholder="Белки"
                    className="px-2 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none text-center" />
                  <input type="number" value={form.fat} onChange={e => setForm({ ...form, fat: e.target.value })} placeholder="Жиры"
                    className="px-2 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none text-center" />
                  <input type="number" value={form.carbs} onChange={e => setForm({ ...form, carbs: e.target.value })} placeholder="Углев"
                    className="px-2 py-2 rounded-lg bg-surface-2 border border-border text-xs text-text-primary focus:border-primary focus:outline-none text-center" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition">
                {saving ? 'Сохраняем...' : editingId ? 'Сохранить' : 'Добавить'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                className="px-6 py-2.5 rounded-xl bg-surface-3 text-text-secondary text-sm font-medium hover:text-text-primary transition">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu by categories */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">📋</div>
          <p className="text-text-muted text-sm">{search ? 'Ничего не найдено' : 'Меню пусто'}</p>
          {!search && (
            <button onClick={() => openCreate()} className="mt-3 text-primary text-sm font-medium hover:underline">
              Добавить первое блюдо
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map(cat => {
            const isCollapsed = collapsed.has(cat.category);
            const isRenaming = editingCategory === cat.category;

            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-3 group">
                  <div className="flex items-center gap-2">
                    {/* Collapse/expand chevron */}
                    <button
                      onClick={() => toggleCollapse(cat.category)}
                      className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-text-primary transition text-xs"
                      title={isCollapsed ? 'Развернуть' : 'Свернуть'}
                    >
                      {isCollapsed ? '\u25B6' : '\u25BC'}
                    </button>

                    {/* Category name — editable on double-click */}
                    {isRenaming ? (
                      <input
                        ref={categoryInputRef}
                        value={categoryRename}
                        onChange={e => setCategoryRename(e.target.value)}
                        onBlur={finishCategoryRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') finishCategoryRename();
                          if (e.key === 'Escape') { setEditingCategory(null); setCategoryRename(''); }
                        }}
                        className="text-sm font-semibold text-text-primary bg-surface-2 border border-primary rounded-lg px-2 py-0.5 focus:outline-none"
                      />
                    ) : (
                      <h2
                        className="text-sm font-semibold text-text-secondary cursor-pointer select-none"
                        onDoubleClick={() => startCategoryRename(cat.category)}
                        title="Двойной клик для переименования"
                      >
                        {cat.category || 'Без категории'} <span className="text-text-muted font-normal">({cat.dishes.length})</span>
                      </h2>
                    )}

                    {/* Rename & delete icons — visible on hover */}
                    {!isRenaming && (
                      <>
                        <button
                          onMouseDown={() => startCategoryRename(cat.category)}
                          className="w-5 h-5 flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary transition text-[10px]"
                          title="Переименовать категорию"
                        >
                          ✏️
                        </button>
                        <button
                          onMouseDown={() => setDeleteCategoryTarget({ category: cat.category, dishIds: cat.dishes.map(d => d.id) })}
                          className="w-5 h-5 flex items-center justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition text-[10px]"
                          title="Удалить категорию"
                        >
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                  <button onClick={() => openCreate(cat.category)}
                    className="text-[11px] text-primary font-medium hover:underline">
                    + Добавить
                  </button>
                </div>

                {/* Dishes — collapsible */}
                {!isCollapsed && (
                  <div className="space-y-1.5">
                    {cat.dishes.map(dish => (
                      <div key={dish.id}
                        className="flex items-center gap-3 p-3 rounded-xl border transition bg-card border-border hover:border-primary/20">

                        {/* Photo thumbnail */}
                        <button
                          onClick={() => fileInputRefs.current[dish.id]?.click()}
                          className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2 border border-border flex items-center justify-center hover:border-primary/40 transition relative"
                          title="Загрузить фото"
                        >
                          {uploadingPhoto === dish.id ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : dish.dish.imageUrl ? (
                            <img
                              src={dish.dish.imageUrl}
                              alt={dish.dish.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-base opacity-40">🍽️</span>
                          )}
                          <input
                            ref={el => { fileInputRefs.current[dish.id] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(dish.id, file);
                              e.target.value = '';
                            }}
                          />
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-text-primary truncate block">{dish.dish.name}</span>
                          {dish.dish.description && (
                            <p className="text-[11px] text-text-muted truncate mt-0.5">{dish.dish.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {dish.dish.weightGrams && <span className="text-[10px] text-text-muted">{dish.dish.weightGrams} г</span>}
                            {dish.dish.calories && <span className="text-[10px] text-text-muted">{dish.dish.calories} ккал</span>}
                          </div>
                        </div>

                        {/* Price */}
                        <span className="text-sm font-bold text-primary whitespace-nowrap">{dish.price} ₽</span>

                        {/* Actions: edit + delete only */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onMouseDown={() => openEdit(dish)}
                            className="w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center text-xs hover:text-primary hover:bg-primary/10 transition">
                            ✏️
                          </button>
                          <button onMouseDown={() => handleDelete(dish.id, dish.dish.name)}
                            className="w-8 h-8 rounded-lg bg-surface-3 text-text-muted flex items-center justify-center text-xs hover:text-red-400 hover:bg-red-500/10 transition">
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
