import { Routes, Route } from 'react-router-dom';
import { MenuScreen } from './pages/MenuScreen';
import { CartScreen } from './pages/CartScreen';
import { OrderStatusScreen } from './pages/OrderStatusScreen';

function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A2E]">
      <div className="text-center px-6">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Menu<span className="text-[#E8491D]">Rest</span> Order
        </h1>
        <p className="text-[#A0A0B0] text-sm mb-6">Сканируйте QR-код на столике чтобы открыть меню</p>
        <a
          href="/chuck/table/5"
          className="inline-block px-6 py-3 rounded-xl bg-[#E8491D] text-white text-sm font-semibold hover:bg-[#D43D15] transition"
        >
          Демо: Chuck, столик 5
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:slug/table/:tableNumber" element={<MenuScreen />} />
      <Route path="/:slug/table/:tableNumber/cart" element={<CartScreen />} />
      <Route path="/:slug/table/:tableNumber/order/:orderId" element={<OrderStatusScreen />} />
    </Routes>
  );
}
