import axios from 'axios';

const api = axios.create({
    baseURL: 'https://backend-auvers.onrender.com',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true,
    withXSRFToken: true,
});

// Axios Interceptor: Menempelkan ID Toko secara otomatis sebelum request dikirim
api.interceptors.request.use((config) => {
    // 1. Ambil ID toko yang sedang aktif dari localStorage
    const storeId = localStorage.getItem('active_store_id');
    
    // 2. Jika ID ditemukan, sisipkan ke dalam Header
    if (storeId) {
        config.headers['X-Store-ID'] = storeId;
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;