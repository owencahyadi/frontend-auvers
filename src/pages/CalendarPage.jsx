import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState('2026-06-22');
  const [employees, setEmployees] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Menambahkan useRef untuk menargetkan elemen tabel yang akan di-PDF-kan
  const tableRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/employees'),
      api.get(`/rosters/calendar?start_date=${weekStart}`)
    ]).then(([empRes, rosterRes]) => {
      setEmployees(empRes.data.data);
      setRosters(rosterRes.data.data);
      setLoading(false);
    }).catch(() => {
      alert("Failed to fetch calendar data.");
      setLoading(false);
    });
  }, [weekStart]);

  // --- HELPER FORMATTING FUNCTIONS ---
  
  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const getWeekDates = (startStr) => {
    const dates = [];
    const [y, m, d] = startStr.split('-');
    let current = new Date(y, m - 1, d);
    for (let i = 0; i < 7; i++) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const formatDuration = (decimalHours) => {
    if (!decimalHours || decimalHours === 0) return '0h 0m';
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getRoleColor = (role) => {
    if (!role) return 'transparent';
    const r = role.toLowerCase();
    if (r.includes('pan')) return '#22c55e'; // Green
    if (r.includes('larder')) return '#fbbf24'; // Yellow/Gold
    if (r.includes('pass')) return '#38bdf8'; // Light Blue
    if (r.includes('kitchen') || r.includes('hand')) return '#f87171'; // Red/Salmon
    return '#cbd5e1'; // Default Gray
  };

  const weekDates = getWeekDates(weekStart);

  const dailyTotals = weekDates.map(date => {
    return rosters.filter(r => r.date === date).reduce((sum, r) => sum + parseFloat(r.total_hours || 0), 0);
  });
  const grandTotalWeek = dailyTotals.reduce((sum, val) => sum + val, 0);

  // --- FUNGSI DOWNLOAD PDF ---
  const handleDownloadPDF = () => {
    const input = tableRef.current;
    if (!input) return;

    // Tambahkan style sementara agar saat dipotret tidak terpotong (overflow)
    input.style.overflow = 'visible'; 
    input.style.width = 'max-content';

    // Scale 2 digunakan agar hasil PDF tidak blur/pecah
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      
      // Orientasi L (Landscape), ukuran kertas A4
      const pdf = new jsPDF('l', 'mm', 'a4'); 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Menghitung rasio tinggi gambar agar proporsional
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`Kitchen_Roster_${weekStart}.pdf`);

      // Kembalikan style elemen seperti semula
      input.style.overflow = 'auto';
      input.style.width = '100%';
    });
  };

  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Operational Shift Calendar</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', flexWrap: 'wrap', gap: '15px' }}>
        <h3 style={{ margin: 0 }}>Weekly Kitchen Roster</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* TOMBOL DOWNLOAD PDF */}
          <button 
            onClick={handleDownloadPDF} 
            style={{ padding: '8px 15px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            📥 Download PDF
          </button>
          
          <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '5px' }}>
            <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Select Week Start (Monday):</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} style={{ padding: '5px', fontSize: '1rem', cursor: 'pointer', border: '1px solid #90caf9', borderRadius: '4px' }} />
          </div>
        </div>
      </div>

      {/* Tambahkan ref={tableRef} pada div pembungkus tabel */}
      <div ref={tableRef} style={{ overflowX: 'auto', background: '#fff', border: '1px solid #999', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', width: '100%' }}>
        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center', fontWeight: 'bold' }}>Loading Calendar...</p>
        ) : (
          <table border="1" style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'Arial, sans-serif' }}>
            
            {/* HEADER ROW 1: DAY NAMES */}
            <thead style={{ backgroundColor: '#757575', color: '#fff' }}>
              <tr>
                <th rowSpan="2" style={{ padding: '10px', minWidth: '100px', backgroundColor: '#616161', fontSize: '1rem' }}>Name</th>
                {weekDates.map(date => (
                  <th key={date} colSpan="5" style={{ padding: '8px', borderLeft: '2px solid #424242', borderRight: '2px solid #424242', fontSize: '0.9rem' }}>
                    {formatDateHeader(date)}
                  </th>
                ))}
                <th rowSpan="2" style={{ padding: '10px', backgroundColor: '#616161', width: '80px' }}>Weekly<br/>Hours</th>
              </tr>
              
              {/* HEADER ROW 2: START/END COLUMNS */}
              <tr style={{ backgroundColor: '#eeeeee', color: '#333' }}>
                {weekDates.map(date => (
                  <React.Fragment key={date}>
                    <th style={{ padding: '5px', borderLeft: '2px solid #424242', width: '40px' }}>Start</th>
                    <th style={{ padding: '5px', width: '40px' }}>End</th>
                    <th style={{ padding: '5px', width: '40px' }}>Start</th>
                    <th style={{ padding: '5px', width: '40px' }}>End</th>
                    <th style={{ padding: '5px', borderRight: '2px solid #424242', width: '50px', backgroundColor: '#e0e0e0' }}>Total</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody>
              {employees.map(emp => {
                let weeklyHours = 0;

                return (
                  <tr key={emp.id} style={{ backgroundColor: '#f5f5f5' }}>
                    <td style={{ padding: '8px', textAlign: 'left', fontWeight: 'bold', backgroundColor: '#9e9e9e', color: '#fff' }}>
                      {emp.name}
                    </td>
                    
                    {weekDates.map(date => {
                      const shift = rosters.find(r => r.employee_id === emp.id && r.date === date);
                      const hours = shift ? parseFloat(shift.total_hours) : 0;
                      weeklyHours += hours;

                      // IF UNAVAILABLE / OFF
                      if (shift && shift.is_unavailable) {
                        return (
                          <React.Fragment key={date}>
                            <td colSpan="4" style={{ 
                              borderLeft: '2px solid #424242', 
                              background: 'repeating-linear-gradient(45deg, #d4d4d4, #d4d4d4 10px, #c2c2c2 10px, #c2c2c2 20px)', 
                              color: '#fff', fontWeight: 'bold', fontStyle: 'italic'
                            }}>
                              Unavailable
                            </td>
                            <td style={{ borderRight: '2px solid #424242', backgroundColor: '#fff' }}>0h 0m</td>
                          </React.Fragment>
                        );
                      }

                      // IF NORMAL SHIFT
                      return (
                        <React.Fragment key={date}>
                          
                          {/* SHIFT 1 */}
                          {shift && shift.start_1 ? (
                            <td colSpan="2" style={{ borderLeft: '2px solid #424242', padding: '2px', verticalAlign: 'top', backgroundColor: '#fff' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', padding: '2px 5px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                <span>{formatTime(shift.start_1)}</span>
                                <span>-</span>
                                <span>{formatTime(shift.end_1)}</span>
                              </div>
                              <div style={{ 
                                backgroundColor: getRoleColor(shift.role_1), 
                                color: '#000', fontWeight: 'bold', padding: '2px', marginTop: '2px', borderRadius: '2px' 
                              }}>
                                {shift.role_1}
                              </div>
                            </td>
                          ) : (
                            <td colSpan="2" style={{ borderLeft: '2px solid #424242', backgroundColor: '#e0e0e0' }}></td>
                          )}

                          {/* SHIFT 2 */}
                          {shift && shift.start_2 ? (
                            <td colSpan="2" style={{ padding: '2px', verticalAlign: 'top', backgroundColor: '#fff' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', padding: '2px 5px', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                <span>{formatTime(shift.start_2)}</span>
                                <span>-</span>
                                <span>{formatTime(shift.end_2)}</span>
                              </div>
                              <div style={{ 
                                backgroundColor: getRoleColor(shift.role_2), 
                                color: '#000', fontWeight: 'bold', padding: '2px', marginTop: '2px', borderRadius: '2px' 
                              }}>
                                {shift.role_2}
                              </div>
                            </td>
                          ) : (
                            <td colSpan="2" style={{ backgroundColor: '#e0e0e0' }}></td>
                          )}

                          {/* DAILY TOTAL */}
                          <td style={{ borderRight: '2px solid #424242', backgroundColor: '#fff', fontWeight: 'bold' }}>
                            {formatDuration(hours)}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* EMPLOYEE WEEKLY TOTAL */}
                    <td style={{ backgroundColor: '#ef5350', color: '#fff', fontWeight: 'bold' }}>
                      {formatDuration(weeklyHours)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            
            {/* FOOTER: OVERALL TOTAL HOURS */}
            <tfoot style={{ backgroundColor: '#757575', color: '#fff' }}>
              <tr>
                <td style={{ padding: '10px', fontWeight: 'bold', textAlign: 'left' }}>Total Hours</td>
                {dailyTotals.map((total, index) => (
                  <React.Fragment key={`total-${index}`}>
                    <td colSpan="4" style={{ borderLeft: '2px solid #424242' }}></td>
                    <td style={{ borderRight: '2px solid #424242', padding: '8px', backgroundColor: '#fdd835', color: '#000', fontWeight: 'bold' }}>
                      {formatDuration(total)}
                    </td>
                  </React.Fragment>
                ))}
                <td style={{ backgroundColor: '#d32f2f', padding: '8px', fontWeight: 'bold' }}>
                  {formatDuration(grandTotalWeek)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}