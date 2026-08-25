import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function EmployeePage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // STATE MODAL & NOTIFICATION
  const [activeModal, setActiveModal] = useState(null); // 'edit' or null
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  
  // STATE EDIT FORM
  const [editData, setEditData] = useState({ id: '', name: '', position: '' });

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

  // DELETE HANDLER
  const handleDelete = (id, name) => {
    if (window.confirm(`⚠️ WARNING: Are you sure you want to delete "${name}"?\n\nAll shift schedules and wage history in the database will be permanently deleted!`)) {
      api.delete(`/employees/${id}`).then(() => {
        setFeedback({ type: 'success', text: `Employee ${name} successfully deleted!` });
        fetchEmployees();
      }).catch(() => setFeedback({ type: 'error', text: 'Failed to delete employee.' }));
    }
  };

  // OPEN EDIT MODAL HANDLER
  const handleEditClick = (emp) => {
    setEditData({ id: emp.id, name: emp.name, position: emp.position });
    setFeedback({ type: '', text: '' });
    setActiveModal('edit');
  };

  // SAVE EDIT (UPDATE) HANDLER
  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    
    api.put(`/employees/${editData.id}`, { 
      name: editData.name, 
      position: editData.position 
    }).then(() => {
      setFeedback({ type: 'success', text: 'Employee data updated successfully!' });
      fetchEmployees();
      // Close modal automatically after 1.5 seconds
      setTimeout(() => setActiveModal(null), 1500);
    }).catch(() => setFeedback({ type: 'error', text: 'Failed to save changes.' }));
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
                <th style={{ padding: '12px 15px', color: '#334155' }}>ID</th>
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
                employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 15px', color: '#64748b', fontWeight: 'bold' }}>#{emp.id}</td>
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
                          onClick={() => handleDelete(emp.id, emp.name)}
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
            <button onClick={() => setActiveModal(null)} style={{
              position: 'absolute', top: '15px', right: '15px',
              background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666'
            }}>✖</button>

            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#f59e0b' }}>Edit Employee Data</h3>
            
            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Staff Name</label>
                <input type="text" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} required style={{ padding: '10px', width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Position / Department</label>
                <input type="text" value={editData.position} onChange={(e) => setEditData({...editData, position: e.target.value})} required style={{ padding: '10px', width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <button type="submit" style={{ padding: '12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}