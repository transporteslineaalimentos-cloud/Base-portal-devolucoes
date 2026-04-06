import { useEffect, useState } from "react";
const KEY = "portal_theme_mode";
function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.body.classList.remove('theme-light', 'theme-dark');
  document.documentElement.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);
  document.documentElement.classList.add(`theme-${theme}`);
}
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => { applyTheme(theme); if (typeof window !== 'undefined') window.localStorage.setItem(KEY, theme); }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}
