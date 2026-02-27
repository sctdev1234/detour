import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Cars from './pages/Cars';
import Coupons from './pages/Coupons';
import Credits from './pages/Credits';
import DashboardHome from './pages/DashboardHome';
import Drivers from './pages/Drivers';
import Login from './pages/Login';
import Places from './pages/Places';
import Requests from './pages/Requests';
import Reviews from './pages/Reviews';
import Subscriptions from './pages/Subscriptions';
import Support from './pages/Support';
import Trips from './pages/Trips';
import Users from './pages/Users';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes with Layout */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/places" element={<Places />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/support" element={<Support />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
