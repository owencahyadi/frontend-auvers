import { useState, useEffect } from 'react';
import api from '../utils/api';
import * as XLSX from 'xlsx';

export default function PayrollPage() {
  const [weeklySales, setWeeklySales] = useState(0); 
  const [weekStart, setWeekStart] = useState('2026-06-22');
  
  const [payrollData, setPayrollData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState(null); 
  const [feedback, setFeedback] = useState({ type: '', text: '' }); 

  const [staffData, setStaffData] = useState({ name: '', position: '', base_rate: '', rate_sat: '', rate_sun: '', overtime_rate: '', ot_threshold: '38' });
  const [updateRateData, setUpdateRateData] = useState({ employee_id: '', base_rate: '', rate_sat: '', rate_sun: '', overtime_rate: '', ot_threshold: '38' });
  const [isWeeklyOnly, setIsWeeklyOnly] = useState(false);
  
  // Menambahkan state applied_rate_2
  const [shiftData, setShiftData] = useState({ 
    employee_id: '', date: '', is_unavailable: false,
    start_1: '', end_1: '', role_1: '',
    start_2: '', end_2: '', role_2: '',
    applied_rate_2: ''
  });

  const fetchData = () => {
    setLoading(true);
    api.get(`/calculate-payroll?start_date=${weekStart}`).then(res => {
      setPayrollData(res.data.data);
      setWeeklySales(res.data.total_sales || 0); 
      setLoading(false);
    });
    api.get('/employees').then(res => setEmployees(res.data.data));
  };

  useEffect(() => { 
    fetchData(); 
  }, [weekStart]);

  useEffect(() => {
    if (activeModal === 'shift' && shiftData.employee_id && shiftData.date) {
      api.get(`/rosters/calendar?start_date=${shiftData.date}`)
        .then(res => {
          const existingShift = res.data.data.find(
            r => r.employee_id == shiftData.employee_id && r.date === shiftData.date
          );
          
          if (existingShift) {
            setShiftData(prev => ({
              ...prev,
              is_unavailable: existingShift.is_unavailable === 1 || existingShift.is_unavailable === true,
              start_1: existingShift.start_1 ? existingShift.start_1.substring(0, 5) : '',
              end_1: existingShift.end_1 ? existingShift.end_1.substring(0, 5) : '',
              role_1: existingShift.role_1 || '',
              start_2: existingShift.start_2 ? existingShift.start_2.substring(0, 5) : '',
              end_2: existingShift.end_2 ? existingShift.end_2.substring(0, 5) : '',
              role_2: existingShift.role_2 || '',
              applied_rate_2: existingShift.applied_rate_2 || '' // Load rate shift 2
            }));
            setFeedback({ type: 'success', text: 'Schedule found! You can edit or add Shift 2.' });
          } else {
            setShiftData(prev => ({
              ...prev,
              is_unavailable: false,
              start_1: '', end_1: '', role_1: '',
              start_2: '', end_2: '', role_2: '',
              applied_rate_2: '' // Reset rate shift 2
            }));
            setFeedback({ type: '', text: '' });
          }
        })
        .catch(() => console.log('Failed to check schedule.'));
    }
  }, [shiftData.employee_id, shiftData.date, activeModal]);

  const closeModal = () => {
    setActiveModal(null);
    setFeedback({ type: '', text: '' }); 
  };

  const handleStaffSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    api.post('/employees', staffData).then(() => {
      setFeedback({ type: 'success', text: 'New employee successfully added!' });
      setStaffData({ name: '', position: '', base_rate: '', rate_sat: '', rate_sun: '', overtime_rate: '', ot_threshold: '38' });
      fetchData();
    }).catch(() => setFeedback({ type: 'error', text: 'Failed to save employee.' }));
  };

  const handleUpdateRateSubmit = (e) => {
    e.preventDefault();
    if (!updateRateData.employee_id) {
      setFeedback({ type: 'error', text: 'Please select an employee first!' });
      return;
    }
    setFeedback({ type: '', text: '' });
    
    if (isWeeklyOnly) {
      api.put(`/employees/${updateRateData.employee_id}/weekly-rates`, { ...updateRateData, start_date: weekStart })
      .then(() => {
        setFeedback({ type: 'success', text: 'SPECIAL rate for this week updated successfully!' });
        setUpdateRateData({ employee_id: '', base_rate: '', rate_sat: '', rate_sun: '', overtime_rate: '', ot_threshold: '38' });
        setIsWeeklyOnly(false);
        fetchData(); 
      }).catch(err => setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to update special rate.' }));
    } else {
      api.put(`/employees/${updateRateData.employee_id}/rates`, updateRateData)
      .then(() => {
        setFeedback({ type: 'success', text: 'Master Rate updated permanently!' });
        setUpdateRateData({ employee_id: '', base_rate: '', rate_sat: '', rate_sun: '', overtime_rate: '', ot_threshold: '38' });
        fetchData(); 
      }).catch(() => setFeedback({ type: 'error', text: 'Failed to update master rate.' }));
    }
  };

  const handleShiftSubmit = (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });
    api.post('/rosters', shiftData).then(() => {
      setFeedback({ type: 'success', text: 'Shift schedule saved successfully!' });
      setShiftData({ 
        employee_id: '', date: '', is_unavailable: false,
        start_1: '', end_1: '', role_1: '', start_2: '', end_2: '', role_2: '', applied_rate_2: ''
      });
      fetchData();
    }).catch(() => setFeedback({ type: 'error', text: 'Failed to add shift.' }));
  };

  const handleShiftChange = (e) => setShiftData({ ...shiftData, [e.target.name]: e.target.value });

  const handleTimeInput = (e) => {
    const { name, value } = e.target;
    let numericValue = value.replace(/\D/g, '');
    
    if (numericValue.length > 4) {
      numericValue = numericValue.substring(0, 4);
    }
    
    let formattedValue = numericValue;
    if (numericValue.length >= 3) {
      formattedValue = `${numericValue.substring(0, 2)}:${numericValue.substring(2)}`;
    }
    
    setShiftData({ ...shiftData, [name]: formattedValue });
  };

  const formatMoney = (val) => {
    if (!val || val === 0) return '$ -';
    return '$ ' + parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const footerTotals = payrollData.reduce((acc, row) => {
    acc.mon += row.pay_mon; acc.tue += row.pay_tue; acc.wed += row.pay_wed;
    acc.thu += row.pay_thu; acc.fri += row.pay_fri; acc.weekday += row.total_weekday;
    acc.sat += row.pay_sat; acc.sun += row.pay_sun; acc.grand += row.grand_total;
    return acc;
  }, { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, weekday: 0, sat: 0, sun: 0, grand: 0 });

  const handleDownloadExcel = () => {
    if (!payrollData || payrollData.length === 0) {
      alert("No data available to download.");
      return;
    }

    const rows = [];
    rows.push([
      'Name', 'Weekday Rate', 'Sat Rate', 'Sun Rate',
      'Sun', 'Sat', 'Fri', 'Thu', 'Wed', 'Tue', 'Mon', 
      'Total Weekday', 'Total Sat', 'Total Sun', 'Grand Total',
      'Sales', 'Labor %'
    ]);

    payrollData.forEach(staff => {
      rows.push([
        staff.name,
        parseFloat(staff.rate_weekday) || 0,
        parseFloat(staff.rate_sat) || 0,
        parseFloat(staff.rate_sun) || 0,
        parseFloat(staff.pay_sun) || 0,
        parseFloat(staff.pay_sat) || 0,
        parseFloat(staff.pay_fri) || 0,
        parseFloat(staff.pay_thu) || 0,
        parseFloat(staff.pay_wed) || 0,
        parseFloat(staff.pay_tue) || 0,
        parseFloat(staff.pay_mon) || 0,
        parseFloat(staff.total_weekday) || 0,
        parseFloat(staff.pay_sat) || 0,
        parseFloat(staff.pay_sun) || 0,
        parseFloat(staff.grand_total) || 0,
        "", 
        ""  
      ]);
    });

    rows.push([]);

    let laborPercentage = 0;
    if (weeklySales > 0) {
      laborPercentage = ((footerTotals.grand / weeklySales) * 100).toFixed(2);
    }

    rows.push([
      'GRAND TOTAL',
      '', '', '', 
      parseFloat(footerTotals.sun) || 0,
      parseFloat(footerTotals.sat) || 0,
      parseFloat(footerTotals.fri) || 0,
      parseFloat(footerTotals.thu) || 0,
      parseFloat(footerTotals.wed) || 0,
      parseFloat(footerTotals.tue) || 0,
      parseFloat(footerTotals.mon) || 0,
      parseFloat(footerTotals.weekday) || 0,
      parseFloat(footerTotals.sat) || 0,
      parseFloat(footerTotals.sun) || 0,
      parseFloat(footerTotals.grand) || 0,
      parseFloat(weeklySales) || 0,
      laborPercentage + '%'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${weekStart}`);
    
    XLSX.writeFile(workbook, `Payroll_Report_Week_${weekStart}.xlsx`);
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
      <h1 style={{ marginBottom: '40px' }}>F&B Payroll Dashboard</h1>
      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button onClick={() => { setActiveModal('staff'); setFeedback({type:'', text:''}); }} style={{ padding: '12px 20px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>+ Add Employee</button>
        <button onClick={() => { setActiveModal('rate'); setFeedback({type:'', text:''}); }} style={{ padding: '12px 20px', background: '#e65100', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>$ Update Staff Rates</button>
        <button onClick={() => { setActiveModal('shift'); setFeedback({type:'', text:''}); }} style={{ padding: '12px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>📅 Input Shift Roster</button>
      </div>

      {activeModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ background: '#fff', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative' }}>
              <button onClick={closeModal} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666' }}>✖</button>

              {activeModal === 'staff' && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#0d47a1' }}>Add New Employee</h3>
                  {renderFeedback()}
                  <form onSubmit={handleStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Staff Name</label><input type="text" name="name" value={staffData.name} onChange={(e) => setStaffData({...staffData, name: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                    <div><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Position</label><input type="text" name="position" value={staffData.position} onChange={(e) => setStaffData({...staffData, position: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Wkday ($)</label><input type="number" step="0.01" name="base_rate" value={staffData.base_rate} onChange={(e) => setStaffData({...staffData, base_rate: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Sat ($)</label><input type="number" step="0.01" name="rate_sat" value={staffData.rate_sat} onChange={(e) => setStaffData({...staffData, rate_sat: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Sun ($)</label><input type="number" step="0.01" name="rate_sun" value={staffData.rate_sun} onChange={(e) => setStaffData({...staffData, rate_sun: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>OT Rate ($)</label><input type="number" step="0.01" name="overtime_rate" value={staffData.overtime_rate} onChange={(e) => setStaffData({...staffData, overtime_rate: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Max Normal Hrs</label><input type="number" step="1" name="ot_threshold" value={staffData.ot_threshold} onChange={(e) => setStaffData({...staffData, ot_threshold: e.target.value})} required placeholder="e.g. 38" style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                    </div>
                    
                    <button type="submit" style={{ padding: '10px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>Save Employee</button>
                  </form>
                </div>
              )}

              {activeModal === 'rate' && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#e65100' }}>Update Staff Rates</h3>
                  {renderFeedback()}
                  <form onSubmit={handleUpdateRateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Select Staff</label><select name="employee_id" value={updateRateData.employee_id} onChange={(e) => setUpdateRateData({...updateRateData, employee_id: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}>
                      <option value="">-- Select Staff --</option>
                      {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                    </select></div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Wkday ($)</label><input type="number" step="0.01" name="base_rate" value={updateRateData.base_rate} onChange={(e) => setUpdateRateData({...updateRateData, base_rate: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Sat ($)</label><input type="number" step="0.01" name="rate_sat" value={updateRateData.rate_sat} onChange={(e) => setUpdateRateData({...updateRateData, rate_sat: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Sun ($)</label><input type="number" step="0.01" name="rate_sun" value={updateRateData.rate_sun} onChange={(e) => setUpdateRateData({...updateRateData, rate_sun: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>OT Rate ($)</label><input type="number" step="0.01" name="overtime_rate" value={updateRateData.overtime_rate} onChange={(e) => setUpdateRateData({...updateRateData, overtime_rate: e.target.value})} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                      <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Max Normal Hrs</label><input type="number" step="1" name="ot_threshold" value={updateRateData.ot_threshold} onChange={(e) => setUpdateRateData({...updateRateData, ot_threshold: e.target.value})} required placeholder="e.g. 38" style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                    </div>

                    <label style={{ fontSize: '0.9em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: '#fff3e0', padding: '10px', borderRadius: '5px' }}>
                      <input type="checkbox" checked={isWeeklyOnly} onChange={(e) => setIsWeeklyOnly(e.target.checked)} />
                      Apply only for the currently selected week
                    </label>
                    <button type="submit" style={{ padding: '10px', background: '#e65100', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px' }}>Update Rate</button>
                  </form>
                </div>
              )}

              {activeModal === 'shift' && (
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#007bff' }}>Input Shift Schedule</h3>
                  {renderFeedback()}
                  
                  {/* Pengecekan otomatis apakah tanggal yang dipilih adalah hari Minggu */}
                  {(() => {
                    // T12:00:00 ditambahkan agar konversi tanggal di berbagai zona waktu tetap akurat (tidak bergeser hari)
                    const isSunday = shiftData.date && new Date(shiftData.date + 'T12:00:00').getDay() === 0;

                    return (
                      <form onSubmit={handleShiftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Select Staff</label><select name="employee_id" value={shiftData.employee_id} onChange={handleShiftChange} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }}>
                            <option value="">-- Select --</option>
                            {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                          </select></div>
                          <div style={{flex: 1}}><label style={{fontSize: '0.8rem', fontWeight: 'bold'}}>Date</label><input type="date" name="date" value={shiftData.date} onChange={handleShiftChange} required style={{ padding: '8px', width: '100%', boxSizing: 'border-box' }} /></div>
                        </div>
                        
                        <label style={{ fontSize: '0.9em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#d32f2f', fontWeight: 'bold', background: '#ffebee', padding: '10px', borderRadius: '5px' }}>
                          <input type="checkbox" name="is_unavailable" checked={shiftData.is_unavailable} onChange={(e) => setShiftData({...shiftData, is_unavailable: e.target.checked})} />
                          Mark as Unavailable (Off / Leave)
                        </label>
                        
                        {!shiftData.is_unavailable && (
                          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            
                            <div style={{ marginBottom: '15px' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>Shift 1 (Primary):</label>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                <input type="text" name="start_1" value={shiftData.start_1} onChange={handleTimeInput} required placeholder="08:00" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" title="Format: HH:MM (e.g., 08:30)" style={{ padding: '8px', flex: 1, minWidth: 0, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }} />
                                <input type="text" name="end_1" value={shiftData.end_1} onChange={handleTimeInput} required placeholder="15:00" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" title="Format: HH:MM (e.g., 15:00)" style={{ padding: '8px', flex: 1, minWidth: 0, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }} />
                              </div>
                              <input type="text" name="role_1" value={shiftData.role_1} onChange={handleShiftChange} placeholder="Role (e.g., Pan, Larder)" required style={{ padding: '8px', width: '100%', marginTop: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
                            </div>

                            <hr style={{ borderTop: '1px dashed #cbd5e1', borderBottom: 'none', margin: '15px 0' }} />
                            
                            <div>
                              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Shift 2 (Optional - If Split):</label>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                <input type="text" name="start_2" value={shiftData.start_2} onChange={handleTimeInput} placeholder="16:30" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" title="Format: HH:MM (e.g., 16:30)" style={{ padding: '8px', flex: 1, minWidth: 0, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }} />
                                <input type="text" name="end_2" value={shiftData.end_2} onChange={handleTimeInput} placeholder="21:00" pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$" title="Format: HH:MM (e.g., 21:00)" style={{ padding: '8px', flex: 1, minWidth: 0, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }} />
                              </div>
                              <input type="text" name="role_2" value={shiftData.role_2} onChange={handleShiftChange} placeholder="Shift 2 Role (Optional)" style={{ padding: '8px', width: '100%', marginTop: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }} />
                              
                              {/* KOTAK INPUT CUSTOM RATE SHIFT 2 (HANYA MUNCUL DI HARI MINGGU) */}
                              {isSunday && (
                                <div style={{ marginTop: '10px', background: '#fff3e0', padding: '10px', borderRadius: '6px', border: '1px solid #ffe0b2' }}>
                                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#e65100' }}>Custom Rate / Hour for Sunday Shift 2 ($)</label>
                                  <input type="number" step="0.01" name="applied_rate_2" value={shiftData.applied_rate_2} onChange={handleShiftChange} placeholder="Leave blank for normal Sunday rate" style={{ padding: '8px', width: '100%', marginTop: '5px', boxSizing: 'border-box', border: '1px solid #ffcc80', borderRadius: '4px' }} />
                                </div>
                              )}
                            </div>

                          </div>
                        )}
                        <button type="submit" style={{ padding: '12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>Save Schedule</button>
                      </form>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
      )}

      {/* PIVOT REPORT TABLE */}
      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Roster & Payroll Report</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button onClick={handleDownloadExcel} style={{ padding: '8px 15px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              📥 Download Excel
            </button>
            <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '5px', display: 'flex', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Select Week Start (Monday):</label>
              <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ padding: '5px', fontSize: '1rem', cursor: 'pointer', border: '1px solid #90caf9', borderRadius: '4px' }} />
            </div>
          </div>
        </div>

        {loading ? <p style={{ padding: '20px', textAlign: 'center' }}>Loading payroll data...</p> : (
          <table border="1" style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            <thead style={{ backgroundColor: '#fdfdfd' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>Name</th>
                <th style={{ padding: '6px 4px' }}>Wkday Rate</th>
                <th style={{ padding: '6px 4px' }}>Sat Rate</th>
                <th style={{ padding: '6px 4px' }}>Sun Rate</th>
                
                <th style={{ padding: '6px 4px', backgroundColor: '#fff3e0' }}>Sun</th>
                <th style={{ padding: '6px 4px', backgroundColor: '#e3f2fd' }}>Sat</th>
                <th style={{ padding: '6px 4px' }}>Fri</th>
                <th style={{ padding: '6px 4px' }}>Thu</th>
                <th style={{ padding: '6px 4px' }}>Wed</th>
                <th style={{ padding: '6px 4px' }}>Tue</th>
                <th style={{ padding: '6px 4px' }}>Mon</th>
                
                <th style={{ padding: '6px 4px' }}>Total Wkday</th>
                <th style={{ padding: '6px 4px' }}>Total Sat</th>
                <th style={{ padding: '6px 4px' }}>Total Sun</th>
                <th style={{ padding: '6px 4px' }}>Grand Total</th>
                <th style={{ padding: '6px 4px', width: '80px' }}>Sales</th>
                <th style={{ padding: '6px 4px', width: '40px' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.map((staff) => (
                <tr key={staff.id}>
                  <td style={{ textAlign: 'left', padding: '6px 4px' }}>{staff.name}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.rate_weekday)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.rate_sat)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.rate_sun)}</td>
                  
                  <td style={{ padding: '6px 4px', backgroundColor: '#fff3e0' }}>{formatMoney(staff.pay_sun)}</td>
                  <td style={{ padding: '6px 4px', backgroundColor: '#e3f2fd' }}>{formatMoney(staff.pay_sat)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.pay_fri)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.pay_thu)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.pay_wed)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.pay_tue)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.pay_mon)}</td>
                  
                  <td style={{ padding: '6px 4px', fontWeight: 'bold' }}>{formatMoney(staff.total_weekday)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.pay_sat)}</td>
                  <td style={{ padding: '6px 4px' }}>{formatMoney(staff.pay_sun)}</td>
                  <td style={{ padding: '6px 4px', fontWeight: 'bold' }}>{formatMoney(staff.grand_total)}</td>
                  <td style={{ padding: '6px 4px' }}></td> 
                  <td style={{ padding: '6px 4px' }}></td> 
                </tr>
              ))}
            </tbody>
            
            <tfoot style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '10px 4px' }}>Grand Total</td>
                
                <td style={{ padding: '8px 4px', backgroundColor: '#fff3e0' }}>{formatMoney(footerTotals.sun)}</td>
                <td style={{ padding: '8px 4px', backgroundColor: '#e3f2fd' }}>{formatMoney(footerTotals.sat)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.fri)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.thu)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.wed)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.tue)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.mon)}</td>
                
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.weekday)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.sat)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.sun)}</td>
                <td style={{ padding: '8px 4px' }}>{formatMoney(footerTotals.grand)}</td>
                
                <td style={{ padding: '4px 0px', textAlign: 'right', paddingRight: '10px' }}>
                  {formatMoney(weeklySales)}
                </td> 
                
                <td style={{ padding: '8px 4px', textAlign: 'center', color: (weeklySales > 0 && ((footerTotals.grand / weeklySales) * 100) > 20) ? 'red' : 'green' }}>
                  {weeklySales > 0 ? ((footerTotals.grand / weeklySales) * 100).toFixed(2) : 0}%
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}