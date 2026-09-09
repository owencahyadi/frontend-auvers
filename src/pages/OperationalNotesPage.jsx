import { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { StoreContext } from '../context/StoreContext';

export default function OperationalNotesPage() {
  const { activeStoreId } = useContext(StoreContext);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [activeModal, setActiveModal] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const initialForm = {
    item: '', username: '', password: '', cut_off_time: '',
    delivery_day: '', minimum_order: '', contact: '', phone: '', noted: ''
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchNotes = () => {
    setLoading(true);
    const storeParam = activeStoreId ? `?store_id=${activeStoreId}` : '';
    api.get(`/operational-notes${storeParam}`)
      .then(res => {
        setNotes(res.data.data || []);
        setLoading(false);
      })
      .catch(() => {
        setFeedback({ type: 'error', text: 'Failed to load operational notes.' });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotes();
  }, [activeStoreId]);

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setEditingId(null);
    setFeedback({ type: '', text: '' });
    setActiveModal('add');
  };

  const handleOpenEdit = (note) => {
    setFormData({
      item: note.item || '', username: note.username || '', password: note.password || '',
      cut_off_time: note.cut_off_time || '', delivery_day: note.delivery_day || '',
      minimum_order: note.minimum_order || '', contact: note.contact || '',
      phone: note.phone || '', noted: note.noted || ''
    });
    setEditingId(note.id);
    setFeedback({ type: '', text: '' });
    setActiveModal('edit');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    setIsSaving(true);

    const payload = { ...formData, store_id: activeStoreId || null };
    const request = editingId 
      ? api.put(`/operational-notes/${editingId}`, payload)
      : api.post('/operational-notes', payload);

    request.then(res => {
      setFeedback({ type: 'success', text: res.data.message });
      fetchNotes();
      setTimeout(() => setActiveModal(null), 800);
    }).catch(err => {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to save note.' });
    }).finally(() => setIsSaving(false));
  };

  const confirmDelete = () => {
    if (!noteToDelete) return;
    setIsSaving(true);

    api.delete(`/operational-notes/${noteToDelete.id}`)
      .then(() => {
        fetchNotes();
        setNoteToDelete(null);
      })
      .catch(() => alert('Failed to delete note.'))
      .finally(() => setIsSaving(false));
  };

  const filteredNotes = notes.filter(n => 
    n.item.toLowerCase().includes(search.toLowerCase()) ||
    (n.contact && n.contact.toLowerCase().includes(search.toLowerCase())) ||
    (n.noted && n.noted.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {/* JUDUL DAN DESKRIPSI */}
      <h1 style={{ margin: 0, color: '#0f172a' }}>📋 Operational Notes & Vendor Info</h1>
      <p style={{ margin: '30px 0 15px 0', color: '#64748b', fontSize: '0.95rem' }}>
        Store logins, cut-off schedules, vendor order contacts, and delivery terms.
      </p>

      {/* ACTION & SEARCH BAR (Tepat di bawah teks deskripsi, rata kiri) */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={handleOpenAdd}
          disabled={loading || isSaving}
          style={{ padding: '9px 16px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '6px', cursor: (loading || isSaving) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          + Add New Entry
        </button>
        <input 
          type="text" 
          placeholder="Search vendor / item..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', width: '250px' }} 
        />
      </div>

      {feedback.text && (
        <div style={{ padding: '10px 15px', marginBottom: '15px', borderRadius: '6px', fontWeight: 'bold', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828', border: `1px solid ${feedback.type === 'success' ? '#a5d6a7' : '#ef9a9a'}` }}>
          {feedback.text}
        </div>
      )}

      {/* NOTES TABLE */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <p style={{ padding: '25px', textAlign: 'center', color: '#64748b' }}>Loading operational notes...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#1e293b' }}>
              <tr>
                <th style={{ padding: '12px 10px' }}>ITEM</th>
                <th style={{ padding: '12px 10px' }}>USERNAME</th>
                <th style={{ padding: '12px 10px' }}>PASSWORD</th>
                <th style={{ padding: '12px 10px' }}>CUT OFF TIME</th>
                <th style={{ padding: '12px 10px' }}>DELIVERY DAY</th>
                <th style={{ padding: '12px 10px' }}>MINIMUM ORDER</th>
                <th style={{ padding: '12px 10px' }}>CONTACT</th>
                <th style={{ padding: '12px 10px' }}>PHONE</th>
                <th style={{ padding: '12px 10px' }}>NOTED</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '25px', textAlign: 'center', color: '#94a3b8' }}>
                    No notes recorded yet. Click "+ Add New Entry" to get started.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>{note.item}</td>
                    <td style={{ padding: '10px', color: '#2563eb' }}>{note.username || '-'}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#475569' }}>{note.password || '-'}</td>
                    <td style={{ padding: '10px' }}>{note.cut_off_time || '-'}</td>
                    <td style={{ padding: '10px' }}>{note.delivery_day || '-'}</td>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{note.minimum_order || '-'}</td>
                    <td style={{ padding: '10px' }}>{note.contact || '-'}</td>
                    <td style={{ padding: '10px', color: '#047857' }}>
                      {note.phone ? <a href={`tel:${note.phone}`} style={{ textDecoration: 'none', color: 'inherit' }}>📞 {note.phone}</a> : '-'}
                    </td>
                    <td style={{ padding: '10px', color: '#475569', maxWidth: '200px', whiteSpace: 'normal' }}>
                      {note.noted || '-'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenEdit(note)} 
                        disabled={isSaving}
                        style={{ marginRight: '6px', padding: '4px 8px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setNoteToDelete(note)} 
                        disabled={isSaving}
                        style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL INPUT / EDIT */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => setActiveModal(null)} 
              disabled={isSaving}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ✖
            </button>
            <h3 style={{ marginTop: 0, color: '#0d47a1', marginBottom: '15px' }}>
              {activeModal === 'add' ? '+ Add Entry' : '✏️ Edit Entry'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Item / Vendor Name *</label>
                <input 
                  type="text" required value={formData.item} 
                  onChange={e => setFormData({...formData, item: e.target.value})} 
                  placeholder="e.g., B & E, Wi-Fii, JFC"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Username</label>
                  <input 
                    type="text" value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    placeholder="e.g., hello@ho-mee.com.au"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Password</label>
                  <input 
                    type="text" value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder="e.g., homee123"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Cut Off Time</label>
                  <input 
                    type="text" value={formData.cut_off_time} 
                    onChange={e => setFormData({...formData, cut_off_time: e.target.value})} 
                    placeholder="e.g., Before 6pm"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Delivery Day</label>
                  <input 
                    type="text" value={formData.delivery_day} 
                    onChange={e => setFormData({...formData, delivery_day: e.target.value})} 
                    placeholder="e.g., Monday to Saturday"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Minimum Order</label>
                <input 
                  type="text" value={formData.minimum_order} 
                  onChange={e => setFormData({...formData, minimum_order: e.target.value})} 
                  placeholder="e.g., $ 200,00 or No Minimum Order"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Contact Person</label>
                  <input 
                    type="text" value={formData.contact} 
                    onChange={e => setFormData({...formData, contact: e.target.value})} 
                    placeholder="e.g., Kai, Catherine"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Phone</label>
                  <input 
                    type="text" value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="e.g., 61404202774"
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#334155' }}>Noted (Ordering Method / Instructions)</label>
                <textarea 
                  rows="3" value={formData.noted} 
                  onChange={e => setFormData({...formData, noted: e.target.value})} 
                  placeholder="e.g., APP, Website, Whatsapp & Pickup in Rhodes"
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                style={{ marginTop: '10px', padding: '10px', background: isSaving ? '#94a3b8' : '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? 'Saving...' : 'Save Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI DELETE */}
      {noteToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '350px', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Confirm Deletion</h3>
            <p style={{ color: '#64748b', margin: '15px 0 20px 0' }}>
              Delete entry for <strong>"{noteToDelete.item}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setNoteToDelete(null)}
                disabled={isSaving}
                style={{ flex: 1, padding: '9px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isSaving}
                style={{ flex: 1, padding: '9px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
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