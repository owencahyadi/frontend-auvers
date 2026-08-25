import React, { createContext, useState, useEffect } from 'react';

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [activeStoreId, setActiveStoreId] = useState(() => {
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
      const user = JSON.parse(userStr);
      
      // JIKA USER ADALAH MANAGER: 
      // Abaikan localStorage yang lama, mutlak gunakan store_id dari akun user tersebut!
      if (user.role === 'manager' && user.store_id) {
        return String(user.store_id);
      }
    }
    
    // JIKA ADMIN: Boleh pakai ingatan localStorage terakhir, atau default ke '1'
    return localStorage.getItem('active_store_id') || '1';
  });

  // Setiap kali activeStoreId berubah, simpan ke localStorage
  useEffect(() => {
    // Manager tidak perlu menyimpan ke localStorage secara permanen untuk mencegah bentrok,
    // tapi tetap aman jika disimpan selama sesi login aktif.
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'manager' && user.store_id) {
        localStorage.setItem('active_store_id', String(user.store_id));
        return;
      }
    }
    
    localStorage.setItem('active_store_id', activeStoreId);
  }, [activeStoreId]);

  return (
    <StoreContext.Provider value={{ activeStoreId, setActiveStoreId }}>
      {children}
    </StoreContext.Provider>
  );
};