import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  accentColor: '#3B82F6',
  setAccentColor: () => {},
});

const accentColorMap: Record<string, { [key: string]: string }> = {
  '#3B82F6': { 400: '96 165 250', 500: '59 130 246', 600: '37 99 235' }, // Blue
  '#8B5CF6': { 400: '167 139 250', 500: '139 92 246', 600: '124 58 237' }, // Purple
  '#06B6D4': { 400: '34 211 238', 500: '6 182 212', 600: '8 145 178' }, // Cyan
  '#10B981': { 400: '52 211 153', 500: '16 185 129', 600: '5 150 105' }, // Emerald
  '#F59E0B': { 400: '251 191 36', 500: '245 158 11', 600: '217 119 6' }, // Amber
  '#EC4899': { 400: '244 114 182', 500: '236 72 153', 600: '219 39 119' }, // Pink
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [accentColor, setAccentColorState] = useState<string>('#3B82F6');

  // Load accent color from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('settings_accentColor');
      if (stored) setAccentColorState(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    window.localStorage.setItem('settings_accentColor', JSON.stringify(color));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  useEffect(() => {
    const colors = accentColorMap[accentColor] || accentColorMap['#3B82F6'];
    document.documentElement.style.setProperty('--primary-400', colors[400]);
    document.documentElement.style.setProperty('--primary-500', colors[500]);
    document.documentElement.style.setProperty('--primary-600', colors[600]);
  }, [accentColor]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, toggleTheme, accentColor, setAccentColor }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
