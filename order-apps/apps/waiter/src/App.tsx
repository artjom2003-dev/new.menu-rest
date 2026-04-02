import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AuthScreen } from './pages/AuthScreen';
import { FloorScreen } from './pages/FloorScreen';
import { OrdersScreen } from './pages/OrdersScreen';
import { StatsScreen } from './pages/StatsScreen';
import { BottomNav } from './components/BottomNav';

function ProtectedLayout() {
  const { staff } = useAuthStore();
  if (!staff) return <Navigate to="/" replace />;
  return (
    <>
      <Routes>
        <Route path="/floor" element={<FloorScreen />} />
        <Route path="/orders" element={<OrdersScreen />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/table/:tableId" element={<div className="p-4 text-white min-h-screen bg-[#1A1A2E]">Table Order Screen (TODO)</div>} />
        <Route path="*" element={<Navigate to="/floor" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  const { staff } = useAuthStore();
  return (
    <Routes>
      <Route path="/" element={staff ? <Navigate to="/floor" replace /> : <AuthScreen />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
