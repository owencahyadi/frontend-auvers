import { useState, useEffect, useContext } from 'react';
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
import UserManagementPage from './pages/UserManagementPage'; 

// IMPORT STORE PROVIDER DARI CONTEXT
import { StoreProvider } from './context/StoreContext'; 

import './App.css';

// 1. KOMPONEN PROTECTED ROUTE YANG MENDUKUNG GRANULAR PERMISSIONS
const ProtectedRoute = ({ allowedRoles, requiredPermission }) => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  // Jika halaman dibatasi khusus admin (seperti User Management) dan user bukan admin -> tendang
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/calendar" replace />;
  }

  // Jika halaman butuh izin spesifik (misal: 'roster_payroll' atau 'profit_loss')
  if (requiredPermission && user.role !== 'admin') {
    const permissions = user.visible_pages || [];
    // Jika manager tidak punya izin ke halaman tersebut -> tendang ke /calendar
    if (!permissions.includes(requiredPermission)) {
      return <Navigate to="/calendar" replace />;
    }
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
            
            {/* USER MANAGEMENT: Hanya untuk Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/users" element={<UserManagementPage />} />
            </Route>

            {/* PAYROLL / ROSTER: Admin atau Manager yang memiliki izin 'roster_payroll' */}
            <Route element={<ProtectedRoute requiredPermission="roster_payroll" />}>
              <Route path="/" element={<PayrollPage />} />
            </Route>

            {/* SHARED / PERMISSION-BASED ROUTES (Admin & Manager dengan izin masing-masing) */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
              <Route path="/calendar" element={<CalendarPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="employees" />}>
              <Route path="/employees" element={<EmployeePage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="suppliers" />}>
              <Route path="/supplier" element={<SupplierPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="purchases" />}>
              <Route path="/purchase" element={<PurchasePage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="profit_loss" />}>
              <Route path="/pl" element={<ProfitLossPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="operational_costs" />}>
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