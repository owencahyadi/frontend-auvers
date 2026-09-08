import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  
  // State untuk disable button saat proses berjalan
  const [isSaving, setIsSaving] = useState(false);

  // State untuk form user
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'manager', store_id: ''
  });

  // State untuk form tambah toko baru
  const [newStoreName, setNewStoreName] = useState('');

  // State untuk mode edit nama toko (inline edit)
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
      console.error('Failed to fetch data:', err);
      setFeedback({ type: 'error', text: 'Failed to load user management data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----------------------------------------------------
  // USER HANDLERS
  // ----------------------------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    if (formData.role === 'manager' && !formData.store_id) {
      setFeedback({ type: 'error', text: 'Please assign a store for the manager.' });
      return;
    }

    setIsSaving(true);
    api.post('/users', formData)
      .then(res => {
        setFeedback({ type: 'success', text: res.data.message });
        setFormData({ name: '', email: '', password: '', role: 'manager', store_id: '' });
        fetchData();
      })
      .catch(err => {
        const errorMsg = err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Failed to create user.';
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
      .catch(err => {
        setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to delete user.' });
      })
      .finally(() => setIsSaving(false));
  };

  // ----------------------------------------------------
  // STORE / BRANCH HANDLERS
  // ----------------------------------------------------
  const handleCreateStore = (e) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    setFeedback({ type: '', text: '' });
    setIsSaving(true);

    api.post('/stores', { name: newStoreName })
      .then(res => {
        setFeedback({ type: 'success', text: res.data.message || 'Branch added successfully!' });
        setNewStoreName('');
        fetchData();
      })
      .catch(() => setFeedback({ type: 'error', text: 'Failed to add new branch.' }))
      .finally(() => setIsSaving(false));
  };

  const handleEditStoreClick = (store) => {
    setEditingStoreId(store.id);
    setEditStoreName(store.name);
  };

  const handleCancelEditStore = () => {
    setEditingStoreId(null);
    setEditStoreName('');
  };

  const handleSaveEditStore = (id) => {
    if (!editStoreName.trim()) return;

    setFeedback({ type: '', text: '' });
    setIsSaving(true);

    api.put(`/stores/${id}`, { name: editStoreName })
      .then(res => {
        setFeedback({ type: 'success', text: res.data.message || 'Branch updated successfully!' });
        setEditingStoreId(null);
        fetchData();
      })
      .catch(() => setFeedback({ type: 'error', text: 'Failed to update branch name.' }))
      .finally(() => setIsSaving(false));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: '10px', color: '#0f172a' }}>👤 User & Branch Management</h1>
      <p style={{ color: '#64748b', marginBottom: '25px' }}>
        Create and manage administrative accounts and restaurant branches.
      </p>

      {feedback.text && (
        <div style={{ padding: '12px 15px', marginBottom: '20px', borderRadius: '6px', fontWeight: 'bold', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828', border: `1px solid ${feedback.type === 'success' ? '#a5d6a7' : '#ef9a9a'}` }}>
          {feedback.text}
        </div>
      )}

      {/* CREATE USER FORM CONTAINER */}
      <div style={{ background: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>+ Add New User Account</h3>
        
        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} disabled={isSaving} required placeholder="John Doe" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} disabled={isSaving} required placeholder="user@resto.com" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleInputChange} disabled={isSaving} required placeholder="Min. 6 characters" style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Role</label>
            <select name="role" value={formData.role} onChange={handleInputChange} disabled={isSaving} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }}>
              <option value="manager">Manager</option>
              <option value="admin">Super Admin</option>
            </select>
          </div>

          {formData.role === 'manager' && (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '5px' }}>Assigned Branch</label>
              <select name="store_id" value={formData.store_id} onChange={handleInputChange} disabled={isSaving} required style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }}>
                <option value="">-- Select Store --</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" disabled={isSaving} style={{ width: '100%', padding: '11px', background: isSaving ? '#94a3b8' : '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              {isSaving ? 'Creating...' : 'Create Account'}
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
                    <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Role</th>
                    <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>Assigned Branch</th>
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
                      <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{u.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: u.role === 'admin' ? '#dbeafe' : '#fef3c7', color: u.role === 'admin' ? '#1e40af' : '#92400e' }}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px', color: '#475569', fontSize: '0.9rem' }}>
                          {u.role === 'admin' ? <em style={{ color: '#94a3b8' }}>All Stores</em> : (u.store?.name || `Store ID: ${u.store_id}`)}
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <button onClick={() => handleDeleteUser(u.id)} disabled={isSaving} style={{ padding: '6px 12px', background: isSaving ? '#f1f5f9' : '#fee2e2', color: isSaving ? '#94a3b8' : '#b91c1c', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                            Delete
                          </button>
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
          
          {/* Tambah Cabang Baru */}
          <form onSubmit={handleCreateStore} style={{ display: 'flex', gap: '10px', padding: '15px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              placeholder="New branch name..." 
              value={newStoreName} 
              onChange={(e) => setNewStoreName(e.target.value)} 
              disabled={isSaving}
              required 
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
                  <th style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', width: '50px' }}>ID</th>
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
                  stores.map(store => (
                    <tr key={store.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 20px', color: '#64748b', fontWeight: 'bold' }}>#{store.id}</td>
                      <td style={{ padding: '12px 20px' }}>
                        {/* Jika sedang diedit, tampilkan Input text */}
                        {editingStoreId === store.id ? (
                          <input 
                            type="text" 
                            value={editStoreName} 
                            onChange={(e) => setEditStoreName(e.target.value)} 
                            disabled={isSaving}
                            autoFocus
                            style={{ width: '100%', padding: '6px', border: '1px solid #3b82f6', borderRadius: '4px' }} 
                          />
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
                          <button onClick={() => handleEditStoreClick(store)} disabled={isSaving} style={{ padding: '6px 15px', background: isSaving ? '#e2e8f0' : '#f59e0b', color: isSaving ? '#94a3b8' : '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                            Edit
                          </button>
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