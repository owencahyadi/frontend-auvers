import { useState, useEffect, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../utils/api'; 
import { StoreContext } from '../context/StoreContext'; 
import './Sidebar.css';

export default function Sidebar() {
  const navigate = useNavigate();
  const { activeStoreId, setActiveStoreId } = useContext(StoreContext);
  const [stores, setStores] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // STATE BARU: Untuk melacak proses loading saat logout
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get user role and data from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager';
  
  // Ambil data permissions (hak akses halaman) dari array visible_pages
  const myPermissions = user.visible_pages || [];

  // Fetch store list from database (Only for Admin)
  useEffect(() => {
    if (isAdmin) {
      api.get('/stores')
        .then(res => setStores(res.data.data || []))
        .catch(err => console.error('Failed to fetch store list:', err));
    }
  }, [isAdmin]);

  const handleStoreChange = (e) => {
    setActiveStoreId(e.target.value);
    window.location.reload(); // Refresh to reload all data for the new store
  };

  const handleLogoutClick = () => setShowLogoutModal(true);
  const cancelLogout = () => {
    if (!isLoggingOut) setShowLogoutModal(false);
  };
  
  const confirmLogout = async () => {
    setIsLoggingOut(true); // Aktifkan status loading logout

    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('active_store_id'); 
      navigate('/login');
    }
  };

  return (
    <>
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <h2>F&B Master System</h2>
        
        {/* --- STORE SELECTOR FOR ADMIN --- */}
        {isAdmin && (
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #334155', marginBottom: '10px' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📍 Store Location
            </label>
            <select
              value={activeStoreId}
              onChange={handleStoreChange}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#1e293b', color: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
              disabled={stores.length === 0}
            >
              {stores.length === 0 ? (
                <option value="">Loading...</option>
              ) : (
                stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)
              )}
            </select>
          </div>
        )}
        
        {/* --- FIXED BRANCH LABEL FOR MANAGER --- */}
        {isManager && (
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #334155', marginBottom: '10px', color: '#cbd5e1', fontSize: '0.85rem' }}>
            📍 <strong>Branch: {user.store?.name || `Store ${user.store_id}`}</strong>
          </div>
        )}
        
        <nav style={{ flexGrow: 1 }}>
          {/* MENU KHUSUS SUPER ADMIN */}
          {isAdmin && (
            <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              👤 User Management
            </NavLink>
          )}
          
          {/* MENU DENGAN GRANULAR PERMISSIONS */}
          {(isAdmin || myPermissions.includes('roster_payroll')) && (
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              📊 Roster & Payroll
            </NavLink>
          )}

          <NavLink to="/calendar" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            📅 Schedule
          </NavLink>

          {(isAdmin || myPermissions.includes('employees')) && (
            <NavLink to="/employees" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              👥 Manage Employees
            </NavLink>
          )}

          {(isAdmin || myPermissions.includes('suppliers')) && (
            <NavLink to="/supplier" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              🍅 Supplier Catalogue
            </NavLink>
          )}

          {(isAdmin || myPermissions.includes('purchases')) && (
            <NavLink to="/purchase" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              🛒 Purchases
            </NavLink>
          )}

          {(isAdmin || myPermissions.includes('operational_costs')) && (
            <NavLink to="/operational-costs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              ⚡ Operational Costs
            </NavLink>
          )}

          {(isAdmin || myPermissions.includes('profit_loss')) && (
            <NavLink to="/pl" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              📊 P&L
            </NavLink>
          )}
        </nav>

        <div style={{ padding: '20px' }}>
          <button 
            onClick={handleLogoutClick} 
            style={{ width: '100%', padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* --- LOGOUT MODAL --- */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.2rem' }}>Confirm Logout</h3>
            <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.95rem' }}>Are you sure you want to log out of the system?</p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={cancelLogout} 
                disabled={isLoggingOut} 
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: isLoggingOut ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isLoggingOut ? 0.6 : 1 }}
              >
                Cancel
              </button>
              
              <button 
                onClick={confirmLogout} 
                disabled={isLoggingOut} 
                style={{ flex: 1, padding: '10px', background: isLoggingOut ? '#9ca3af' : '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: isLoggingOut ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}