import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Function to check system preference
const getSystemTheme = () => 
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// Function to apply theme class to HTML element
const applyTheme = (theme) => {
  const root = document.documentElement;
  const systemTheme = getSystemTheme();
  
  if (theme === 'auto') {
    if (systemTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  console.log(`[Theme] Applied theme: ${theme === 'auto' ? `auto (${systemTheme})` : theme}`);
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'auto', // Default theme preference
      
      // Initialize theme based on preference and system setting
      initializeTheme: () => {
        const currentThemePreference = get().theme;
        console.log(`[Theme] Initializing with preference: ${currentThemePreference}`);
        applyTheme(currentThemePreference);

        // Add listener for system theme changes if 'auto' is selected
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
          if (get().theme === 'auto') {
            console.log('[Theme] System theme changed, applying auto.');
            applyTheme('auto');
          }
        };
        mediaQuery.addEventListener('change', handleChange);
        
        // Return cleanup function
        return () => mediaQuery.removeEventListener('change', handleChange);
      },

      // Action to set the theme preference
      setTheme: (newTheme) => {
        console.log(`[Theme] Setting theme preference to: ${newTheme}`);
        set({ theme: newTheme });
        applyTheme(newTheme);
      },
    }),
    {
      name: 'theme-storage', // Name of the item in localStorage
      getStorage: () => localStorage, // Use localStorage for persistence
    }
  )
);

// Initial call to apply theme on load
// This needs to be called once when the app loads, e.g., in App.jsx or index.js
// useThemeStore.getState().initializeTheme(); 
// We will call initializeTheme from App.jsx 