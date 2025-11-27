import { Stack } from "expo-router";

export default function RentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="returnConfirmation" />
      <Stack.Screen name="returnSuccess" />
    </Stack>
  );
}
