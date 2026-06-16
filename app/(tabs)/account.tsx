import { ScrollView, Text, View, TouchableOpacity, Switch } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

export default function AccountScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const settingsItems = [
    { icon: "👤", label: "Edit Profile", action: "edit" },
    { icon: "💳", label: "My Wallet", action: "wallet" },
    { icon: "📍", label: "Saved Places", action: "saved" },
    { icon: "🏆", label: "Loyalty Rewards", action: "loyalty" },
    { icon: "❓", label: "Help Center", action: "help" },
    { icon: "🔐", label: "Biometric Login", action: "biometric", toggle: true },
    { icon: "🌙", label: "Dark Mode", action: "theme", toggle: true },
    { icon: "👥", label: "Refer a Friend", action: "refer" },
    { icon: "💳", label: "Payment Methods", action: "payment" },
    { icon: "🛡️", label: "Safety", action: "safety" },
  ];

  return (
    <ScreenContainer className="p-4">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-foreground">Account</Text>
        <Text className="text-sm text-muted mt-1">Manage your profile</Text>
      </View>

      {/* Profile Header */}
      <View className="bg-surface border border-border rounded-xl p-4 mb-6 flex-row items-center gap-4">
        <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center">
          <Text className="text-2xl">👤</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">John Doe</Text>
          <Text className="text-sm text-muted">john@example.com</Text>
          <Text className="text-xs text-muted mt-1">+233 55 123 4567</Text>
        </View>
      </View>

      {/* Settings List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="gap-2">
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between active:opacity-80"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Text className="text-xl">{item.icon}</Text>
                <Text className="text-sm font-medium text-foreground">{item.label}</Text>
              </View>
              {item.toggle ? (
                <Switch
                  value={item.action === "biometric" ? biometricEnabled : darkMode}
                  onValueChange={(value) => {
                    if (item.action === "biometric") {
                      setBiometricEnabled(value);
                    } else if (item.action === "theme") {
                      setDarkMode(value);
                    }
                  }}
                />
              ) : (
                <Text className="text-muted">›</Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Logout Button */}
          <TouchableOpacity className="bg-surface border border-error/30 rounded-lg p-4 flex-row items-center gap-3 mt-4 active:opacity-80">
            <Text className="text-xl">🚪</Text>
            <Text className="text-sm font-medium text-error">Log Out</Text>
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity className="bg-error/10 border border-error/30 rounded-lg p-4 flex-row items-center gap-3 mt-2 active:opacity-80">
            <Text className="text-xl">🗑️</Text>
            <Text className="text-sm font-medium text-error">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
