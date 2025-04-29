import { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle() {
  const [activeTheme, setActiveTheme] = useState('light');
  
  const handleThemeChange = (theme) => {
    setActiveTheme(theme);
  };
  
  return (
    <div className="flex justify-center items-center w-full max-w-md mx-auto my-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-1.5 backdrop-blur-sm">
        <div className="flex items-center" role="radiogroup" aria-label="Select theme preference">
          {[
            { id: 'light', icon: Sun, label: 'Light' },
            { id: 'dark', icon: Moon, label: 'Dark' },
            { id: 'auto', icon: Monitor, label: 'Auto' }
          ].map((theme) => {
            const isActive = activeTheme === theme.id;
            const ThemeIcon = theme.icon;
            
            return (
              <button
                key={theme.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleThemeChange(theme.id)}
                role="radio"
                aria-checked={isActive}
                aria-label={`${theme.label} theme`}
              >
                <ThemeIcon 
                  size={20} 
                  className={`${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
                />
                <span className="font-medium text-sm">{theme.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}