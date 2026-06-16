import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(true);

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

      {/* Settings */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">👤</Text>
              <Text className="text-sm font-medium text-foreground">Edit Profile</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">💳</Text>
              <Text className="text-sm font-medium text-foreground">My Wallet</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">📍</Text>
              <Text className="text-sm font-medium text-foreground">Saved Places</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">🏆</Text>
              <Text className="text-sm font-medium text-foreground">Loyalty Rewards</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">❓</Text>
              <Text className="text-sm font-medium text-foreground">Help Center</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">🔐</Text>
              <Text className="text-sm font-medium text-foreground">Biometric Login</Text>
            </View>
            <Switch value={false} />
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">🌙</Text>
              <Text className="text-sm font-medium text-foreground">Dark Mode</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} />
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">👥</Text>
              <Text className="text-sm font-medium text-foreground">Refer a Friend</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">💳</Text>
              <Text className="text-sm font-medium text-foreground">Payment Methods</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <Text className="text-xl">🛡️</Text>
              <Text className="text-sm font-medium text-foreground">Safety</Text>
            </View>
            <Text className="text-muted">›</Text>
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity className="bg-surface border border-error/30 rounded-lg p-4 flex-row items-center gap-3 mt-4">
            <Text className="text-xl">🚪</Text>
            <Text className="text-sm font-medium text-error">Log Out</Text>
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity className="bg-error/10 border border-error/30 rounded-lg p-4 flex-row items-center gap-3 mt-2 mb-8">
            <Text className="text-xl">🗑️</Text>
            <Text className="text-sm font-medium text-error">Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
