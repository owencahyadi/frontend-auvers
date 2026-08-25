import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function OperationalCostPage() {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // STATE FOR WEEK SELECTION
  const [weekStart, setWeekStart] = useState('2026-06-22');

  // STATE FORM INPUT
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    amount: ''
  });

  const [feedback, setFeedback] = useState({ type: '', text: '' });
  
  // STATE BARU KHUSUS UNTUK MODAL DELETE
  const [costToDelete, setCostToDelete] = useState(null);

  const fetchCosts = () => {
    setLoading(true);
    api.get('/operational-costs').then(res => {
      setCosts(res.data.data);
      setLoading(false);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to load operational cost data.' });
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    api.post('/operational-costs', formData).then(() => {
      setFeedback({ type: 'success', text: 'Operational cost recorded successfully!' });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        name: '',
        amount: ''
      });
      fetchCosts();
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to save operational cost.' });
    });
  };

  // FUNGSI UNTUK MEMUNCULKAN MODAL DELETE
  const handleDeleteClick = (id, name) => {
    setCostToDelete({ id, name });
  };

  // FUNGSI UNTUK MENGEKSEKUSI PENGHAPUSAN (SETELAH KLIK 'YA')
  const confirmDelete = () => {
    if (!costToDelete) return;

    api.delete(`/operational-costs/${costToDelete.id}`).then(() => {
      setFeedback({ type: 'success', text: 'Expense record successfully deleted.' });
      fetchCosts();
      setCostToDelete(null); // Tutup modal setelah berhasil
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to delete expense record.' });
      setCostToDelete(null); // Tutup modal jika gagal
    });
  };

  // --- WEEKLY FILTERING LOGIC ---
  const calculateEndDate = (startStr) => {
    if (!startStr) return '';
    const [y, m, d] = startStr.split('-');
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 6);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const weekEnd = calculateEndDate(weekStart);

  // Filter costs strictly for the selected week range
  const filteredCosts = costs.filter(c => {
    return c.date >= weekStart && c.date <= weekEnd;
  });

  // Calculate total expenses ONLY for the filtered week
  const totalOpEx = filteredCosts.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  return (
    <div>
      <h1 style={{ margin: '0 0 10px 0', lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '10px' }}>
        ⚡ Operational Costs (OpEx)
      </h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        Record restaurant operational expenses such as electricity, water, rent, internet, etc.
      </p>

      {/* WEEK FILTER CONTROL */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Select Week Start (Monday):</label>
        <input 
          type="date" 
          value={weekStart} 
          onChange={e => setWeekStart(e.target.value)} 
          style={{ padding: '6px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }} 
        />
        <div style={{ background: '#e0f2fe', padding: '6px 12px', borderRadius: '4px', color: '#0369a1', fontSize: '0.9rem', fontWeight: 'bold' }}>
          Displaying: {weekStart} to {weekEnd}
        </div>
      </div>

      {feedback.text && (
        <div style={{ padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828' }}>
          {feedback.text}
        </div>
      )}

      {/* FORM CARD & TOTAL */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginBottom: '30px' }}>
        
        {/* INPUT FORM */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0d47a1' }}>+ Add Operational Cost</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Expense Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g., Store Electricity, Rent, Internet" style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Amount ($)</label>
              <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required placeholder="0.00" style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '10px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>
              Save Expense
            </button>
          </form>
        </div>

        {/* SUMMARY BOX (UPDATED) */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Total OpEx</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '5px' }}>
            $ {totalOpEx.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#e65100', fontWeight: 'bold' }}>
            Total for the selected week
          </p>
        </div>

      </div>

      {/* HISTORY TABLE (UPDATED TO SHOW FILTERED DATA) */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflowX: 'auto', padding: '15px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Weekly Operational Cost History</h3>
        {loading ? <p>Loading data...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Expense Name</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Amount ($)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No operational cost records found for this week.</td></tr>
              ) : (
                filteredCosts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{c.date}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{c.name}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#d97706' }}>${parseFloat(c.amount).toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {/* UBAH TOMBOL DELETE DI SINI */}
                      <button onClick={() => handleDeleteClick(c.id, c.name)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL KONFIRMASI DELETE */}
      {costToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', 
          zIndex: 1000, 
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#fff', padding: '30px', borderRadius: '12px',
            width: '100%', maxWidth: '350px', textAlign: 'center', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.2rem' }}>Confirm Deletion</h3>
            <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.95rem' }}>
              Are you sure you want to delete the expense record for <strong>"{costToDelete.name}"</strong>?
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => setCostToDelete(null)} 
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}