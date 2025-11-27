// theme/themeContext.tsx
import React, { createContext, useState, useMemo, useContext } from "react";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

const ThemeContext = createContext({
  toggleTheme: () => {},
  isDark: false,
});

export const useAppTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const theme = useMemo(() => {
    return isDark ? MD3DarkTheme : MD3LightTheme;
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ toggleTheme, isDark }}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}
