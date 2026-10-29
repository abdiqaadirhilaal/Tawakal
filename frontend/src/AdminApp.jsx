import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AdminLayout, { RequireRole } from './layouts/AdminLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Categories from './pages/admin/Categories';
import Orders from './pages/admin/Orders';
import OrderDetail from './pages/admin/OrderDetail';
import Inventory from './pages/admin/Inventory';
import Customers from './pages/admin/Customers';
import Reports from './pages/admin/Reports';
import Messages from './pages/admin/Messages';
import SettingsPage from './pages/admin/SettingsPage';
import Users from './pages/admin/Users';
import Account from './pages/admin/Account';
import Audit from './pages/admin/Audit';
import Pos from './pages/admin/pos/Pos';
import PosSales from './pages/admin/pos/PosSales';
import Shifts from './pages/admin/pos/Shifts';
import { ADMIN_ONLY, BACK_OFFICE_ROLES, POS_ROLES } from './utils/roles';
import { EmptyState } from './components/common/Feedback';
import Button from './components/common/Button';

const office = (el) => <RequireRole roles={BACK_OFFICE_ROLES}>{el}</RequireRole>;
const pos = (el) => <RequireRole roles={POS_ROLES}>{el}</RequireRole>;

function AdminNotFound() {
  return <EmptyState title="Boggan lama helin" action={<Button to="/admin">Bogga hore ee maamulka</Button>} />;
}

// Waddooyinkan waxay ku hoos jiraan /admin/* (eeg App.jsx). AdminLayout ayaa ilaaliya
// dhammaan bogagga marka laga reebo bogga soo gelidda.
export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="soo-gal" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route index element={office(<Dashboard />)} />
          {/* Kaashka (POS): admin, manager, cashier */}
          <Route path="pos" element={pos(<Pos />)} />
          <Route path="pos/sales" element={pos(<PosSales />)} />
          <Route path="pos/shifts" element={pos(<Shifts />)} />
          {/* Xafiiska: admin, manager, staff */}
          <Route path="dalabyada" element={office(<Orders />)} />
          <Route path="dalabyada/:id" element={office(<OrderDetail />)} />
          <Route path="alaabta" element={office(<Products />)} />
          <Route path="qaybaha" element={office(<Categories />)} />
          <Route path="kaydka" element={office(<Inventory />)} />
          <Route path="macaamiisha" element={office(<Customers />)} />
          <Route path="warbixinno" element={office(<Reports />)} />
          <Route path="farriimaha" element={office(<Messages />)} />
          <Route path="dejinta" element={office(<SettingsPage />)} />
          <Route path="isticmaalayaasha" element={<RequireRole roles={ADMIN_ONLY}><Users /></RequireRole>} />
          <Route path="diiwaanka" element={<RequireRole roles={ADMIN_ONLY}><Audit /></RequireRole>} />
          <Route path="akoonka" element={<Account />} />
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
