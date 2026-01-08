// app/_layout.tsx
import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useState, useMemo, createContext, useContext } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";
import { Provider as PaperProvider } from "react-native-paper";
import { AutoLogoutWrapper } from "../components/AutoLogout";

import {
  LightTheme,
  DarkThemeCustom,
  NavigationLight,
  NavigationDark,
} from "../theme/theme";

// ---- Theme Context ----
const ThemeContext = createContext({
  isDark: false,
  toggleTheme: () => {},
});
export const useAppTheme = () => useContext(ThemeContext);

export default function RootLayout() {
  const [isDark, setIsDark] = useState(true);

  const paperTheme = useMemo(
    () => (isDark ? DarkThemeCustom : LightTheme),
    [isDark]
  );
  const navTheme = useMemo(
    () => (isDark ? NavigationDark : NavigationLight),
    [isDark]
  );

  const [user, setUser] = useState<User | null>(null);
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider
        value={{
          isDark,
          toggleTheme: () => setIsDark((prev) => !prev),
        }}
      >
        <PaperProvider theme={paperTheme}>
          <NavigationThemeProvider value={navTheme}>
            
            {/* 2. WRAP THE STACK HERE */}
            <AutoLogoutWrapper>
              <Stack screenOptions={{ headerShown: false }}>
                {user ? (
                  <Stack.Screen name="(tabs)" />
                ) : (
                  <Stack.Screen name="(auth)" />
                )}
              </Stack>
            </AutoLogoutWrapper>
            
            <StatusBar style={isDark ? "light" : "dark"} />
          </NavigationThemeProvider>
        </PaperProvider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
