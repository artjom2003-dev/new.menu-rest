import React, { useState } from 'react';
import { ownerApi } from '../lib/api';

export function TestPage() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testCreate = async () => {
    setLoading(true);
    setResult('Создаю...');
    try {
      const res = await ownerApi.createDish({ name: 'ТЕСТ-удали-меня', price: 1, categoryName: 'Тест' });
      setResult(`Создано! id=${res.data.id} dishId=${res.data.dishId}`);
    } catch (err: any) {
      setResult(`Ошибка создания: ${err.response?.status} ${err.response?.data?.message || err.message}`);
    }
    setLoading(false);
  };

  const testDelete = async () => {
    const id = prompt('Введи id для удаления:');
    if (!id) return;
    setLoading(true);
    setResult('Удаляю...');
    try {
      await ownerApi.deleteDish(Number(id));
      setResult(`Удалено id=${id}`);
    } catch (err: any) {
      setResult(`Ошибка удаления: ${err.response?.status} ${err.response?.data?.message || err.message}`);
    }
    setLoading(false);
  };

  const testList = async () => {
    setLoading(true);
    try {
      const res = await ownerApi.getMenu();
      const items = res.data || [];
      setResult(`Блюд: ${items.length}. Последние 3: ${items.slice(-3).map((d: any) => `${d.id}:"${d.dish?.name}"`).join(', ')}`);
    } catch (err: any) {
      setResult(`Ошибка: ${err.response?.status} ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-text-primary mb-4">Тест API</h1>
      <div className="flex gap-3 mb-4">
        <button onClick={testList} disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-bold cursor-pointer">
          Список меню
        </button>
        <button onClick={testCreate} disabled={loading}
          className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-bold cursor-pointer">
          Создать блюдо
        </button>
        <button onClick={testDelete} disabled={loading}
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold cursor-pointer">
          Удалить по id
        </button>
      </div>
      <pre className="bg-card border border-border rounded-xl p-4 text-sm text-text-primary whitespace-pre-wrap">
        {result || 'Нажми кнопку для теста'}
      </pre>
      <p className="text-xs text-text-muted mt-2">Token: {localStorage.getItem('owner-token') ? 'есть' : 'НЕТ'}</p>
    </div>
  );
}
