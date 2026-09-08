import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function EmployeePage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // STATE MODAL & NOTIFICATION
  const [activeModal, setActiveModal] = useState(null); // 'edit', 'delete', or null
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  
  // STATE FORMS & SELECTION
  const [editData, setEditData] = useState({ id: '', name: '', position: '' });
  const [employeeToDelete, setEmployeeToDelete] = useState(null); 
  
  // STATE LOADING KHUSUS UNTUK TOMBOL
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEmployees = () => {
    setLoading(true);
    api.get('/employees').then(res => {
      setEmployees(res.data.data);
      setLoading(false);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to load employee data.' });
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ----------------------------------------------------
  // DELETE HANDLERS
  // ----------------------------------------------------
  const handleDeleteClick = (emp) => {
    setEmployeeToDelete(emp);
    setFeedback({ type: '', text: '' });
    setActiveModal('delete');
  };

  const confirmDelete = () => {
    if (!employeeToDelete) return;
    
    setIsDeleting(true); 
    
    api.delete(`/employees/${employeeToDelete.id}`).then(() => {
      setFeedback({ type: 'success', text: `Employee ${employeeToDelete.name} successfully deleted!` });
      fetchEmployees();
      setActiveModal(null);
      setEmployeeToDelete(null);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to delete employee.' });
      setActiveModal(null);
      setEmployeeToDelete(null);
    }).finally(() => {
      setIsDeleting(false); 
    });
  };

  // ----------------------------------------------------
  // EDIT HANDLERS
  // ----------------------------------------------------
  const handleEditClick = (emp) => {
    setEditData({ id: emp.id, name: emp.name, position: emp.position });
    setFeedback({ type: '', text: '' });
    setActiveModal('edit');
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    
    setIsSaving(true); 
    
    api.put(`/employees/${editData.id}`, { 
      name: editData.name, 
      position: editData.position 
    }).then(() => {
      setFeedback({ type: 'success', text: 'Employee data updated successfully!' });
      fetchEmployees();
      setTimeout(() => setActiveModal(null), 1500);
    }).catch(() => {
      setFeedback({ type: 'error', text: 'Failed to save changes.' });
    }).finally(() => {
      setIsSaving(false); 
    });
  };

  const renderFeedback = () => {
    if (!feedback.text) return null;
    const isSuccess = feedback.type === 'success';
    return (
      <div style={{ 
        padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold',
        backgroundColor: isSuccess ? '#e8f5e9' : '#ffebee', 
        color: isSuccess ? '#2e7d32' : '#c62828',
        border: `1px solid ${isSuccess ? '#a5d6a7' : '#ef9a9a'}`
      }}>
        {feedback.text}
      </div>
    );
  };

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>👥 Employee Management</h1>
      <p style={{ color: '#666', marginTop: '30px', marginBottom: '10px' }}>Manage your restaurant staff master data.</p>

      {renderFeedback()}

      {/* EMPLOYEE LIST TABLE */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Loading employees...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
              <tr>
                {/* UBAH HEADER ID MENJADI NO. */}
                <th style={{ padding: '12px 15px', color: '#334155', width: '50px', textAlign: 'center' }}>No.</th>
                <th style={{ padding: '12px 15px', color: '#334155' }}>Staff Name</th>
                <th style={{ padding: '12px 15px', color: '#334155' }}>Position / Department</th>
                <th style={{ padding: '12px 15px', color: '#334155', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No employee data available.</td>
                </tr>
              ) : (
                // TAMBAHKAN PARAMETER index DI SINI
                employees.map((emp, index) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {/* GUNAKAN (index + 1) UNTUK NOMOR URUT */}
                    <td style={{ padding: '12px 15px', color: '#64748b', fontWeight: 'bold', textAlign: 'center' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '12px 15px', fontWeight: 'bold', color: '#0f172a' }}>{emp.name}</td>
                    <td style={{ padding: '12px 15px', color: '#475569' }}>
                      <span style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {emp.position}
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleEditClick(emp)}
                          style={{ padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          ✎ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(emp)}
                          style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                          ✖ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* EDIT EMPLOYEE MODAL */}
      {activeModal === 'edit' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', padding: '25px', borderRadius: '10px',
            width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <button 
              onClick={() => setActiveModal(null)} 
              disabled={isSaving}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'transparent', border: 'none', fontSize: '1.2rem', 
                cursor: isSaving ? 'not-allowed' : 'pointer', color: '#666'
              }}
            >✖</button>

            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#f59e0b' }}>Edit Employee Data</h3>
            
            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Staff Name</label>
                <input 
                  type="text" 
                  value={editData.name} 
                  onChange={(e) => setEditData({...editData, name: e.target.value})} 
                  required 
                  disabled={isSaving}
                  style={{ 
                    padding: '10px', width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px',
                    backgroundColor: isSaving ? '#f1f5f9' : '#fff'
                  }} 
                />
              </div>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Position / Department</label>
                <input 
                  type="text" 
                  value={editData.position} 
                  onChange={(e) => setEditData({...editData, position: e.target.value})} 
                  required 
                  disabled={isSaving}
                  style={{ 
                    padding: '10px', width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px',
                    backgroundColor: isSaving ? '#f1f5f9' : '#fff'
                  }} 
                />
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                style={{ 
                  padding: '12px', 
                  background: isSaving ? '#94a3b8' : '#f59e0b',
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: isSaving ? 'not-allowed' : 'pointer', 
                  marginTop: '10px', 
                  fontWeight: 'bold' 
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {activeModal === 'delete' && employeeToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', padding: '25px', borderRadius: '10px',
            width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <button 
              onClick={() => { setActiveModal(null); setEmployeeToDelete(null); }} 
              disabled={isDeleting}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'transparent', border: 'none', fontSize: '1.2rem', 
                cursor: isDeleting ? 'not-allowed' : 'pointer', color: '#666'
              }}
            >✖</button>

            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#ef4444' }}>⚠️ Confirm Deletion</h3>
            
            <p style={{ marginBottom: '25px', color: '#334155', lineHeight: '1.5', fontSize: '0.95rem' }}>
              Are you sure you want to delete <strong>"{employeeToDelete.name}"</strong>?
              <br /><br />
              All shift schedules and wage history in the database will be permanently deleted and cannot be recovered!
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setActiveModal(null); setEmployeeToDelete(null); }} 
                disabled={isDeleting}
                style={{ 
                  padding: '10px 15px', background: '#e2e8f0', color: '#475569', border: 'none', 
                  borderRadius: '4px', cursor: isDeleting ? 'not-allowed' : 'pointer', fontWeight: 'bold' 
                }}
              >
                Cancel
              </button>
              
              <button 
                onClick={confirmDelete} 
                disabled={isDeleting}
                style={{ 
                  padding: '10px 15px', 
                  background: isDeleting ? '#94a3b8' : '#ef4444',
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: isDeleting ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold' 
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}