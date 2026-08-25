import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function PurchasePage() {
  const [purchases, setPurchases] = useState([]);
  const [supplierItems, setSupplierItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // STATE FOR WEEK SELECTION
  const [weekStart, setWeekStart] = useState('2026-06-22');

  // INPUT FORM STATE
  const [purchaseData, setPurchaseData] = useState({
    purchase_date: new Date().toISOString().split('T')[0],
    supplier_item_id: '',
    quantity: '',
    new_price: '' // Will be used to store the custom Total Price
  });

  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/purchases'),
      api.get('/supplier-items')
    ]).then(([resPurchases, resItems]) => {
      setPurchases(resPurchases.data.data);
      setSupplierItems(resItems.data.data);
      setLoading(false);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to load purchase data.' });
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    api.post('/purchases', purchaseData).then((res) => {
      setFeedback({ type: 'success', text: res.data.message || 'Purchase record saved successfully!' });
      
      setPurchaseData({
        ...purchaseData,
        supplier_item_id: '',
        quantity: '',
        new_price: '' 
      });
      fetchData();
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to save purchase transaction.' });
    });
  };

  const handleDeleteClick = (id, itemName) => {
    setPurchaseToDelete({ id, itemName });
  };

  const confirmDelete = () => {
    if (!purchaseToDelete) return;

    api.delete(`/purchases/${purchaseToDelete.id}`).then(() => {
      setFeedback({ type: 'success', text: 'Purchase record deleted.' });
      fetchData();
      setPurchaseToDelete(null); 
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to delete purchase record.' });
      setPurchaseToDelete(null); 
    });
  };

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

  const filteredPurchases = purchases.filter(p => {
    return p.purchase_date >= weekStart && p.purchase_date <= weekEnd;
  });

  const totalExpense = filteredPurchases.reduce((sum, p) => sum + parseFloat(p.total_price), 0);

  return (
    <div>
      <h1 style={{ margin: '0 0 10px 0', lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🛒 Record Purchases & Expenses (COGS)
      </h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        Record daily invoices/purchases from suppliers. Total prices will be calculated automatically by the system.
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', marginBottom: '30px' }}>
        
        {/* INPUT FORM */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0d47a1' }}>+ Add Purchase Transaction</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Purchase Date</label>
              <input type="date" value={purchaseData.purchase_date} onChange={e => setPurchaseData({...purchaseData, purchase_date: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
            </div>
            
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Select Item (from Supplier Catalog)</label>
              <select value={purchaseData.supplier_item_id} onChange={e => setPurchaseData({...purchaseData, supplier_item_id: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}>
                <option value="">-- Select Item --</option>
                {supplierItems.map(item => (
                  <option key={item.id} value={item.id}>
                    [{item.category}] {item.item_name} ({item.measurement}) - ${item.price}/unit
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Quantity (Qty)</label>
                <input type="number" step="0.01" value={purchaseData.quantity} onChange={e => setPurchaseData({...purchaseData, quantity: e.target.value})} required placeholder="e.g. 5" style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
              </div>
              
              {/* UPDATED LABEL & PLACEHOLDER */}
              <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Total Bill ($) - <span style={{ color: '#e65100', fontWeight: 'normal' }}>Optional</span>
                </label>
                <input type="number" step="0.01" value={purchaseData.new_price} onChange={e => setPurchaseData({...purchaseData, new_price: e.target.value})} placeholder="Input total bill to update catalog" style={{ padding: '8px', width: '100%', boxSizing: 'border-box', border: '1px solid #ffcc80' }} />
              </div>
            </div>
            <p style={{ margin: '0', fontSize: '0.75rem', color: '#64748b' }}>*If the "Total Bill" field is filled, the unit price in the Supplier Catalog will be updated automatically (Total Bill ÷ Qty).</p>

            <button type="submit" style={{ padding: '10px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' }}>
              Save Transaction
            </button>
          </form>
        </div>

        {/* TOTAL SUMMARY BOX */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#64748b' }}>Total Purchase Expenses</h4>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '5px' }}>
            $ {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#e65100', fontWeight: 'bold' }}>
            Total for the selected week
          </p>
        </div>

      </div>

      {/* PURCHASE HISTORY TABLE */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflowX: 'auto', padding: '15px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Weekly Purchase History</h3>
        {loading ? <p>Loading data...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '10px' }}>Date</th>
                <th style={{ padding: '10px' }}>Category</th>
                <th style={{ padding: '10px' }}>Item Name</th>
                <th style={{ padding: '10px' }}>Supplier</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Total Price</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No purchase records found for this week.</td></tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px' }}>{p.purchase_date}</td>
                    <td style={{ padding: '10px' }}><span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{p.supplier_item?.category}</span></td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.supplier_item?.item_name}</td>
                    <td style={{ padding: '10px' }}>{p.supplier_item?.supplier_name || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{p.quantity} {p.supplier_item?.measurement}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#d97706' }}>${parseFloat(p.total_price).toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteClick(p.id, p.supplier_item?.item_name)} style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* DELETE MODAL */}
      {purchaseToDelete && (
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
              Are you sure you want to delete the purchase record for <strong>"{purchaseToDelete.itemName}"</strong>?
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => setPurchaseToDelete(null)} 
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