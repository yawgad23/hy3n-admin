import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { useThemeContext } from "@/lib/theme-provider";

export default function AccountScreen() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();
  const isDarkMode = colorScheme === "dark";
  const [editing, setEditing] = useState(false);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [form, setForm] = useState({
    full_name: "John Doe",
    phone: "+233 55 123 4567",
    email: "john@example.com"
  });

  const handleSave = () => {
    setEditing(false);
    Alert.alert("Success", "Profile updated successfully");
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        { text: "Log Out", onPress: () => {}, style: "destructive" }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all ride history. This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        { text: "Delete Account", onPress: () => {}, style: "destructive" }
      ]
    );
  };

  const handleEditProfile = () => {
    setEditing(true);
  };

  const handleMyWallet = () => {
    router.push("/(tabs)/wallet");
  };

  const handleSavedPlaces = () => {
    setShowSavedPlaces(!showSavedPlaces);
  };

  const handleLoyaltyRewards = () => {
    setShowLoyalty(!showLoyalty);
  };

  const handleHelpCenter = () => {
    setShowHelp(!showHelp);
  };

  const handleBiometric = () => {
    setBiometricEnabled(!biometricEnabled);
    Alert.alert("Biometric", biometricEnabled ? "Biometric disabled" : "Biometric enabled");
  };

  const handleDarkMode = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
  };

  const handleReferFriend = () => {
    Alert.alert("Refer a Friend", "Share your referral code with friends");
  };

  const handlePaymentMethods = () => {
    Alert.alert("Payment Methods", "Manage your payment methods");
  };

  const handleSafety = () => {
    Alert.alert("Safety", "View safety information and emergency contacts");
  };

  return (
    <ScreenContainer className="p-0">
      {/* Header */}
      <View className="border-b border-border px-4 py-4 bg-background">
        <Text className="text-2xl font-bold text-foreground">Account</Text>
      </View>

      {editing ? (
        // Edit Profile Form
        <ScrollView className="flex-1 p-4">
          <View className="bg-surface border border-border rounded-xl p-4 gap-4">
            <View>
              <Text className="text-xs text-muted mb-2">Full Name</Text>
              <View className="bg-secondary border border-border rounded-lg px-4 py-3">
                <Text className="text-foreground">{form.full_name}</Text>
              </View>
            </View>

            <View>
              <Text className="text-xs text-muted mb-2">Phone</Text>
              <View className="bg-secondary border border-border rounded-lg px-4 py-3">
                <Text className="text-foreground">{form.phone}</Text>
              </View>
            </View>

            <View>
              <Text className="text-xs text-muted mb-2">Email</Text>
              <View className="bg-secondary border border-border rounded-lg px-4 py-3">
                <Text className="text-foreground">{form.email}</Text>
              </View>
            </View>

            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 bg-success rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditing(false)}
                className="flex-1 bg-surface border border-border rounded-lg py-3 items-center"
              >
                <Text className="text-foreground font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Profile Menu
        <ScrollView className="flex-1 p-4">
          {/* Avatar Section */}
          <View className="items-center py-6 mb-4">
            <View className="w-20 h-20 rounded-full bg-secondary border-2 border-primary items-center justify-center mb-3">
              <Text className="text-4xl">👤</Text>
            </View>
            <Text className="text-lg font-bold text-foreground">John Doe</Text>
            <Text className="text-sm text-muted">john@example.com</Text>
            <View className="flex-row items-center gap-1 mt-2 bg-primary/10 px-3 py-1 rounded-full">
              <Text className="text-xs">⭐</Text>
              <Text className="text-xs font-semibold text-primary">4.8</Text>
              <Text className="text-xs text-muted">avg rating</Text>
            </View>
          </View>

          {/* Menu Items */}
          <View className="gap-2">
            {/* Edit Profile */}
            <TouchableOpacity
              onPress={handleEditProfile}
              className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl"
            >
              <Text className="text-lg">👤</Text>
              <Text className="flex-1 text-sm text-foreground">Edit Profile</Text>
            </TouchableOpacity>

            {/* My Wallet */}
            <TouchableOpacity
              onPress={handleMyWallet}
              className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl"
            >
              <Text className="text-lg">💳</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">My Wallet</Text>
            </TouchableOpacity>

            {/* Saved Places */}
            <TouchableOpacity
              onPress={handleSavedPlaces}
              className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl"
            >
              <Text className="text-lg">📍</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">Saved Places</Text>
            </TouchableOpacity>

            {showSavedPlaces && (
              <View className="bg-surface border border-border rounded-xl p-4 ml-2 mr-2">
                <View className="gap-2">
                  <View className="flex-row items-center gap-2 py-2">
                    <Text>🏠</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">Home</Text>
                      <Text className="text-xs text-muted">Not set</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 py-2">
                    <Text>💼</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">Work</Text>
                      <Text className="text-xs text-muted">Not set</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Loyalty Rewards */}
            <TouchableOpacity
              onPress={handleLoyaltyRewards}
              className="flex-row items-center gap-3 p-4 bg-surface border border-primary/30 rounded-xl"
            >
              <Text className="text-lg">🏆</Text>
              <Text className="flex-1 text-sm font-medium text-primary">Loyalty Rewards</Text>
            </TouchableOpacity>

            {showLoyalty && (
              <View className="bg-surface border border-border rounded-xl p-4 ml-2 mr-2">
                <Text className="text-sm font-medium text-foreground mb-2">Loyalty Points</Text>
                <Text className="text-2xl font-bold text-primary">2,450</Text>
                <Text className="text-xs text-muted mt-1">Points earned from rides</Text>
              </View>
            )}

            {/* Help Center */}
            <TouchableOpacity
              onPress={handleHelpCenter}
              className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl"
            >
              <Text className="text-lg">❓</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">Help Center</Text>
            </TouchableOpacity>

            {showHelp && (
              <View className="bg-surface border border-border rounded-xl p-4 ml-2 mr-2">
                <View className="gap-2">
                  <TouchableOpacity className="py-2">
                    <Text className="text-sm text-foreground">FAQ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="py-2">
                    <Text className="text-sm text-foreground">Contact Support</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="py-2">
                    <Text className="text-sm text-foreground">Report Issue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Biometric Login */}
            <View className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl">
              <Text className="text-lg">🔐</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">
                {biometricEnabled ? "Biometric Enabled" : "Biometric Login"}
              </Text>
              <Switch value={biometricEnabled} onValueChange={handleBiometric} />
            </View>

            {/* Dark Mode */}
            <View className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl">
              <Text className="text-lg">{isDarkMode ? "🌙" : "☀️"}</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">
                {isDarkMode ? "Dark Mode" : "Light Mode"}
              </Text>
              <Switch value={isDarkMode} onValueChange={handleDarkMode} />
            </View>

            {/* Refer a Friend */}
            <TouchableOpacity
              onPress={handleReferFriend}
              className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl"
            >
              <Text className="text-lg">👥</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">Refer a Friend</Text>
            </TouchableOpacity>

            {/* Payment Methods */}
            <TouchableOpacity
              onPress={handlePaymentMethods}
              className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl"
            >
              <Text className="text-lg">💳</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">Payment Methods</Text>
            </TouchableOpacity>

            {/* Safety */}
            <TouchableOpacity
              onPress={handleSafety}
              className="flex-row items-center gap-3 p-4 bg-surface border border-border rounded-xl"
            >
              <Text className="text-lg">🛡️</Text>
              <Text className="flex-1 text-sm font-medium text-foreground">Safety</Text>
            </TouchableOpacity>

            {/* Log Out */}
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center gap-3 p-4 bg-surface border border-error/30 rounded-xl mt-4"
            >
              <Text className="text-lg">🚪</Text>
              <Text className="flex-1 text-sm text-error">Log Out</Text>
            </TouchableOpacity>

            {/* Delete Account */}
            <TouchableOpacity
              onPress={handleDeleteAccount}
              className="flex-row items-center gap-3 p-4 bg-error/10 border border-error/30 rounded-xl mb-8"
            >
              <Text className="text-lg">🗑️</Text>
              <Text className="flex-1 text-sm text-error">Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
