import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SupplierPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Meat');
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [categories, setCategories] = useState([
    'Meat', 'Seafood', 'Vege', 'Dairy', 'Dry Store', 'Frozen', 
    'Bread & Pastry', 'Chemical & Packaging', 'Alcohol', 'Beverage', 'Stall'
  ]);
  
  // activeModal bisa bernilai: 'add', 'edit', 'add_category', 'edit_category', 'delete_category', atau null
  const [activeModal, setActiveModal] = useState(null); 
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [itemToDelete, setItemToDelete] = useState(null); 

  const [newCategoryName, setNewCategoryName] = useState('');
  const [renameCategoryName, setRenameCategoryName] = useState(''); // State khusus untuk Rename Kategori

  const initialForm = { category: 'Meat', item_name: '', measurement: '', price: '', supplier_name: '' };
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  const fetchItems = () => {
    setLoading(true);
    api.get('/supplier-items').then(res => {
      const fetchedItems = res.data.data;
      setItems(fetchedItems);

      const uniqueCats = [...new Set(fetchedItems.map(i => i.category))];
      setCategories(prev => {
        const combined = [...new Set([...prev, ...uniqueCats])];
        return combined;
      });

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

  // -------------------------------------------------------------------
  // HANDLERS UNTUK KATEGORI (ADD, RENAME, DELETE)
  // -------------------------------------------------------------------
  const handleAddCategorySubmit = (e) => {
    e.preventDefault();
    const formattedCat = newCategoryName.trim();
    if (!formattedCat) return;

    if (!categories.includes(formattedCat)) {
      setCategories(prev => [...prev, formattedCat]);
    }
    setActiveCategory(formattedCat); 
    setNewCategoryName('');
    setActiveModal(null);
  };

  const handleRenameCategorySubmit = (e) => {
    e.preventDefault();
    const formattedNewCat = renameCategoryName.trim();
    if (!formattedNewCat || formattedNewCat === activeCategory) return;

    setIsSaving(true);
    api.put('/supplier-categories', {
      old_name: activeCategory,
      new_name: formattedNewCat
    }).then(() => {
      setFeedback({ type: 'success', text: 'Category successfully renamed!' });
      
      // Update state lokal agar langsung berubah tanpa error
      setCategories(prev => prev.map(c => c === activeCategory ? formattedNewCat : c));
      setActiveCategory(formattedNewCat);
      
      fetchItems();
      setTimeout(() => setActiveModal(null), 1000);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to rename category.' });
    }).finally(() => setIsSaving(false));
  };

  const handleConfirmDeleteCategory = () => {
    setIsSaving(true);
    // Endpoint delete URL perlu encodeURIComponent karena namanya bisa mengandung spasi (misal: "Dry Store")
    api.delete(`/supplier-categories/${encodeURIComponent(activeCategory)}`).then(() => {
      setCategories(prev => prev.filter(c => c !== activeCategory));
      setActiveCategory('Meat'); // Reset ke kategori default pertama
      fetchItems();
      setActiveModal(null);
    }).catch(() => {
      alert('Failed to delete category.');
    }).finally(() => setIsSaving(false));
  };

  // -------------------------------------------------------------------
  // HANDLERS UNTUK ITEM
  // -------------------------------------------------------------------
  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    setIsSaving(true);
    
    if (activeModal === 'add') {
      api.post('/supplier-items', formData).then(() => {
        setFeedback({ type: 'success', text: 'Item successfully added!' });
        fetchItems();
        setTimeout(() => setActiveModal(null), 1000);
      }).catch(() => {
        setFeedback({ type: 'error', text: 'Failed to save item.' });
      }).finally(() => setIsSaving(false)); 
    } else if (activeModal === 'edit') {
      api.put(`/supplier-items/${editId}`, formData).then(() => {
        setFeedback({ type: 'success', text: 'Item data updated!' });
        fetchItems();
        setTimeout(() => setActiveModal(null), 1000);
      }).catch(() => {
        setFeedback({ type: 'error', text: 'Failed to update item.' });
      }).finally(() => setIsSaving(false)); 
    }
  };

  const handleDeleteClick = (id, name) => {
    setItemToDelete({ id, name });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setIsSaving(true); 
    
    api.delete(`/supplier-items/${itemToDelete.id}`).then(() => {
      fetchItems();
      setItemToDelete(null); 
    }).catch(() => {
      alert('Failed to delete item.');
      setItemToDelete(null);
    }).finally(() => setIsSaving(false)); 
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
      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '10px', alignItems: 'center' }}>
        {categories.map(cat => (
          <button 
            key={cat} 
            disabled={loading || isSaving}
            onClick={() => setActiveCategory(cat)}
            style={{ 
              padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              border: 'none', background: activeCategory === cat ? '#0d47a1' : '#e2e8f0', color: activeCategory === cat ? '#fff' : '#475569', opacity: (loading || isSaving) ? 0.7 : 1
            }}>
            {cat}
          </button>
        ))}
        
        {/* Tombol Add Kategori */}
        <button 
          disabled={loading || isSaving}
          onClick={() => { setActiveModal('add_category'); setNewCategoryName(''); setFeedback({type:'', text:''}); }}
          style={{ padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', border: '1px dashed #0d47a1', background: '#f8fafc', color: '#0d47a1', opacity: (loading || isSaving) ? 0.7 : 1 }}>
          + Add Category
        </button>
      </div>

      {/* ACTION BUTTONS UNTUK CATEGORY & ITEM */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <button disabled={loading || isSaving} onClick={handleOpenAdd} style={{ padding: '10px 15px', background: (loading || isSaving) ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
          + Add New Item
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            disabled={loading || isSaving}
            onClick={() => { setActiveModal('edit_category'); setRenameCategoryName(activeCategory); setFeedback({type:'', text:''}); }}
            style={{ padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', border: '1px solid #f59e0b', background: '#fffbeb', color: '#d97706', opacity: (loading || isSaving) ? 0.7 : 1 }}>
            ✏️ Rename "{activeCategory}"
          </button>
          
          <button 
            disabled={loading || isSaving}
            onClick={() => setActiveModal('delete_category')}
            style={{ padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', border: '1px solid #ef4444', background: '#fef2f2', color: '#b91c1c', opacity: (loading || isSaving) ? 0.7 : 1 }}>
            🗑️ Delete "{activeCategory}"
          </button>
        </div>
      </div>

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
                <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Empty. Please add items in the "{activeCategory}" category.</td></tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.item_name}</td>
                    <td style={{ padding: '12px' }}>{item.measurement || '-'}</td>
                    <td style={{ padding: '12px', color: '#d97706', fontWeight: 'bold' }}>${parseFloat(item.price).toFixed(2)}</td>
                    <td style={{ padding: '12px' }}>{item.supplier_name || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button disabled={isSaving} onClick={() => handleOpenEdit(item)} style={{ marginRight: '8px', padding: '5px 10px', background: isSaving ? '#fcd34d' : '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>Edit</button>
                      <button disabled={isSaving} onClick={() => handleDeleteClick(item.id, item.item_name)} style={{ padding: '5px 10px', background: isSaving ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================= */}
      {/* MODALS SECTION                            */}
      {/* ========================================= */}

      {/* 1. FORM MODAL (ADD / EDIT ITEM) */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button disabled={isSaving} onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: isSaving ? 'not-allowed' : 'pointer', color: isSaving ? '#94a3b8' : '#000' }}>✖</button>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{activeModal === 'add' ? 'Add Item' : 'Edit Item'}</h3>
            
            {feedback.text && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828', borderRadius: '4px' }}>{feedback.text}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Category</label>
                <select disabled={isSaving} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '8px', width: '100%', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }}>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Item Name</label><input type="text" disabled={isSaving} value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} placeholder="e.g., Chicken Bone" /></div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Measurement (UOM)</label><input type="text" disabled={isSaving} value={formData.measurement} onChange={e => setFormData({...formData, measurement: e.target.value})} style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} placeholder="e.g., 1kg, 1dozen" /></div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Price ($)</label>
                <input type="number" disabled={isSaving} step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} />
              </div>
              <div><label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Supplier Name</label><input type="text" disabled={isSaving} value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} style={{ padding: '8px', width: '100%', boxSizing: 'border-box', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} placeholder="e.g., B&E, Foodlink" /></div>
              
              <button type="submit" disabled={isSaving} style={{ padding: '10px', background: isSaving ? '#94a3b8' : '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', marginTop: '10px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL ADD CATEGORY */}
      {activeModal === 'add_category' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '350px', position: 'relative' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0f172a' }}>Add New Category</h3>
            
            <form onSubmit={handleAddCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Category Name</label>
                <input 
                  type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required autoFocus placeholder="e.g., Cleaning Supplies" 
                  style={{ padding: '10px', width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                />
              </div>
              <button type="submit" style={{ padding: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Add Category Tab
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL RENAME CATEGORY */}
      {activeModal === 'edit_category' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '350px', position: 'relative' }}>
            <button disabled={isSaving} onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}>✖</button>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#d97706' }}>Rename Category</h3>
            
            {feedback.text && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828', borderRadius: '4px' }}>{feedback.text}</div>}
            
            <form onSubmit={handleRenameCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>New Name for "{activeCategory}"</label>
                <input 
                  type="text" value={renameCategoryName} onChange={e => setRenameCategoryName(e.target.value)} required autoFocus disabled={isSaving}
                  style={{ padding: '10px', width: '100%', boxSizing: 'border-box', border: '1px solid #fcd34d', borderRadius: '6px', backgroundColor: isSaving ? '#f1f5f9' : '#fff' }} 
                />
              </div>
              <p style={{ margin: '0', fontSize: '0.8rem', color: '#64748b' }}>
                *This will update the category name for all <strong>{filteredItems.length} items</strong> inside it.
              </p>
              <button type="submit" disabled={isSaving || renameCategoryName === activeCategory} style={{ padding: '10px', background: (isSaving || renameCategoryName === activeCategory) ? '#fcd34d' : '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: (isSaving || renameCategoryName === activeCategory) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {isSaving ? 'Renaming...' : 'Rename Category'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL KONFIRMASI DELETE CATEGORY */}
      {activeModal === 'delete_category' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444', fontSize: '1.2rem' }}>⚠️ Delete Entire Category?</h3>
            <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.95rem' }}>
              Are you sure you want to delete the <strong>"{activeCategory}"</strong> category? <br/><br/>
              This will permanently delete <strong>{filteredItems.length} item(s)</strong> inside it!
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => setActiveModal(null)} 
                disabled={isSaving}
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDeleteCategory} 
                disabled={isSaving}
                style={{ flex: 1, padding: '10px', background: isSaving ? '#fca5a5' : '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                {isSaving ? 'Deleting...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL KONFIRMASI DELETE ITEM */}
      {itemToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', fontSize: '1.2rem' }}>Confirm Deletion</h3>
            <p style={{ color: '#64748b', marginBottom: '25px', fontSize: '0.95rem' }}>
              Are you sure you want to delete <strong>"{itemToDelete.name}"</strong> from the catalog?
            </p>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={() => setItemToDelete(null)} 
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