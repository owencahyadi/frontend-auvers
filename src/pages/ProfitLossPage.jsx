import { useState, useEffect } from 'react';
import api from '../utils/api'; 
import * as XLSX from 'xlsx';

export default function ProfitLossPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [selectedMonth, setSelectedMonth] = useState('2026-06');

  // --- GET USER ROLE FOR PERMISSION CHECK ---
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const isAdmin = user.role === 'admin';

  const fetchMonthlyReport = () => {
    setLoading(true);
    setFeedback({ type: '', text: '' });

    api.get(`/profit-loss/monthly?month=${selectedMonth}`)
      .then(res => {
        setReportData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setFeedback({ type: 'error', text: 'Failed to load monthly P&L report data.' });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMonthlyReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateTotal = (key, subKey = null) => {
    if (!reportData || !reportData.weeks) return 0;
    return reportData.weeks.reduce((sum, week) => {
      let val = 0;
      if (subKey) {
        val = (week[key] && week[key][subKey]) ? parseFloat(week[key][subKey]) : 0;
      } else {
        val = week[key] ? parseFloat(week[key]) : 0;
      }
      return sum + val;
    }, 0);
  };

  const handleSalesChange = (weekIndex, category, value) => {
    // Prevent managers from modifying state even locally
    if (!isAdmin) return;
    if (!reportData || !reportData.weeks) return;

    const updatedWeeks = [...reportData.weeks];
    const currentWeek = { ...updatedWeeks[weekIndex] };

    if (!currentWeek.sales) currentWeek.sales = { Food: 0, Beverage: 0, Alcohol: 0, Stall: 0 };
    currentWeek.sales[category] = parseFloat(value) || 0;

    currentWeek.total_sales = ['Food', 'Beverage', 'Alcohol', 'Stall'].reduce(
      (sum, cat) => sum + (parseFloat(currentWeek.sales[cat]) || 0),
      0
    );

    currentWeek.gross_profit = currentWeek.total_sales - (parseFloat(currentWeek.total_cogs) || 0);
    currentWeek.net_profit = currentWeek.gross_profit - (parseFloat(currentWeek.labor_cost) || 0) - (parseFloat(currentWeek.operational_costs) || 0);

    updatedWeeks[weekIndex] = currentWeek;
    setReportData({ ...reportData, weeks: updatedWeeks });
  };

  const saveSalesToDatabase = () => {
    if (!isAdmin) return;
    if (!reportData || !reportData.weeks) return;
    
    setLoading(true);
    setFeedback({ type: '', text: '' });

    api.post('/profit-loss/sales', { weeks: reportData.weeks })
      .then(() => {
        setFeedback({ type: 'success', text: 'Sales data successfully saved to database!' });
        fetchMonthlyReport(); 
      })
      .catch(err => {
        console.error(err);
        setFeedback({ type: 'error', text: 'Failed to save sales data.' });
        setLoading(false);
      });
  };

  const handleDownloadExcel = () => {
    if (!reportData || !reportData.weeks) {
      alert("No data available to download.");
      return;
    }

    const headers = ['Category', ...reportData.weeks.map(w => w.week_label), 'Total Monthly'];
    const rows = [];
    rows.push(headers);

    rows.push(['SALES']);
    ['Food', 'Beverage', 'Alcohol', 'Stall'].forEach(cat => {
      const rowData = [cat];
      reportData.weeks.forEach(w => rowData.push(parseFloat(w.sales?.[cat]) || 0));
      rowData.push(calculateTotal('sales', cat));
      rows.push(rowData);
    });
    
    const totalSalesRow = ['Total Sales'];
    reportData.weeks.forEach(w => totalSalesRow.push(parseFloat(w.total_sales) || 0));
    totalSalesRow.push(calculateTotal('total_sales'));
    rows.push(totalSalesRow);

    rows.push(['COST OF GOODS SOLD']);
    ['Food', 'Beverage', 'Alcohol', 'Stall', 'Packaging'].forEach(cat => {
      const rowData = [cat];
      reportData.weeks.forEach(w => rowData.push(parseFloat(w.cogs_by_category?.[cat]) || 0));
      rowData.push(calculateTotal('cogs_by_category', cat));
      rows.push(rowData);
    });

    const totalCogsRow = ['Total COGS'];
    reportData.weeks.forEach(w => totalCogsRow.push(parseFloat(w.total_cogs) || 0));
    totalCogsRow.push(calculateTotal('total_cogs'));
    rows.push(totalCogsRow);

    const gpRow = ['GROSS PROFIT'];
    reportData.weeks.forEach(w => gpRow.push(parseFloat(w.gross_profit) || 0));
    gpRow.push(calculateTotal('gross_profit'));
    rows.push(gpRow);

    rows.push(['EXPENSES']);
    
    const laborRow = ['Labor Cost'];
    reportData.weeks.forEach(w => laborRow.push(parseFloat(w.labor_cost) || 0));
    laborRow.push(calculateTotal('labor_cost'));
    rows.push(laborRow);

    const opexRow = ['Operational Costs'];
    reportData.weeks.forEach(w => opexRow.push(parseFloat(w.operational_costs) || 0));
    opexRow.push(calculateTotal('operational_costs'));
    rows.push(opexRow);

    const npRow = ['NET PROFIT / LOSS'];
    reportData.weeks.forEach(w => npRow.push(parseFloat(w.net_profit) || 0));
    npRow.push(calculateTotal('net_profit'));
    rows.push(npRow);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "P&L Report");
    
    XLSX.writeFile(workbook, `P&L_Report_${selectedMonth}.xlsx`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>
          📊 Monthly Profit & Loss Report
        </h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleDownloadExcel}
            style={{ padding: '10px 20px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📥 Download Excel
          </button>

          {/* ADMIN ONLY: SAVE SALES DATA BUTTON */}
          {isAdmin && (
            <button 
              onClick={saveSalesToDatabase}
              disabled={loading}
              style={{ padding: '10px 20px', background: loading ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {loading ? 'Saving...' : '💾 Save Sales Data'}
            </button>
          )}
        </div>
      </div>
      
      <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>
        {isAdmin ? "Weekly P&L performance summary and management for the selected month." : "Read-only weekly P&L performance summary for your branch."}
      </p>

      {/* MONTH FILTER */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '15px' }}>
        <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Select Month:</label>
        <input 
          type="month" 
          value={selectedMonth} 
          onChange={e => setSelectedMonth(e.target.value)} 
          style={{ padding: '8px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '4px' }} 
        />
        <button 
          onClick={fetchMonthlyReport}
          style={{ padding: '8px 15px', background: '#0d47a1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Refresh Data
        </button>
      </div>

      {feedback.text && (
        <div style={{ padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: feedback.type === 'success' ? '#e8f5e9' : '#ffebee', color: feedback.type === 'success' ? '#2e7d32' : '#c62828' }}>
          {feedback.text}
        </div>
      )}

      {/* P&L TABLE */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', overflowX: 'auto' }}>
        {loading ? (
          <p style={{ padding: '20px', textAlign: 'center' }}>Loading data...</p>
        ) : !reportData || !reportData.weeks ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No report data available for this month.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '12px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0', width: '200px' }}>Category</th>
                {reportData.weeks.map((week, idx) => (
                  <th key={idx} style={{ padding: '12px 15px', borderRight: '1px solid #e2e8f0' }}>
                    {week.week_label}
                  </th>
                ))}
                <th style={{ padding: '12px 15px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                  Total Monthly
                </th>
              </tr>
            </thead>
            <tbody>
              
              {/* --- SECTION: SALES --- */}
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                <td style={{ padding: '10px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>SALES</td>
                <td colSpan={reportData.weeks.length + 1}></td>
              </tr>
              {['Food', 'Beverage', 'Alcohol', 'Stall'].map(cat => (
                <tr key={`sales-${cat}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0', paddingLeft: '30px' }}>{cat}</td>
                  
                  {reportData.weeks.map((week, idx) => (
                    <td key={idx} style={{ padding: '8px 15px', borderRight: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                        <span style={{ color: '#64748b' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={week.sales?.[cat] ?? ''}
                          onChange={(e) => handleSalesChange(idx, cat, e.target.value)}
                          disabled={!isAdmin} // <--- LOCKED FOR MANAGERS (READ-ONLY)
                          style={{
                            width: '80px',
                            padding: '6px',
                            textAlign: 'right',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            backgroundColor: isAdmin ? '#fff' : '#f1f5f9',
                            cursor: isAdmin ? 'text' : 'not-allowed',
                            color: isAdmin ? '#000' : '#475569',
                            fontWeight: isAdmin ? 'normal' : 'bold'
                          }}
                        />
                      </div>
                    </td>
                  ))}
                  
                  <td style={{ padding: '8px 15px', fontWeight: 'bold', backgroundColor: '#f8fafc', verticalAlign: 'middle' }}>
                    {formatCurrency(calculateTotal('sales', cat))}
                  </td>
                </tr>
              ))}
              <tr style={{ borderBottom: '2px solid #cbd5e1', fontWeight: 'bold' }}>
                <td style={{ padding: '10px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>Total Sales</td>
                {reportData.weeks.map((week, idx) => (
                  <td key={idx} style={{ padding: '10px 15px', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(week.total_sales || 0)}</td>
                ))}
                <td style={{ padding: '10px 15px', backgroundColor: '#e0f2fe' }}>{formatCurrency(calculateTotal('total_sales'))}</td>
              </tr>

              {/* --- SECTION: COGS --- */}
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                <td style={{ padding: '10px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>COST OF GOODS SOLD</td>
                <td colSpan={reportData.weeks.length + 1}></td>
              </tr>
              {['Food', 'Beverage', 'Alcohol', 'Stall', 'Packaging'].map(cat => (
                <tr key={`cogs-${cat}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0', paddingLeft: '30px' }}>{cat}</td>
                  {reportData.weeks.map((week, idx) => (
                    <td key={idx} style={{ padding: '8px 15px', borderRight: '1px solid #e2e8f0' }}>
                      {formatCurrency(week.cogs_by_category?.[cat] || 0)}
                    </td>
                  ))}
                  <td style={{ padding: '8px 15px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                    {formatCurrency(calculateTotal('cogs_by_category', cat))}
                  </td>
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid #cbd5e1', fontWeight: 'bold', color: '#c62828' }}>
                <td style={{ padding: '10px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>Total COGS</td>
                {reportData.weeks.map((week, idx) => (
                  <td key={idx} style={{ padding: '10px 15px', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(week.total_cogs || 0)}</td>
                ))}
                <td style={{ padding: '10px 15px', backgroundColor: '#e0f2fe' }}>{formatCurrency(calculateTotal('total_cogs'))}</td>
              </tr>

              {/* --- GROSS PROFIT --- */}
              <tr style={{ borderBottom: '2px solid #cbd5e1', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '12px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>GROSS PROFIT</td>
                {reportData.weeks.map((week, idx) => (
                  <td key={idx} style={{ padding: '12px 15px', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(week.gross_profit || 0)}</td>
                ))}
                <td style={{ padding: '12px 15px', backgroundColor: '#e0f2fe' }}>{formatCurrency(calculateTotal('gross_profit'))}</td>
              </tr>

              {/* --- SECTION: LABOR COST & OPEX --- */}
              <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                <td style={{ padding: '10px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0' }}>EXPENSES</td>
                <td colSpan={reportData.weeks.length + 1}></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0', paddingLeft: '30px' }}>Labor Cost</td>
                {reportData.weeks.map((week, idx) => (
                  <td key={idx} style={{ padding: '10px 15px', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(week.labor_cost || 0)}</td>
                ))}
                <td style={{ padding: '10px 15px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>{formatCurrency(calculateTotal('labor_cost'))}</td>
              </tr>
              <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                <td style={{ padding: '10px 15px', textAlign: 'left', borderRight: '1px solid #e2e8f0', paddingLeft: '30px' }}>Operational Costs</td>
                {reportData.weeks.map((week, idx) => (
                  <td key={idx} style={{ padding: '10px 15px', borderRight: '1px solid #e2e8f0' }}>{formatCurrency(week.operational_costs || 0)}</td>
                ))}
                <td style={{ padding: '10px 15px', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>{formatCurrency(calculateTotal('operational_costs'))}</td>
              </tr>

              {/* --- NET PROFIT --- */}
              <tr style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                <td style={{ padding: '15px', textAlign: 'left', borderRight: '1px solid #e2e8f0', backgroundColor: '#0f172a', color: '#fff' }}>NET PROFIT / LOSS</td>
                {reportData.weeks.map((week, idx) => {
                  const np = parseFloat(week.net_profit || 0);
                  return (
                    <td key={idx} style={{ padding: '15px', borderRight: '1px solid #e2e8f0', color: np < 0 ? '#ef4444' : '#16a34a' }}>
                      {formatCurrency(np)}
                    </td>
                  );
                })}
                <td style={{ padding: '15px', backgroundColor: '#0284c7', color: '#fff' }}>
                  {formatCurrency(calculateTotal('net_profit'))}
                </td>
              </tr>

            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}