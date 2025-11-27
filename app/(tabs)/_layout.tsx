// app/(tabs)/_layout.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  GestureResponderEvent,
} from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
      tabBar={({ state, descriptors, navigation }) => (
        <View
          style={[
            styles.floatingTabBar,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];

            // 👇 Friendly names
            let iconName: string;
            let label: string;
            if (route.name === "index") {
              iconName = "home";
              label = "Home";
            } else if (route.name === "volts") {
              iconName = "swap-vert-circle";
              label = "Rent/Return"; // Or "Volt" if you want it branded
            } else if (route.name === "transaction") {
              iconName = "list";
              label = "Transactions";
            } else return null;

            const isFocused = state.index === index;

            return (
              <TabButton
                key={route.key}
                iconName={iconName}
                isFocused={isFocused}
                onPress={() => navigation.navigate(route.name)}
                theme={theme}
                label={label}
              />
            );
          })}
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="volts" />
      <Tabs.Screen name="transaction" />
    </Tabs>
  );
}

function TabButton({
  iconName,
  isFocused,
  onPress,
  theme,
  label,
}: {
  iconName: string;
  isFocused: boolean;
  onPress: (e?: GestureResponderEvent) => void;
  theme: any;
  label: string;
}) {
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.2 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.2 : 1,
      useNativeDriver: true,
      friction: 6,
    }).start();
  }, [isFocused]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <MaterialIcons
          name={iconName as any}
          size={24}
          color={isFocused ? theme.colors.background : theme.colors.background}
        />
        <Text
          style={{
            color: isFocused ? theme.colors.background : theme.colors.background,
            fontSize: 12,
          }}
        >
          {label}
        </Text>
        {/* {isFocused && (
          <View
            style={{
              height: 3,
              width: 20,
              backgroundColor: theme.colors.primary,
              borderRadius: 2,
              marginTop: 4,
            }}
          />
        )} */}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  floatingTabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    position: "absolute",
    bottom: 25,
    left: 25,
    right: 25,
    height: 65,
    borderRadius: 35,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    flexDirection: "column", // 👈 stack icon + text vertically
    alignItems: "center",
    justifyContent: "center",
  },
});
