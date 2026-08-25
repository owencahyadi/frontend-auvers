import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. KITA HAPUS pemanggilan csrf-cookie karena sudah pakai Token
      
      // 2. Langsung kirim request login ke endpoint backend
      const response = await api.post('/login', { 
        email, 
        password 
      });
      
      if (response.data.status === 'success') {
        const userData = response.data.user;
        const token = response.data.token; // Ambil token dari respon backend

        // 3. Simpan token dan data user ke localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Simpan store_id otomatis jika yang login adalah manager
        if (userData.role === 'manager' && userData.store_id) {
          localStorage.setItem('active_store_id', String(userData.store_id));
        } else if (userData.role === 'admin' && !localStorage.getItem('active_store_id')) {
          localStorage.setItem('active_store_id', '1');
        }

        navigate('/'); 
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else if (err.response?.status === 422) {
        // Error validasi input dari backend
        const errors = err.response.data.errors;
        setError(errors[Object.keys(errors)[0]][0]);
      } else if (err.response?.status === 401) {
        // Error karena email/password salah (Unauthorized)
        setError('Email atau password salah.');
      } else {
        setError('A server error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#0f172a' }}>Login F&B System</h2>
        
        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', marginTop: '5px' }} 
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', marginTop: '5px' }} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: '12px', 
              background: loading ? '#94a3b8' : '#0ea5e9', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}