import { useState, useEffect } from 'react';
import api from '../utils/api';

const AVAILABLE_PAGES = [
  { id: 'profit_loss', label: '📊 View Profit & Loss (P&L)' },
  { id: 'employees', label: '👥 View Employee Master Data' },
  { id: 'suppliers', label: '📦 View Supplier Catalogue' },
  { id: 'purchases', label: '🛒 Purchases / COGS' },
  { id: 'operational_costs', label: '⚡ Operational Costs' },
  { id: 'calendar', label: '📅 View Schedule' },
  { id: 'operational_notes', label: '📋 View Operational Notes' },
  
  // -- GRUP PAYROLL & ROSTER --
  { id: 'roster_payroll', label: '📅 VIEW: Roster & Payroll Page' },
  { id: 'act_add_staff', label: 'ㅤ ↳ ACTION: Add New Employee' },
  { id: 'act_edit_rate', label: 'ㅤ ↳ ACTION: Update Staff Rates' },
  { id: 'act_input_shift', label: 'ㅤ ↳ ACTION: Input Shift Roster' },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'manager', store_id: '',
    visible_pages: [] 
  });

  const [newStoreName, setNewStoreName] = useState('');
  const [editingStoreId, setEditingStoreId] = useState(null);
  const [editStoreName, setEditStoreName] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, storesRes] = await Promise.all([
        api.get('/users'),
        api.get('/stores')
      ]);
      setUsers(usersRes.data.data || []);
      setStores(storesRes.data.data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to load user management data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ----------------------------------------------------
  // USER HANDLERS
  // ----------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (pageId) => {
    setFormData(prev => {
      const currentPages = prev.visible_pages || [];
      if (currentPages.includes(pageId)) {
        return { ...prev, visible_pages: currentPages.filter(id => id !== pageId) }; 
      } else {
        return { ...prev, visible_pages: [...currentPages, pageId] }; 
      }
    });
  };

  const handleEditUserClick = (user) => {
    setEditingUserId(user.id);
    
    // PERBAIKAN UTAMA: Parsing data visible_pages dengan aman (baik format string JSON maupun array)
    let parsedPages = [];
    if (user.visible_pages) {
      if (typeof user.visible_pages === 'string') {
        try { 
          parsedPages = JSON.parse(user.visible_pages); 
        } catch(e) { 
          parsedPages = []; 
        }
      } else if (Array.isArray(user.visible_pages)) {
        parsedPages = user.visible_pages;
      }
    }

    setFormData({
      name: user.name,
      email: user.email,
      password: '', 
      role: user.role,
      store_id: user.store_id || '',
      visible_pages: parsedPages
    });
    setFeedback({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setFormData({ name: '', email: '', password: '', role: 'manager', store_id: '', visible_pages: [] });
    setFeedback({ type: '', text: '' });
  };

  const handleSubmitUser = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    if (formData.role === 'manager') {
      if (!formData.store_id) {
        setFeedback({ type: 'error', text: 'Please assign a branch for the manager.' });
        return;
      }
      if (formData.visible_pages.length === 0) {
        setFeedback({ type: 'error', text: 'Please select at least one page for the manager to access.' });
        return;
      }
    }

    setIsSaving(true);

    const apiCall = editingUserId 
      ? api.put(`/users/${editingUserId}`, formData) 
      : api.post('/users', formData);                

    apiCall
      .then(res => {
        setFeedback({ type: 'success', text: res.data.message });
        setEditingUserId(null);
        setFormData({ name: '', email: '', password: '', role: 'manager', store_id: '', visible_pages: [] });
        fetchData();
      })
      .catch(err => {
        const errorMsg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Failed to process user data.';
        setFeedback({ type: 'error', text: errorMsg });
      })
      .finally(() => setIsSaving(false));
  };

  const handleDeleteUser = (id) => {
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    setIsSaving(true);
    api.delete(`/users/${id}`)
      .then(res => {
        setFeedback({ type: 'success', text: res.data.message });
        fetchData();
      })
      .catch(err => setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' }))
      .finally(() => setIsSaving(false));
  };

  // ----------------------------------------------------
  // STORE HANDLERS
  // ----------------------------------------------------
  const handleCreateStore = (e) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    setIsSaving(true);
    api.post('/stores', { name: newStoreName }).then(() => {
      setNewStoreName(''); fetchData();
    }).finally(() => setIsSaving(false));
  };

  const handleEditStoreClick = (store) => {
    setEditingStoreId(store.id); setEditStoreName(store.name);
  };

  const handleCancelEditStore = () => {
    setEditingStoreId(null);
    setEditStoreName('');
  };

  const handleSaveEditStore = (id) => {
    if (!editStoreName.trim()) return;
    setIsSaving(true);
    api.put(`/stores/${id}`, { name: editStoreName }).then(() => {
      setEditingStoreId(null);
      if (String(id) === localStorage.getItem('active_store_id')) window.location.reload();
      else fetchData();
    }).finally(() => setIsSaving(false));
  };

  const handleDeleteStore = (id) => {
    if (!window.confirm('⚠️ WARNING: Are you sure you want to delete this branch? All users and data tied to this branch might be affected!')) return;
    
    setIsSaving(true);
    api.delete(`/stores/${id}`)
      .then(res => {
        setFeedback({ type: 'success', text: res.data.message || 'Branch deleted successfully.' });
        fetchData();
      })
      .catch(err => setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to delete branch.' }))
      .finally(() => setIsSaving(false));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '30px', color: '#0f172a' }}>👤 User & Branch Management</h1>
      <p style={{ color: '#64748b', marginBottom: '25px' }}>
        Create and manage administrative accounts and restaurant branches.
      </p>

      {feedback.text && (
        <div style={{ padding: '12px 15px', marginBottom: '20px', borderRadius: '6px', fontWeight: 'bold', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828', border: `1px solid ${feedback.type === 'success' ? '#a5d6a7' : '#ef9a9a'}` }}>
          {feedback.text}
        </div>
      )}

      {/* CREATE / EDIT USER FORM CONTAINER */}
      <div style={{ background: editingUserId ? '#fffbeb' : '#fff', padding: '25px', borderRadius: '8px', border: `1px solid ${editingUserId ? '#fcd34d' : '#e2e8f0'}`, marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: editingUserId ? '#d97706' : '#1e293b' }}>
            {editingUserId ? '✎ Edit User Account & Permissions' : '+ Add New User Account'}
          </h3>
          {editingUserId && (
            <button onClick={handleCancelEditUser} disabled={isSaving} style={{ padding: '6px 12px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              ✖ Cancel Edit
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmitUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'flex-start' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={isSaving} required placeholder="John Doe" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={isSaving} required placeholder="user@resto.com" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Password</label>
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleInputChange} 
              disabled={isSaving} 
              required={!editingUserId} 
              placeholder={editingUserId ? "Leave blank to keep current" : "Min. 6 characters"} 
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Role</label>
            <select name="role" value={formData.role} onChange={handleInputChange} disabled={isSaving} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }}>
              <option value="manager">Branch Manager</option>
              <option value="admin">Super Admin</option>
            </select>
          </div>

          {/* KOTAK AKSES KHUSUS MANAGER */}
          {formData.role === 'manager' && (
            <div style={{ gridColumn: '1 / -1', background: editingUserId ? '#fff' : '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                
                {/* Pilih Toko */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a', display: 'block', marginBottom: '10px' }}>1. Assign Branch</label>
                  <select name="store_id" value={formData.store_id} onChange={handleInputChange} disabled={isSaving} required style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }}>
                    <option value="">-- Select Branch --</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                {/* Pilih Menu Akses */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0f172a', display: 'block', marginBottom: '10px' }}>2. Page Access Permissions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {AVAILABLE_PAGES.map(page => (
                      <label key={page.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={formData.visible_pages.includes(page.id)}
                          onChange={() => handleCheckboxChange(page.id)}
                          disabled={isSaving}
                          style={{ marginRight: '8px' }}
                        />
                        {page.label}
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" disabled={isSaving} style={{ padding: '12px 30px', background: isSaving ? '#94a3b8' : (editingUserId ? '#f59e0b' : '#2563eb'), color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              {isSaving ? 'Processing...' : (editingUserId ? 'Update Account' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
        {/* USERS LIST TABLE */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: 0, padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
            Registered System Users
          </h3>
          
          {loading ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading users...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Name</th>
                    <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Role & Branch</th>
                    <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Page Access</th>
                    <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No users found.</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: editingUserId === u.id ? '#fffbeb' : '#fff' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{u.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ display: 'inline-block', marginBottom: '5px', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: u.role === 'admin' ? '#dbeafe' : '#fef3c7', color: u.role === 'admin' ? '#1e40af' : '#92400e' }}>
                            {u.role.toUpperCase()}
                          </span>
                          <div style={{ color: '#475569', fontSize: '0.85rem' }}>
                            {u.role === 'admin' ? <em style={{ color: '#94a3b8' }}>All Stores</em> : (u.store?.name || `Store ID: ${u.store_id}`)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px', color: '#475569', fontSize: '0.85rem' }}>
                          {/* LOGIKA TAMPILAN PAGE ACCESS RINGKAS */}
                          {u.role === 'admin' ? (
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>All Pages Allowed</span>
                          ) : (
                            (() => {
                              let pages = [];
                              if (u.visible_pages) {
                                if (typeof u.visible_pages === 'string') {
                                  try { pages = JSON.parse(u.visible_pages); } catch(e) {}
                                } else if (Array.isArray(u.visible_pages)) {
                                  pages = u.visible_pages;
                                }
                              }

                              if (pages.length === 0) {
                                return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>No Access</span>;
                              }
                              
                              if (pages.length === AVAILABLE_PAGES.length) {
                                return <span style={{ color: '#10b981', fontWeight: 'bold' }}>Full Access</span>;
                              }

                              return (
                                <div>
                                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Limited Access</span>
                                  <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#64748b' }}>
                                    ({pages.length} features enabled)
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleEditUserClick(u)} 
                              disabled={isSaving} 
                              style={{ padding: '6px 12px', background: isSaving ? '#f1f5f9' : '#fef3c7', color: isSaving ? '#94a3b8' : '#d97706', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)} 
                              disabled={isSaving} 
                              style={{ padding: '6px 12px', background: isSaving ? '#f1f5f9' : '#fee2e2', color: isSaving ? '#94a3b8' : '#b91c1c', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* STORES / BRANCHES MANAGEMENT */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: 0, padding: '15px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Branch List</span>
          </h3>
          
          <form onSubmit={handleCreateStore} style={{ display: 'flex', gap: '10px', padding: '15px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            <input 
              type="text" placeholder="New branch name..." value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} disabled={isSaving} required 
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
            />
            <button type="submit" disabled={isSaving} style={{ padding: '8px 15px', background: isSaving ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              Add
            </button>
          </form>

          {loading ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading stores...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#fff', color: '#475569', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', width: '50px', textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Branch Name</th>
                  <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No branches found.</td>
                  </tr>
                ) : (
                  stores.map((store, index) => (
                    <tr key={store.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 20px', color: '#64748b', fontWeight: 'bold', textAlign: 'center' }}>{index + 1}</td>
                      <td style={{ padding: '12px 20px' }}>
                        {editingStoreId === store.id ? (
                          <input type="text" value={editStoreName} onChange={(e) => setEditStoreName(e.target.value)} disabled={isSaving} autoFocus style={{ width: '100%', padding: '6px', border: '1px solid #3b82f6', borderRadius: '4px' }} />
                        ) : (
                          <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{store.name}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        {editingStoreId === store.id ? (
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button onClick={() => handleSaveEditStore(store.id)} disabled={isSaving} style={{ padding: '6px 10px', background: isSaving ? '#94a3b8' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Save</button>
                            <button onClick={handleCancelEditStore} disabled={isSaving} style={{ padding: '6px 10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button onClick={() => handleEditStoreClick(store)} disabled={isSaving} style={{ padding: '6px 12px', background: isSaving ? '#e2e8f0' : '#f59e0b', color: isSaving ? '#94a3b8' : '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                              Edit
                            </button>
                            <button onClick={() => handleDeleteStore(store.id)} disabled={isSaving} style={{ padding: '6px 12px', background: isSaving ? '#f1f5f9' : '#fee2e2', color: isSaving ? '#94a3b8' : '#b91c1c', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}