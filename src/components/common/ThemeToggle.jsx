import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../../hooks/useThemeStore'; // Adjust path as needed

const ThemeToggle = () => {
  const { theme: activeTheme, setTheme } = useThemeStore();

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    // Using Tailwind classes for styling, assuming Tailwind is configured
    // Added dark mode variants for background, border, text, and hover states
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-1">
      <div className="flex items-center space-x-1" role="radiogroup" aria-label="Select theme preference">
        {[
          { id: 'light', icon: Sun, label: 'Light' },
          { id: 'dark', icon: Moon, label: 'Dark' },
          { id: 'auto', icon: Monitor, label: 'Auto' }
        ].map((themeOption) => {
          const isActive = activeTheme === themeOption.id;
          const ThemeIcon = themeOption.icon;

          return (
            <button
              key={themeOption.id}
              className={`flex items-center justify-center px-3 py-1.5 rounded-md transition-colors duration-200 text-xs sm:text-sm ${ // Adjusted padding and text size
                isActive
                  ? 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-100 shadow-inner'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600/50 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              onClick={() => handleThemeChange(themeOption.id)}
              role="radio"
              aria-checked={isActive}
              aria-label={`${themeOption.label} theme`}
              title={`${themeOption.label} Theme`}
            >
              <ThemeIcon
                size={16} // Adjusted icon size
                className={`mr-1.5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} // Added color to active icon
              />
              {themeOption.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeToggle; 