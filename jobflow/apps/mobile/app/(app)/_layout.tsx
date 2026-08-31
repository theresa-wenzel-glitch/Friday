import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { colors, typography } from "@jobflow/config";
import { useSession } from "../../lib/session.js";

/**
 * Die Navigation der angemeldeten App.
 *
 * Kunde und Unternehmen sehen unterschiedliche Reiter. Das ist der Kern der
 * Entscheidung, beide Rollen in einer Codebasis zu führen: dieselben
 * Komponenten und derselbe Datenfluss, aber zwei getrennte Oberflächen.
 *
 * Detailseiten bekommen href: null - sie sind über den Ablauf erreichbar und
 * hätten in der Leiste nichts verloren.
 */
export default function AppLayout() {
  const { user, loading } = useSession();

  useEffect(() => {
    // Ohne Anmeldung gibt es hier nichts zu sehen. Verbindlich prüft das
    // ohnehin das Backend - dies ist nur die Führung durch die App.
    if (!loading && user === null) router.replace("/");
  }, [user, loading]);

  const isBusiness = user?.role === "BUSINESS" || user?.role === "BUSINESS_EMPLOYEE";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: typography.sizes.caption },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Start",
          href: isBusiness ? null : "/(app)/home",
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: isBusiness ? "/(app)/dashboard" : null,
          tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests/index"
        options={{
          title: isBusiness ? "Anfragen" : "Meine Anfragen",
          tabBarIcon: ({ color }) => <TabIcon icon="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create-request"
        options={{
          title: "Neu",
          href: isBusiness ? null : "/(app)/create-request",
          tabBarIcon: ({ color }) => <TabIcon icon="➕" color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs/index"
        options={{
          title: "Aufträge",
          href: isBusiness ? "/(app)/jobs" : null,
          tabBarIcon: ({ color }) => <TabIcon icon="🧾" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <TabIcon icon="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          href: isBusiness ? null : "/(app)/profile",
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="business-profile"
        options={{
          title: "Profil",
          href: isBusiness ? "/(app)/business-profile" : null,
          tabBarIcon: ({ color }) => <TabIcon icon="🏢" color={color} />,
        }}
      />

      {/* Über den Ablauf erreichbar, nicht über die Leiste. */}
      <Tabs.Screen name="requests/[id]" options={{ href: null }} />
      <Tabs.Screen name="offers/[id]" options={{ href: null }} />
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="appointment" options={{ href: null }} />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen name="create-offer" options={{ href: null }} />
      <Tabs.Screen name="statistics" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ icon, color }: { icon: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}
