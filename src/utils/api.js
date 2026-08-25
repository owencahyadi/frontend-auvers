import axios from 'axios';

const api = axios.create({
    baseURL: 'https://backend-auvers.onrender.com/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    // withCredentials dan withXSRFToken tidak dipakai lagi untuk sistem Token
});

// Axios Interceptor: Menempelkan Token & ID Toko secara otomatis sebelum request dikirim
api.interceptors.request.use((config) => {
    // 1. Ambil Token Autentikasi dari localStorage
    const token = localStorage.getItem('token');
    
    // Jika token ada, sisipkan ke dalam Header Authorization
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Ambil ID toko yang sedang aktif dari localStorage
    const storeId = localStorage.getItem('active_store_id');
    
    // Jika ID toko ada, sisipkan ke dalam Header X-Store-ID
    if (storeId) {
        config.headers['X-Store-ID'] = storeId;
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;