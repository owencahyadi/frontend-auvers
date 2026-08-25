import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage'; 
import PayrollPage from './pages/PayrollPage';
import CalendarPage from './pages/CalendarPage'; 
import EmployeePage from './pages/EmployeePage';
import SupplierPage from './pages/SupplierPage';
import PurchasePage from './pages/PurchasePage';
import ProfitLossPage from './pages/ProfitLossPage';
import OperationalCostPage from './pages/OperationalCostPage';
import UserManagementPage from './pages/UserManagementPage'; // <--- IMPORT HALAMAN USER MANAGEMENT

// IMPORT STORE PROVIDER DARI CONTEXT
import { StoreProvider } from './context/StoreContext'; 

import './App.css';

// 1. KOMPONEN PROTECTED ROUTE DENGAN ROLE CHECKER
const ProtectedRoute = ({ allowedRoles }) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  // Jika rute dibatasi oleh role tertentu dan user tidak punya akses, tendang ke /calendar
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/calendar" replace />;
  }

  return <Outlet />;
};

// 2. KOMPONEN LAYOUT DASHBOARD
const DashboardLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Sidebar />
      <div style={{ 
        marginLeft: '250px', 
        width: 'calc(100% - 250px)', 
        padding: '30px', 
        boxSizing: 'border-box',
        position: 'relative' 
      }}>
        <Outlet /> 
      </div>
    </div>
  );
};

function App() {
  return (
    // 3. BUNGKUS SELURUH APLIKASI DENGAN STORE PROVIDER
    <StoreProvider>
      <Router>
        <Routes>
          
          {/* PUBLIC ROUTE: Halaman Login (Tanpa Sidebar) */}
          <Route path="/login" element={<LoginPage />} />

          {/* PROTECTED ROUTES: Harus Login & Menggunakan Sidebar */}
          <Route element={<DashboardLayout />}>
            
            {/* ADMIN ONLY ROUTES (Payroll & User Management) */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/" element={<PayrollPage />} />
              <Route path="/users" element={<UserManagementPage />} />
            </Route>

            {/* SHARED ROUTES (Admin & Manager) */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/employees" element={<EmployeePage />} />
              <Route path="/supplier" element={<SupplierPage />} />
              <Route path="/purchase" element={<PurchasePage />} />
              <Route path="/pl" element={<ProfitLossPage />} />
              <Route path="/operational-costs" element={<OperationalCostPage />} />
            </Route>

          </Route>

          {/* CATCH ALL ROUTE: Jika URL tidak ditemukan, kembalikan ke beranda */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </StoreProvider>
  );
}

export default App;