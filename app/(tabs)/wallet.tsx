import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function WalletScreen() {
  return (
    <ScreenContainer className="p-4">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-foreground">Wallet</Text>
        <Text className="text-sm text-muted mt-1">Manage your balance</Text>
      </View>

      {/* Balance Card */}
      <View className="bg-primary rounded-2xl p-6 mb-6">
        <Text className="text-sm text-primary-foreground/80 mb-2">Available Balance</Text>
        <Text className="text-4xl font-bold text-primary-foreground mb-4">GH₵234.50</Text>
        <TouchableOpacity className="bg-primary-foreground/20 rounded-lg py-3 px-4">
          <Text className="text-primary-foreground font-semibold text-center">Top Up Wallet</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View className="flex-row gap-3 mb-6">
        <View className="flex-1 bg-surface border border-border rounded-xl p-4">
          <Text className="text-xs text-muted mb-2">Total Added</Text>
          <Text className="text-xl font-bold text-foreground">GH₵500.00</Text>
        </View>
        <View className="flex-1 bg-surface border border-border rounded-xl p-4">
          <Text className="text-xs text-muted mb-2">Total Spent</Text>
          <Text className="text-xl font-bold text-foreground">GH₵265.50</Text>
        </View>
      </View>

      {/* Transactions */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-foreground mb-3">Recent Transactions</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          {[1, 2, 3].map((i) => (
            <View key={i} className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Ride to Adabraka</Text>
                <Text className="text-xs text-muted mt-1">Today, 2:30 PM</Text>
              </View>
              <Text className="text-sm font-bold text-foreground">-GH₵45.50</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
