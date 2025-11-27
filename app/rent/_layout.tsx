// app/rent/_layout.tsx
import { Stack } from "expo-router";

export default function RentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="rentConfirmation" />
      <Stack.Screen name="rentSuccess" />
    </Stack>
  );
}
