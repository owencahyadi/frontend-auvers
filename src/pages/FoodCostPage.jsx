import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function FoodCostPage() {
  const [recipes, setRecipes] = useState([]);
  const [supplierItems, setSupplierItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const [activeTab, setActiveTab] = useState('base_prep'); 
  const [activeModal, setActiveModal] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [recipeToDelete, setRecipeToDelete] = useState(null);
  
  const [expandedRows, setExpandedRows] = useState([]);

  // Struktur State Ingredient diperbarui untuk menampung Kategori dan Filter Nama
  const initialForm = {
    name: '', type: 'base_prep', yield_qty: '', yield_unit: '', sold_price: '',
    ingredients: [{ ingredient_type: 'raw_item', category: '', filter_item_name: '', item_id: '', quantity: '' }]
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

  const toggleRow = (id) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const handleAddIngredientRow = () => {
    setFormData(prev => ({ 
      ...prev, 
      ingredients: [...prev.ingredients, { ingredient_type: 'raw_item', category: '', filter_item_name: '', item_id: '', quantity: '' }] 
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
      
      // Reset dropdown anak jika dropdown induknya berubah
      if (field === 'ingredient_type') {
        newIngredients[index].category = '';
        newIngredients[index].filter_item_name = '';
        newIngredients[index].item_id = '';
      }
      if (field === 'category') {
        newIngredients[index].filter_item_name = '';
        newIngredients[index].item_id = '';
      }
      if (field === 'filter_item_name') {
        newIngredients[index].item_id = '';
      }
      
      return { ...prev, ingredients: newIngredients };
    });
  };

  const handleOpenEdit = (recipe) => {
    setFormData({
      name: recipe.name,
      type: recipe.type,
      yield_qty: recipe.yield_qty,
      yield_unit: recipe.yield_unit,
      sold_price: recipe.sold_price || '',
      ingredients: recipe.ingredients.map(ing => {
        const isRaw = ing.ingredient_type === 'raw_item';
        return {
          ingredient_type: ing.ingredient_type,
          category: isRaw ? (ing.supplier_item?.category || '') : '',
          filter_item_name: isRaw ? (ing.supplier_item?.item_name || '') : '',
          item_id: isRaw ? ing.supplier_item_id : ing.sub_recipe_id,
          quantity: ing.quantity
        };
      })
    });
    setEditingId(recipe.id);
    setActiveModal('edit');
    setFeedback({ type: '', text: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    const hasEmptyIngredient = formData.ingredients.some(ing => !ing.item_id || !ing.quantity);
    if (hasEmptyIngredient) {
      setFeedback({ type: 'error', text: 'Please fill in all ingredient items and quantities.' });
      return;
    }

    setIsSaving(true);
    const request = editingId 
      ? api.put(`/recipes/${editingId}`, formData) 
      : api.post('/recipes', formData);

    request.then(res => {
        setFeedback({ type: 'success', text: res.data.message });
        fetchData();
        setTimeout(() => { setActiveModal(null); setEditingId(null); }, 1000);
      })
      .catch(err => setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to save recipe.' }))
      .finally(() => setIsSaving(false));
  };

  const confirmDelete = () => {
    if (!recipeToDelete) return;
    setIsSaving(true);
    api.delete(`/recipes/${recipeToDelete.id}`)
      .then(res => { fetchData(); setRecipeToDelete(null); })
      .catch(err => { alert(err.response?.data?.message || 'Failed to delete recipe.'); setRecipeToDelete(null); })
      .finally(() => setIsSaving(false));
  };

  const formatMoney = (val) => '$ ' + parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const formatMoneyStandard = (val) => '$ ' + parseFloat(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const displayedRecipes = recipes.filter(r => r.type === activeTab);
  const basePrepsList = recipes.filter(r => r.type === 'base_prep'); 
  
  // LOGIKA BARU: Hilangkan resep yang sedang di-edit dari daftar dropdown untuk mencegah loop (Resep memanggil dirinya sendiri)
  const availableBasePreps = basePrepsList.filter(prep => prep.id !== editingId);

  const uniqueCategories = [...new Set(supplierItems.map(item => item.category))].sort();

  const getIngredientDetails = (ing) => {
    const isRaw = ing.ingredient_type === 'raw_item';
    const name = isRaw ? ing.supplier_item?.item_name : ing.sub_recipe?.name;
    const unit = isRaw ? ing.supplier_item?.measurement : ing.sub_recipe?.yield_unit;
    
    let unitCost = 0;
    if (isRaw) {
      const catalogPrice = parseFloat(ing.supplier_item?.price || 0);
      const measurementStr = String(ing.supplier_item?.measurement || '1');
      const match = measurementStr.match(/[\d\.]+/);
      let measurementVal = match ? parseFloat(match[0]) : 1;
      if (measurementVal <= 0) measurementVal = 1;
      
      unitCost = catalogPrice / measurementVal;
    } else {
      unitCost = parseFloat(ing.sub_recipe?.cost_per_unit || 0);
    }

    const totalCost = parseFloat(ing.quantity || 0) * unitCost;
    return { name, unit, unitCost, totalCost };
  };

  return (
    <div>
      <div style={{ marginBottom: '25px' }}>
        <h1 style={{ marginBottom: '30px', color: '#0f172a' }}>🍔 Food Cost & Recipe Manager</h1>
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
            style={{ padding: '10px 20px', fontWeight: 'bold', border: activeTab === 'base_prep' ? '1px solid #0d47a1' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', background: activeTab === 'base_prep' ? '#0d47a1' : '#f8fafc', color: activeTab === 'base_prep' ? '#fff' : '#64748b' }}
          >
            🍳 Base Preps (Sub-Recipes)
          </button>
          <button 
            onClick={() => setActiveTab('final_menu')}
            style={{ padding: '10px 20px', fontWeight: 'bold', border: activeTab === 'final_menu' ? '1px solid #16a34a' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', background: activeTab === 'final_menu' ? '#16a34a' : '#f8fafc', color: activeTab === 'final_menu' ? '#fff' : '#64748b' }}
          >
            🍽️ Final Menus
          </button>
        </div>
        <button 
          disabled={loading || isSaving}
          onClick={() => { setFormData({...initialForm, type: activeTab}); setEditingId(null); setActiveModal('add'); setFeedback({type:'', text:''}); }}
          style={{ padding: '10px 20px', background: activeTab === 'base_prep' ? '#0d47a1' : '#16a34a', color: '#fff', border: activeTab === 'base_prep' ? '1px solid #082f6b' : '1px solid #14532d', borderRadius: '6px', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
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
                  <th style={{ padding: '12px 15px' }}>Cost Per Unit</th>
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
                <tr><td colSpan="7" style={{ padding: '25px', textAlign: 'center', color: '#94a3b8' }}>No recipes found.</td></tr>
              ) : (
                displayedRecipes.map((r) => (
                  <React.Fragment key={r.id}>
                    {/* BARIS UTAMA (RESEP) */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: expandedRows.includes(r.id) ? '#f8fafc' : '#fff' }}>
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
                        <button onClick={() => toggleRow(r.id)} style={{ padding: '6px 10px', marginRight: '5px', background: '#e2e8f0', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {expandedRows.includes(r.id) ? '▲ Hide' : '👁️ View'}
                        </button>
                        <button disabled={isSaving} onClick={() => handleOpenEdit(r)} style={{ padding: '6px 10px', marginRight: '5px', background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>Edit</button>
                        <button disabled={isSaving} onClick={() => setRecipeToDelete(r)} style={{ padding: '6px 10px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>Delete</button>
                      </td>
                    </tr>

                    {/* BARIS RINCIAN BAHAN */}
                    {expandedRows.includes(r.id) && (
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <td colSpan="100%" style={{ padding: '15px 25px' }}>
                          <h5 style={{ margin: '0 0 10px 0', color: '#475569' }}>🛒 Ingredients Breakdown for {r.name}:</h5>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#64748b' }}>
                                <th style={{ padding: '5px', textAlign: 'left' }}>Item Name</th>
                                <th style={{ padding: '5px', textAlign: 'right' }}>Qty Used</th>
                                <th style={{ padding: '5px', textAlign: 'right' }}>Cost / Unit</th>
                                <th style={{ padding: '5px', textAlign: 'right' }}>Total Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.ingredients.map(ing => {
                                const details = getIngredientDetails(ing);
                                return (
                                  <tr key={ing.id} style={{ borderBottom: '1px dotted #cbd5e1' }}>
                                    <td style={{ padding: '6px 5px', fontWeight: 'bold' }}>
                                      {details.name || <span style={{ color: 'red' }}>Item Deleted</span>}
                                      {ing.ingredient_type === 'sub_recipe' && <span style={{ marginLeft: '5px', fontSize: '0.7rem', background: '#e0f2fe', color: '#0284c7', padding: '2px 4px', borderRadius: '4px' }}>Base Prep</span>}
                                    </td>
                                    <td style={{ padding: '6px 5px', textAlign: 'right' }}>{parseFloat(ing.quantity)} {details.unit?.replace(/[0-9.]/g, '').trim()}</td>
                                    <td style={{ padding: '6px 5px', textAlign: 'right', color: '#64748b' }}>{formatMoney(details.unitCost)}</td>
                                    <td style={{ padding: '6px 5px', textAlign: 'right', fontWeight: 'bold', color: '#b45309' }}>{formatMoney(details.totalCost)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL ADD / EDIT RECIPE */}
      {(activeModal === 'add' || activeModal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 1000 }}>
          {/* Modal diperlebar jadi 850px agar isinya tidak tertekan */}
          <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <button onClick={() => {setActiveModal(null); setEditingId(null);}} disabled={isSaving} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            
            <h2 style={{ marginTop: 0, color: formData.type === 'base_prep' ? '#0d47a1' : '#16a34a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
              {activeModal === 'edit' ? '✏️ Edit Recipe' : (formData.type === 'base_prep' ? '🍳 Create Base Prep' : '🍽️ Create Final Menu')}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                
                {formData.ingredients.map((ing, idx) => {
                  const ingItemsCat = supplierItems.filter(item => item.category === ing.category);
                  const uniqueItemNames = [...new Set(ingItemsCat.map(item => item.item_name))].sort();
                  const availableSuppliers = ingItemsCat.filter(item => item.item_name === ing.filter_item_name);

                  return (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px', marginBottom: '12px', position: 'relative' }}>
                      
                      {formData.ingredients.length > 1 && (
                        <button type="button" disabled={isSaving} onClick={() => handleRemoveIngredientRow(idx)} style={{ position: 'absolute', top: '8px', right: '8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.9rem', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold' }}>✖</button>
                      )}

                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingRight: formData.ingredients.length > 1 ? '35px' : '0' }}>
                        
                        <div style={{ flex: '1 1 120px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Type</label>
                          <select disabled={isSaving} value={ing.ingredient_type} onChange={e => handleIngredientChange(idx, 'ingredient_type', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc' }}>
                            <option value="raw_item">Raw Supplier</option>
                            {/* LOGIKA BARU: Base Prep sekarang bisa dipilih di mana saja! */}
                            <option value="sub_recipe">Base Prep</option>
                          </select>
                        </div>

                        {ing.ingredient_type === 'raw_item' ? (
                          <>
                            <div style={{ flex: '1 1 150px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Category</label>
                              <select disabled={isSaving} value={ing.category} onChange={e => handleIngredientChange(idx, 'category', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }}>
                                <option value="">-- Category --</option>
                                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            </div>

                            <div style={{ flex: '1 1 150px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Item Name</label>
                              <select disabled={isSaving || !ing.category} value={ing.filter_item_name} onChange={e => handleIngredientChange(idx, 'filter_item_name', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: (isSaving || !ing.category) ? '#f1f5f9' : '#fff' }}>
                                <option value="">-- Item Name --</option>
                                {uniqueItemNames.map(name => <option key={name} value={name}>{name}</option>)}
                              </select>
                            </div>

                            <div style={{ flex: '1 1 200px' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Select Supplier</label>
                              <select disabled={isSaving || !ing.filter_item_name} required value={ing.item_id} onChange={e => handleIngredientChange(idx, 'item_id', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: (isSaving || !ing.filter_item_name) ? '#f1f5f9' : '#fff' }}>
                                <option value="">-- Supplier --</option>
                                {availableSuppliers.map(item => <option key={item.id} value={item.id}>{item.supplier_name || 'No Name'} (${parseFloat(item.price).toFixed(2)}/{item.measurement})</option>)}
                              </select>
                            </div>
                          </>
                        ) : (
                          <div style={{ flex: '3 1 300px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Select Base Prep</label>
                            <select disabled={isSaving} required value={ing.item_id} onChange={e => handleIngredientChange(idx, 'item_id', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }}>
                              <option value="">-- Select Base Prep --</option>
                              {/* LOGIKA BARU: Menggunakan availableBasePreps agar tidak bisa memanggil diri sendiri */}
                              {availableBasePreps.map(prep => <option key={prep.id} value={prep.id}>{prep.name} (per {prep.yield_unit})</option>)}
                            </select>
                          </div>
                        )}

                        <div style={{ flex: '0 1 100px' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Qty Used</label>
                          <input type="number" step="0.0001" required disabled={isSaving} value={ing.quantity} onChange={e => handleIngredientChange(idx, 'quantity', e.target.value)} placeholder="Qty" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} />
                        </div>

                      </div>
                    </div>
                  );
                })}

                <button type="button" disabled={isSaving} onClick={handleAddIngredientRow} style={{ marginTop: '5px', padding: '10px 15px', background: '#e2e8f0', color: '#0f172a', border: '1px dashed #94a3b8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                  + Add Another Ingredient
                </button>
              </div>

              <button type="submit" disabled={isSaving} style={{ padding: '15px', background: formData.type === 'base_prep' ? '#0d47a1' : '#16a34a', color: '#fff', border: formData.type === 'base_prep' ? '1px solid #082f6b' : '1px solid #14532d', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Saving Recipe...' : (activeModal === 'edit' ? 'Update Recipe' : 'Save Recipe')}
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
              <button onClick={() => setRecipeToDelete(null)} disabled={isSaving} style={{ flex: 1, padding: '9px', background: '#e2e8f0', color: '#475569', border: '1px solid #94a3b8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              <button onClick={confirmDelete} disabled={isSaving} style={{ flex: 1, padding: '9px', background: '#ef4444', color: '#fff', border: '1px solid #991b1b', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{isSaving ? 'Deleting...' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}