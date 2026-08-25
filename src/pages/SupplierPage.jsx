import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SupplierPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Meat');
  
  const [activeModal, setActiveModal] = useState(null); // 'add', 'edit', or null
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  
  const [itemToDelete, setItemToDelete] = useState(null); 

  // DIHAPUS: price_per_item dari initial form
  const initialForm = { category: 'Meat', item_name: '', measurement: '', price: '', supplier_name: '' };
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  const categories = ['Meat', 'Seafood', 'Vege', 'Dairy', 'Dry Store', 'Frozen', 'Bread & Pastry', 'Chemical & Packaging', 'Alcohol', 'Beverage', 'Stall'];

  const fetchItems = () => {
    setLoading(true);
    api.get('/supplier-items').then(res => {
      setItems(res.data.data);
      setLoading(false);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to load catalog.' });
      setLoading(false);
    });
  };

  useEffect(() => { fetchItems(); }, []);

  const handleOpenAdd = () => {
    setFormData({ ...initialForm, category: activeCategory });
    setActiveModal('add');
    setFeedback({ type: '', text: '' });
  };

  const handleOpenEdit = (item) => {
    setFormData(item);
    setEditId(item.id);
    setActiveModal('edit');
    setFeedback({ type: '', text: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    
    if (activeModal === 'add') {
      api.post('/supplier-items', formData).then(() => {
        setFeedback({ type: 'success', text: 'Item successfully added!' });
        fetchItems();
        setTimeout(() => setActiveModal(null), 1000);
      }).catch(() => setFeedback({ type: 'error', text: 'Failed to save item.' }));
    } else {
      api.put(`/supplier-items/${editId}`, formData).then(() => {
        setFeedback({ type: 'success', text: 'Item data updated!' });
        fetchItems();
        setTimeout(() => setActiveModal(null), 1000);
      }).catch(() => setFeedback({ type: 'error', text: 'Failed to update item.' }));
    }
  };

  const handleDeleteClick = (id, name) => {
    setItemToDelete({ id, name });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    api.delete(`/supplier-items/${itemToDelete.id}`).then(() => {
      fetchItems();
      setItemToDelete(null); 
    }).catch(() => {
      alert('Gagal menghapus item.');
      setItemToDelete(null);
    });
  };

  const filteredItems = items.filter(item => item.category === activeCategory);

  return (
    <div>
      <h1 style={{ margin: '0 0 10px 0', lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '10px' }}>
        🍅 Supplier Catalog & Prices
      </h1>
      <p style={{ margin: '0 0 20px 0', color: '#666' }}>
        Master Database (Price List) for P&L calculations.
      </p>

      {/* CATEGORY TABS */}
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '10px' }}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            style={{ 
              padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap',
              border: 'none', background: activeCategory === cat ? '#0d47a1' : '#e2e8f0', color: activeCategory === cat ? '#fff' : '#475569'
            }}>
            {cat}
          </button>
        ))}
      </div>

      <button onClick={handleOpenAdd} style={{ padding: '10px 15px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>
        + Add New Item
      </button>

      {/* ITEM TABLE */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflowX: 'auto' }}>
        {loading ? <p style={{ padding: '20px' }}>Loading data...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '12px' }}>Item Name</th>
                <th style={{ padding: '12px' }}>Measurement (UOM)</th>
                <th style={{ padding: '12px' }}>Price ($)</th>
                <th style={{ padding: '12px' }}>Supplier</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                // DIUBAH: colSpan jadi 5 karena 1 kolom dihapus
                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Empty. Please add items in the {activeCategory} category.</td></tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>{item.measurement || '-'}</td>
                    <td style={{ padding: '12px', color: '#d97706', fontWeight: 'bold' }}>${parseFloat(item.price).toFixed(2)}</td>
                    <td style={{ padding: '12px' }}>{item.supplier_name || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => handleOpenEdit(item)} style={{ marginRight: '8px', padding: '5px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDeleteClick(item.id, item.item_name)} style={{ padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* FORM MODAL (ADD/EDIT) */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{activeModal === 'add' ? 'Add Item' : 'Edit Item'}</h3>
            
            {feedback.text && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828', borderRadius: '4px' }}>{feedback.text}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '8px', width: '100%' }}>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Item Name</label><input type="text" value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} placeholder="e.g., Chicken Bone" /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Measurement (UOM)</label><input type="text" value={formData.measurement} onChange={e => setFormData({...formData, measurement: e.target.value})} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} placeholder="e.g., 1kg, 1dozen" /></div>
              
              {/* DIUBAH: Input Price dibuat berdiri sendiri (tanpa Price/Item) */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Price ($)</label>
                <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} />
              </div>
              
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Supplier Name</label><input type="text" value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} placeholder="e.g., B&E, Foodlink" /></div>
              
              <button type="submit" style={{ padding: '10px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', marginTop: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI DELETE */}
      {itemToDelete && (
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
              Are you sure you want to delete <strong>"{itemToDelete.name}"</strong> from the catalog?
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => setItemToDelete(null)} 
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