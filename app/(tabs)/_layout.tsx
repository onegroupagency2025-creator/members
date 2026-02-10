import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        title: "Members",
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="create"
        options={{
          title: "利用者登録",
        }}
      />
    </Tabs>
  );
}
