// theme/theme.tsx
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

declare module "react-native-paper" {
  interface MD3Colors {
    gradientColors: string[];
  }
}

// Light Theme
export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,

    primary: "#0077B2",
    secondary: "#FDAE37",
    background: "#0077B2",
    surface: "#FFFFFF",
    text: "#2F3E46",

    error: "#E07A5F",
    onPrimary: "#FFFFFF",
    onBackground: "#FFFFFF",
    onSurface: "#FFFFFF",
    button: "#0077B2",

    gradientColors: [
          "#EDF9FF",
          "#EDF9FF", 
          "#66CCFF",
          "#66CCFF",
          "#66CCFF",
          "#66CCFF",
    ],
  },
};

// Dark Theme
export const DarkThemeCustom = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,

    primary: "#FFFFFF",
    secondary: "#FDAE37",
    background: "#FFFFFF",
    surface: "#1E1E1E",
    text: "#FFFFFF",

    error: "#E07A5F",
    onPrimary: "#333F5B",
    onBackground: "#FFFFFF",
    onSurface: "#FFFFFF",
    button: "#242E94",


    gradientColors: [
          "#03040D",
          "#172647",
          "#172647",
          "#38466D",
          "#38466D",

    ],
  },
};

// Navigation Themes
export const NavigationLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: LightTheme.colors.background,
    primary: LightTheme.colors.primary,
    card: LightTheme.colors.surface,
    text: LightTheme.colors.text,
  },
};

export const NavigationDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: DarkThemeCustom.colors.background,
    primary: DarkThemeCustom.colors.primary,
    card: DarkThemeCustom.colors.surface,
    text: DarkThemeCustom.colors.text,
  },
};
