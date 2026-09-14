import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function FoodCostPage() {
  const [recipes, setRecipes] = useState([]);
  const [supplierItems, setSupplierItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const [activeTab, setActiveTab] = useState('base_prep'); // 'base_prep' atau 'final_menu'
  const [activeModal, setActiveModal] = useState(null); 
  const [recipeToDelete, setRecipeToDelete] = useState(null);

  // Form State untuk Add Recipe
  const initialForm = {
    name: '',
    type: 'base_prep',
    yield_qty: '',
    yield_unit: '',
    sold_price: '',
    ingredients: [
      { ingredient_type: 'raw_item', item_id: '', quantity: '' } // Baris pertama default
    ]
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/recipes'),
      api.get('/supplier-items')
    ]).then(([resRecipes, resItems]) => {
      setRecipes(resRecipes.data.data || []);
      setSupplierItems(resItems.data.data || []);
      setLoading(false);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to load data.' });
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  // --- LOGIKA FORM DINAMIS (INGREDIENTS) ---
  const handleAddIngredientRow = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_type: 'raw_item', item_id: '', quantity: '' }]
    }));
  };

  const handleRemoveIngredientRow = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    setFormData(prev => {
      const newIngredients = [...prev.ingredients];
      newIngredients[index][field] = value;
      // Reset item_id jika tipe diubah agar tidak nyangkut
      if (field === 'ingredient_type') newIngredients[index].item_id = '';
      return { ...prev, ingredients: newIngredients };
    });
  };

  // --- SUBMIT & DELETE ---
  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    // Validasi: Pastikan semua bahan terisi
    const hasEmptyIngredient = formData.ingredients.some(ing => !ing.item_id || !ing.quantity);
    if (hasEmptyIngredient) {
      setFeedback({ type: 'error', text: 'Please fill in all ingredient items and quantities.' });
      return;
    }

    setIsSaving(true);
    api.post('/recipes', formData)
      .then(res => {
        setFeedback({ type: 'success', text: res.data.message });
        fetchData();
        setTimeout(() => setActiveModal(null), 1000);
      })
      .catch(err => {
        setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to save recipe.' });
      })
      .finally(() => setIsSaving(false));
  };

  const confirmDelete = () => {
    if (!recipeToDelete) return;
    setIsSaving(true);

    api.delete(`/recipes/${recipeToDelete.id}`)
      .then(res => {
        fetchData();
        setRecipeToDelete(null);
      })
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to delete recipe.');
        setRecipeToDelete(null);
      })
      .finally(() => setIsSaving(false));
  };

  // --- FORMATTER & FILTERING ---
  const formatMoney = (val) => '$ ' + parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const formatMoneyStandard = (val) => '$ ' + parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const displayedRecipes = recipes.filter(r => r.type === activeTab);
  const basePrepsList = recipes.filter(r => r.type === 'base_prep'); // Untuk dropdown sub-recipe

  return (
    <div>
      <div style={{ marginBottom: '25px' }}>
        <h1 style={{ margin: 0, color: '#0f172a' }}>🍔 Food Cost & Recipe Manager</h1>
        <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
          Build base preparations and final menus to calculate exact Cost of Goods Sold (COGS).
        </p>
      </div>

      {feedback.text && (
        <div style={{ padding: '10px 15px', marginBottom: '15px', borderRadius: '6px', fontWeight: 'bold', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828', border: `1px solid ${feedback.type === 'success' ? '#a5d6a7' : '#ef9a9a'}` }}>
          {feedback.text}
        </div>
      )}

      {/* TABS & ADD BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setActiveTab('base_prep')}
            style={{ padding: '10px 20px', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', background: activeTab === 'base_prep' ? '#0d47a1' : 'transparent', color: activeTab === 'base_prep' ? '#fff' : '#64748b' }}
          >
            🍳 Base Preps (Sub-Recipes)
          </button>
          <button 
            onClick={() => setActiveTab('final_menu')}
            style={{ padding: '10px 20px', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', background: activeTab === 'final_menu' ? '#16a34a' : 'transparent', color: activeTab === 'final_menu' ? '#fff' : '#64748b' }}
          >
            🍽️ Final Menus
          </button>
        </div>
        <button 
          disabled={loading || isSaving}
          onClick={() => { setFormData({...initialForm, type: activeTab}); setActiveModal('add'); setFeedback({type:'', text:''}); }}
          style={{ padding: '10px 20px', background: activeTab === 'base_prep' ? '#0d47a1' : '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          + Add {activeTab === 'base_prep' ? 'Base Prep' : 'Final Menu'}
        </button>
      </div>

      {/* TABLES */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? <p style={{ padding: '25px', textAlign: 'center', color: '#64748b' }}>Loading recipes...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#1e293b' }}>
              <tr>
                <th style={{ padding: '12px 15px' }}>Recipe Name</th>
                <th style={{ padding: '12px 15px' }}>Yield (Result)</th>
                <th style={{ padding: '12px 15px' }}>Total Ingredients Cost</th>
                
                {activeTab === 'base_prep' ? (
                  <th style={{ padding: '12px 15px' }}>Cost Per Unit (ML/GR)</th>
                ) : (
                  <>
                    <th style={{ padding: '12px 15px' }}>Sold Price</th>
                    <th style={{ padding: '12px 15px' }}>COGS %</th>
                  </>
                )}
                <th style={{ padding: '12px 15px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedRecipes.length === 0 ? (
                <tr><td colSpan={activeTab === 'base_prep' ? 5 : 6} style={{ padding: '25px', textAlign: 'center', color: '#94a3b8' }}>No recipes found in this category.</td></tr>
              ) : (
                displayedRecipes.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#0f172a' }}>{r.name}</td>
                    <td style={{ padding: '12px 15px' }}>{parseFloat(r.yield_qty)} {r.yield_unit.toUpperCase()}</td>
                    <td style={{ padding: '12px 15px', color: '#d97706', fontWeight: 'bold' }}>{formatMoneyStandard(r.total_cost)}</td>
                    
                    {activeTab === 'base_prep' ? (
                      <td style={{ padding: '12px 15px', color: '#0284c7', fontWeight: 'bold' }}>{formatMoney(r.cost_per_unit)} / {r.yield_unit}</td>
                    ) : (
                      <>
                        <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{formatMoneyStandard(r.sold_price)}</td>
                        <td style={{ padding: '12px 15px', fontWeight: 'bold', color: r.cogs_percentage > 35 ? '#dc2626' : '#16a34a' }}>
                          {parseFloat(r.cogs_percentage).toFixed(2)} %
                        </td>
                      </>
                    )}

                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <button disabled={isSaving} onClick={() => { setRecipeToDelete(r); }} style={{ padding: '6px 12px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL ADD RECIPE BUILDER */}
      {activeModal === 'add' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <button onClick={() => setActiveModal(null)} disabled={isSaving} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            
            <h2 style={{ marginTop: 0, color: formData.type === 'base_prep' ? '#0d47a1' : '#16a34a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
              {formData.type === 'base_prep' ? '🍳 Create Base Prep' : '🍽️ Create Final Menu'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 1: HEADER INFO */}
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>Recipe Name</label>
                  <input type="text" required disabled={isSaving} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={formData.type === 'base_prep' ? "e.g., Pork Broth" : "e.g., Ee-Fu Noodle Soup"} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>Yield Qty</label>
                  <input type="number" step="0.01" required disabled={isSaving} value={formData.yield_qty} onChange={e => setFormData({...formData, yield_qty: e.target.value})} placeholder={formData.type === 'base_prep' ? "38000" : "1"} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>Yield Unit</label>
                  <input type="text" required disabled={isSaving} value={formData.yield_unit} onChange={e => setFormData({...formData, yield_unit: e.target.value})} placeholder={formData.type === 'base_prep' ? "ml/gr" : "portion"} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                </div>
              </div>

              {formData.type === 'final_menu' && (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#16a34a' }}>Target Selling Price ($)</label>
                  <input type="number" step="0.01" required disabled={isSaving} value={formData.sold_price} onChange={e => setFormData({...formData, sold_price: e.target.value})} placeholder="e.g., 25.50" style={{ width: '100%', padding: '10px', border: '2px solid #86efac', borderRadius: '6px', background: '#f0fdf4' }} />
                </div>
              )}

              {/* SECTION 2: INGREDIENTS BUILDER */}
              <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#0f172a' }}>Ingredients List</h4>
                
                {formData.ingredients.map((ing, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <select 
                      disabled={isSaving}
                      value={ing.ingredient_type} 
                      onChange={e => handleIngredientChange(idx, 'ingredient_type', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '130px', background: '#fff' }}
                    >
                      <option value="raw_item">Raw Supplier</option>
                      {formData.type === 'final_menu' && <option value="sub_recipe">Base Prep</option>}
                    </select>

                    <select 
                      disabled={isSaving} required
                      value={ing.item_id} 
                      onChange={e => handleIngredientChange(idx, 'item_id', e.target.value)}
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, background: '#fff' }}
                    >
                      <option value="">-- Select Item --</option>
                      {ing.ingredient_type === 'raw_item' ? (
                        supplierItems.map(item => <option key={item.id} value={item.id}>[{item.category}] {item.item_name} ({item.measurement})</option>)
                      ) : (
                        basePrepsList.map(prep => <option key={prep.id} value={prep.id}>{prep.name} (per {prep.yield_unit})</option>)
                      )}
                    </select>

                    <input 
                      type="number" step="0.0001" required disabled={isSaving}
                      value={ing.quantity} 
                      onChange={e => handleIngredientChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty used"
                      style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100px' }}
                    />

                    {formData.ingredients.length > 1 && (
                      <button type="button" disabled={isSaving} onClick={() => handleRemoveIngredientRow(idx)} style={{ background: 'transparent', color: '#ef4444', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
                    )}
                  </div>
                ))}

                <button type="button" disabled={isSaving} onClick={handleAddIngredientRow} style={{ marginTop: '10px', padding: '8px 15px', background: '#e2e8f0', color: '#0f172a', border: '1px dashed #94a3b8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                  + Add Another Ingredient
                </button>
              </div>

              <button type="submit" disabled={isSaving} style={{ padding: '15px', background: formData.type === 'base_prep' ? '#0d47a1' : '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Saving Recipe...' : 'Save Recipe'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI DELETE */}
      {recipeToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Confirm Deletion</h3>
            <p style={{ color: '#64748b', margin: '15px 0 20px 0' }}>Delete <strong>"{recipeToDelete.name}"</strong>?<br/>(This cannot be undone)</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setRecipeToDelete(null)} disabled={isSaving} style={{ flex: 1, padding: '9px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={confirmDelete} disabled={isSaving} style={{ flex: 1, padding: '9px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isSaving ? 'Deleting...' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}