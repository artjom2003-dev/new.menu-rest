import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditPage } from './pages/EditPage';
import { MenuPage } from './pages/MenuPage';
import { PostsPage } from './pages/PostsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BookingsPage } from './pages/BookingsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { VacanciesPage } from './pages/VacanciesPage';
import { MessagesPage } from './pages/MessagesPage';
import { ServicesPage } from './pages/ServicesPage';
import { EMenuPage } from './pages/EMenuPage';
import { OrderChainPage } from './pages/OrderChainPage';
import { TestPage } from './pages/TestPage';

export default function App() {
  const { isLoggedIn } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={isLoggedIn ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/edit" element={<EditPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/vacancies" element={<VacanciesPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/emenu" element={<EMenuPage />} />
        <Route path="/order-chain" element={<OrderChainPage />} />
        <Route path="/order-chain/:tab" element={<OrderChainPage />} />
        <Route path="/test" element={<TestPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
