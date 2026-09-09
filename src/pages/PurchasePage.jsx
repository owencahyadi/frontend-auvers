import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function PurchasePage() {
  const [purchases, setPurchases] = useState([]);
  const [supplierItems, setSupplierItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // 1. STATE UNTUK WEEK START (Otomatis Senin minggu ini & tersimpan di memori)
  const [weekStart, setWeekStart] = useState(() => {
    const savedDate = localStorage.getItem('purchase_week_start');
    if (savedDate) return savedDate;

    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const date = String(monday.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${date}`;
  });

  useEffect(() => {
    localStorage.setItem('purchase_week_start', weekStart);
  }, [weekStart]);

  // INPUT FORM STATE
  const [purchaseData, setPurchaseData] = useState({
    purchase_date: new Date().toISOString().split('T')[0], 
    supplier_item_id: '',
    quantity: '',
    new_price: '' 
  });

  // STATE BARU: Untuk melacak Kategori yang sedang dipilih di form
  const [selectedFormCategory, setSelectedFormCategory] = useState('');

  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);

  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [priceWarningData, setPriceWarningData] = useState({ itemName: '', oldUnit: 0, newUnit: 0 });

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

  const handleInitialSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    if (purchaseData.new_price && purchaseData.quantity) {
      const selectedItem = supplierItems.find(i => i.id == purchaseData.supplier_item_id);
      
      if (selectedItem) {
        const oldUnitPrice = parseFloat(selectedItem.price);
        const newUnitPrice = parseFloat(purchaseData.new_price) / parseFloat(purchaseData.quantity);

        if (Math.abs(oldUnitPrice - newUnitPrice) > 0.01) {
          setPriceWarningData({
            itemName: selectedItem.item_name,
            oldUnit: oldUnitPrice,
            newUnit: newUnitPrice
          });
          setShowPriceWarning(true);
          return; 
        }
      }
    }

    executePurchase();
  };

  const executePurchase = () => {
    setIsSaving(true);
    setShowPriceWarning(false); 

    api.post('/purchases', purchaseData).then((res) => {
      setFeedback({ type: 'success', text: res.data.message || 'Purchase record saved successfully!' });
      
      // Reset input form, tapi biarkan Kategori dan Tanggal tetap sama untuk kemudahan input berturut-turut
      setPurchaseData({
        ...purchaseData,
        supplier_item_id: '',
        quantity: '',
        new_price: '' 
      });
      fetchData();
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to save purchase transaction.' });
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const handleDeleteClick = (id, itemName) => {
    setPurchaseToDelete({ id, itemName });
  };

  const confirmDelete = () => {
    if (!purchaseToDelete) return;
    setIsSaving(true);

    api.delete(`/purchases/${purchaseToDelete.id}`).then(() => {
      setFeedback({ type: 'success', text: 'Purchase record deleted.' });
      fetchData();
      setPurchaseToDelete(null); 
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to delete purchase record.' });
      setPurchaseToDelete(null); 
    }).finally(() => setIsSaving(false));
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

  // LOGIKA DROPDOWN DINAMIS
  const uniqueCategories = [...new Set(supplierItems.map(item => item.category))].sort();
  const availableItemsInSelectedCategory = supplierItems.filter(item => item.category === selectedFormCategory);

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
          disabled={loading || isSaving}
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
          <form onSubmit={handleInitialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Purchase Date</label>
              <input type="date" value={purchaseData.purchase_date} onChange={e => setPurchaseData({...purchaseData, purchase_date: e.target.value})} disabled={isSaving} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
            </div>
            
            {/* DUAL DROPDOWN (KATEGORI -> BARANG) */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0f172a' }}>1. Filter by Category</label>
                <select 
                  value={selectedFormCategory} 
                  onChange={e => {
                    setSelectedFormCategory(e.target.value);
                    setPurchaseData({...purchaseData, supplier_item_id: ''}); // Wajib reset item_id jika kategori diubah
                  }} 
                  disabled={isSaving} 
                  required 
                  style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: isSaving ? '#f1f5f9' : '#fff', border: '1px solid #94a3b8' }}
                >
                  <option value="">-- Category --</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0f172a' }}>2. Select Item</label>
                <select 
                  value={purchaseData.supplier_item_id} 
                  onChange={e => setPurchaseData({...purchaseData, supplier_item_id: e.target.value})} 
                  disabled={isSaving || !selectedFormCategory} // Disable jika belum pilih kategori
                  required 
                  style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: (isSaving || !selectedFormCategory) ? '#f1f5f9' : '#fff', border: '1px solid #94a3b8' }}
                >
                  <option value="">-- Select Item --</option>
                  {availableItemsInSelectedCategory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} ({item.measurement}) - ${parseFloat(item.price).toFixed(2)}/unit
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Quantity (Qty)</label>
                <input type="number" step="0.01" value={purchaseData.quantity} onChange={e => setPurchaseData({...purchaseData, quantity: e.target.value})} disabled={isSaving} required placeholder="e.g. 5" style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
              </div>
              
              <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                  Total Bill ($) - <span style={{ color: '#e65100', fontWeight: 'normal' }}>Optional</span>
                </label>
                <input type="number" step="0.01" value={purchaseData.new_price} onChange={e => setPurchaseData({...purchaseData, new_price: e.target.value})} disabled={isSaving} placeholder="Input total bill to update catalog" style={{ padding: '8px', width: '100%', boxSizing: 'border-box', border: '1px solid #ffcc80', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
              </div>
            </div>
            <p style={{ margin: '0', fontSize: '0.75rem', color: '#64748b' }}>*If the "Total Bill" field is filled, the unit price in the Supplier Catalog will be updated automatically (Total Bill ÷ Qty).</p>

            <button type="submit" disabled={isSaving || !purchaseData.supplier_item_id} style={{ padding: '12px', background: (isSaving || !purchaseData.supplier_item_id) ? '#94a3b8' : '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: (isSaving || !purchaseData.supplier_item_id) ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '5px' }}>
              {isSaving ? 'Processing...' : 'Save Transaction'}
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
                      <button onClick={() => handleDeleteClick(p.id, p.supplier_item?.item_name)} disabled={isSaving} style={{ padding: '4px 8px', background: isSaving ? '#f1f5f9' : '#ef4444', color: isSaving ? '#94a3b8' : '#fff', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* --- PRICE WARNING MODAL --- */}
      {showPriceWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', 
          zIndex: 1000, 
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#fff', padding: '30px', borderRadius: '12px',
            width: '100%', maxWidth: '400px', textAlign: 'center', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: '#e65100', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              ⚠️ Unit Price Change Detected
            </h3>
            <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '15px' }}>
              Based on your input, the new unit price for <strong>{priceWarningData.itemName}</strong> is different from the current catalog.
            </p>
            
            <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-around', border: '1px solid #ffcc80' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 'bold' }}>Current Catalog Price</div>
                <div style={{ fontSize: '1.2rem', color: '#b45309', fontWeight: 'bold' }}>${priceWarningData.oldUnit.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: '1.5rem', color: '#fb923c' }}>→</div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>New Unit Price</div>
                <div style={{ fontSize: '1.2rem', color: '#15803d', fontWeight: 'bold' }}>${priceWarningData.newUnit.toFixed(2)}</div>
              </div>
            </div>

            <p style={{ color: '#0f172a', fontSize: '0.9rem', marginBottom: '25px', fontWeight: 'bold' }}>
              Are you sure you want to save this transaction and permanently update the catalog?
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowPriceWarning(false)} 
                disabled={isSaving}
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                No, Let Me Fix It
              </button>
              <button 
                onClick={executePurchase} 
                disabled={isSaving}
                style={{ flex: 1, padding: '10px', background: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Yes, Update Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
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
                disabled={isSaving}
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={isSaving}
                style={{ flex: 1, padding: '10px', background: isSaving ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isSaving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}