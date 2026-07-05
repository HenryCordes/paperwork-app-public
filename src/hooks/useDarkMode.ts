import { useState, useEffect } from 'react';

/**
 * Hook to detect and track dark mode preference from system settings
 * @returns Boolean indicating whether dark mode is active
 */
export const useDarkMode = (): boolean => {
  // Initialize state with current system preference
  const [isDarkMode, setDarkMode] = useState<boolean>(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Update state when preference changes
    const handleChange = (e: MediaQueryListEvent) => {
      console.log(`${e.matches ? "Dark" : "Light"} mode detected`);
      setDarkMode(e.matches);
    };

    // Add listener for changes
    mediaQuery.addEventListener("change", handleChange);

    // Clean up listener
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isDarkMode;
};

export default useDarkMode;
