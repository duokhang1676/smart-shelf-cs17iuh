// context/ShelfContext.tsx
import { createContext, useContext, useState } from 'react';

interface ShelfContextType {
  reloadFlag: boolean;
  triggerReload: () => void;
}

const ShelfContext = createContext<ShelfContextType | undefined>(undefined);

export const ShelfProvider = ({ children }: { children: React.ReactNode }) => {
  const [reloadFlag, setReloadFlag] = useState(false);

  const triggerReload = () => setReloadFlag(prev => !prev);

  return (
    <ShelfContext.Provider value={{ reloadFlag, triggerReload }}>
      {children}
    </ShelfContext.Provider>
  );
};

export const useShelfContext = () => {
  const context = useContext(ShelfContext);
  if (!context) throw new Error('useShelfContext must be used within ShelfProvider');
  return context;
};
