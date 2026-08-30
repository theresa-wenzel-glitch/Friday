import { Stack } from "expo-router";
import { colors } from "@jobflow/config";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Zurueck",
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="register" options={{ title: "Konto erstellen" }} />
      <Stack.Screen name="login" options={{ title: "Anmelden" }} />
    </Stack>
  );
}
