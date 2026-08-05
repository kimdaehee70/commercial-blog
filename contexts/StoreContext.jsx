// contexts/StoreContext.jsx (stub — 35차 archive 대응)
// 원본: _archive_34ch/contexts/StoreContext.jsx
// stores 테이블 + lib/store/* archive로 인한 stub
// 회원 시스템 재설계 시 재작성

import { createContext, useContext } from 'react';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const value = {
    authUser: null,
    stores: [],
    currentStore: null,
    hydrating: false,
    isAnonymous: true,
    industry: null,
    storeId: null,
    profile: null,
    switchStore: async () => null,
    refreshCurrentStore: async () => null,
  };
  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
