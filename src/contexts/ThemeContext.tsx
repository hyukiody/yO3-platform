import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

/**
 * ThemeContext - Manages theme switching between Default and Fresh modes
 * 
 * SPEC: SPEC-001_EXTENDED_ANALYSIS.md §6
 * GDAI Assertion: Fresh mode activates ONLY for safe contexts with verified encryption
 */

type ThemeMode = 'default' | 'fresh';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleFreshMode: (encryptionVerified: boolean) => void;
  isFreshMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  defaultTheme = 'default' 
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'fresh') {
      root.setAttribute('data-theme', 'fresh');
    } else {
      root.removeAttribute('data-theme');
    }

    // Cleanup on unmount
    return () => {
      root.removeAttribute('data-theme');
    };
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
  }, []);

  /**
   * GDAI Assertion: Toggle Fresh mode with encryption verification gate
   * Fresh mode MUST only activate when encryption is verified
   */
  const toggleFreshMode = useCallback((encryptionVerified: boolean) => {
    if (encryptionVerified) {
      setThemeState('fresh');
    } else {
      // GDAI: Deny fresh mode if encryption not verified
      setThemeState('default');
      console.warn('[ThemeContext] Fresh mode denied: encryption not verified');
    }
  }, []);

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleFreshMode,
    isFreshMode: theme === 'fresh',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Hook for vault/safe components that need Fresh mode
 * Automatically handles GDAI assertion
 */
export const useFreshMode = (encryptionVerified: boolean) => {
  const { toggleFreshMode, isFreshMode, setTheme } = useTheme();

  useEffect(() => {
    if (encryptionVerified) {
      toggleFreshMode(true);
    }
    
    // Revert to default when component unmounts or encryption fails
    return () => {
      setTheme('default');
    };
  }, [encryptionVerified, toggleFreshMode, setTheme]);

  return { isFreshMode, encryptionVerified };
};

export default ThemeContext;
