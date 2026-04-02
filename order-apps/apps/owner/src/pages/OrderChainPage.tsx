import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EMenuPage } from './EMenuPage';

const TABS = [
  { id: 'emenu', icon: '📱', label: 'Электронное меню' },
  { id: 'waiter', icon: '👔', label: 'Приложение официанта' },
  { id: 'kitchen', icon: '👨‍🍳', label: 'Экран кухни' },
] as const;

type TabId = typeof TABS[number]['id'];

export function OrderChainPage() {
  const { tab: urlTab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab = (urlTab || 'emenu') as TabId;
  const setTab = (t: TabId) => navigate(`/order-chain/${t}`);

  return (
    <div>
      {/* Tab content */}
      {tab === 'emenu' && (
        <div>
          {/* Description */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">📱</div>
              <div>
                <h2 className="text-sm font-bold text-text-primary mb-1">Электронное меню по QR-коду</h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  На каждом столе — табличка с QR-кодом. Гость сканирует телефоном и видит ваше меню
                  с фотографиями, описаниями и ценами. Может сразу оформить заказ без ожидания официанта.
                  Меню обновляется мгновенно — измените цену или добавьте блюдо, и гость сразу это увидит.
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {['Без бумажных меню', 'Мгновенные обновления', '8 языков', 'Фото блюд', 'Фильтр аллергенов'].map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/8 text-primary border border-primary/15">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* E-Menu Settings */}
          <EMenuPage />
        </div>
      )}

      {tab === 'waiter' && (
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl flex-shrink-0">👔</div>
              <div>
                <h2 className="text-sm font-bold text-text-primary mb-1">Приложение официанта</h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  Мобильное приложение для смартфона или планшета официанта. Заказы появляются мгновенно —
                  от QR-меню или из киоска. Официант видит карту зала, статусы столов, управляет заказами
                  и получает push-уведомления когда блюдо готово к выдаче.
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Возможности</h3>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {[
                { icon: '🗺', title: 'Карта зала', desc: 'Визуальная схема столов с реальными статусами: свободен, занят, ожидает счёт' },
                { icon: '📋', title: 'Приём заказов', desc: 'Добавление блюд из меню, комментарии к позициям, выбор стола' },
                { icon: '🔔', title: 'Push-уведомления', desc: 'Мгновенное оповещение когда заказ готов к выдаче или гость вызывает' },
                { icon: '🔐', title: 'PIN-авторизация', desc: 'Быстрый вход по 4-значному PIN-коду за 2 секунды' },
                { icon: '📊', title: 'Статистика смены', desc: 'Количество заказов, выручка, средний чек за текущую смену' },
                { icon: '💳', title: 'Предчек и закрытие', desc: 'Формирование предчека и закрытие заказа в одно касание' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-lg flex-shrink-0">{f.icon}</span>
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">{f.title}</span>
                    <span className="text-[11px] text-text-muted leading-relaxed">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Скачать приложение</h3>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <button className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border hover:border-primary/30 transition text-left">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Скачать в</span>
                  <span className="text-sm font-semibold text-text-primary">App Store</span>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border hover:border-primary/30 transition text-left">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.4 12l2.298-2.492zM5.864 2.658L16.8 8.991l-2.302 2.302-8.634-8.635z"/></svg>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Скачать в</span>
                  <span className="text-sm font-semibold text-text-primary">Google Play</span>
                </div>
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-3 text-center">
              Приложение будет доступно для скачивания в ближайшее время
            </p>
          </div>
        </div>
      )}

      {tab === 'kitchen' && (
        <div className="space-y-6">
          {/* Description */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-2xl flex-shrink-0">👨‍🍳</div>
              <div>
                <h2 className="text-sm font-bold text-text-primary mb-1">Экран кухни (KDS)</h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  Kitchen Display System — веб-приложение для монитора, телевизора или планшета на кухне.
                  Заказы появляются на экране повара в ту же секунду, когда гость оформляет их в электронном меню
                  или официант вносит через приложение. Никаких бумажных чеков, потерянных заказов и задержек.
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Как это работает</h3>
            <div className="space-y-3">
              {[
                { step: '1', color: '#BAFF39', title: 'Заказ поступает', desc: 'Гость оформляет через QR-меню или официант вносит через приложение — заказ мгновенно на экране.' },
                { step: '2', color: '#F59E0B', title: 'Повар берёт в работу', desc: 'Нажимает «В работу» — статус меняется, официант видит что заказ готовится.' },
                { step: '3', color: '#10B981', title: 'Блюдо готово', desc: 'Нажимает «Готово» — официант получает уведомление и несёт блюдо гостю.' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: s.color + '20', color: s.color }}>{s.step}</span>
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">{s.title}</span>
                    <span className="text-[11px] text-text-muted">{s.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Возможности</h3>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {[
                { icon: '⚡', title: 'Реальное время', desc: 'Заказы появляются мгновенно через WebSocket — без задержек и обновлений страницы' },
                { icon: '⏱', title: 'Цветовые таймеры', desc: 'Серый → жёлтый → красный: повар видит сколько заказ ожидает и какой приоритетнее' },
                { icon: '🔊', title: 'Звуковые оповещения', desc: 'Звонок при новом заказе — повар не пропустит даже если отвернулся' },
                { icon: '📺', title: 'Любой экран', desc: 'Работает на планшете, мониторе, телевизоре — открывается в обычном браузере' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border">
                  <span className="text-lg flex-shrink-0">{f.icon}</span>
                  <div>
                    <span className="text-xs font-semibold text-text-primary block">{f.title}</span>
                    <span className="text-[11px] text-text-muted leading-relaxed">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Setup */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Подключение</h3>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Откройте ссылку ниже на любом устройстве с экраном — планшете, мониторе или телевизоре со встроенным браузером.
              Установка не требуется.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-border">
              <span className="text-xs text-text-muted flex-shrink-0">Ссылка:</span>
              <code className="text-xs text-primary font-mono flex-1 truncate">http://localhost:5181/16271</code>
              <button
                onClick={() => { navigator.clipboard.writeText('http://localhost:5181/16271'); }}
                className="px-3 py-1.5 rounded-lg bg-surface-3 text-text-muted text-[10px] font-medium hover:text-primary hover:bg-primary/10 transition flex-shrink-0">
                Копировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
