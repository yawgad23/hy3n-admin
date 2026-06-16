import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function WalletScreen() {
  const transactions = [
    {
      id: 1,
      date: "Today, 2:30 PM",
      type: "ride",
      description: "Ride to Osu",
      amount: "-GH₵ 45.50",
      status: "completed"
    },
    {
      id: 2,
      date: "Yesterday, 6:15 PM",
      type: "ride",
      description: "Ride to Tema",
      amount: "-GH₵ 62.00",
      status: "completed"
    },
    {
      id: 3,
      date: "Dec 14, 11:45 AM",
      type: "topup",
      description: "Wallet Top-up",
      amount: "+GH₵ 100.00",
      status: "completed"
    },
    {
      id: 4,
      date: "Dec 13, 3:20 PM",
      type: "ride",
      description: "Ride to East Legon",
      amount: "-GH₵ 85.00",
      status: "completed"
    },
  ];

  return (
    <ScreenContainer className="p-0">
      {/* Header */}
      <View className="border-b border-border px-4 py-4 bg-background">
        <Text className="text-2xl font-bold text-foreground">Wallet</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Balance Card */}
        <View className="bg-primary rounded-2xl p-6 mb-6">
          <Text className="text-sm text-white/80 mb-2">Available Balance</Text>
          <Text className="text-4xl font-bold text-white mb-4">GH₵ 245.75</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity className="flex-1 bg-white/20 rounded-lg py-2 items-center">
              <Text className="text-white font-semibold text-sm">Add Money</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white/20 rounded-lg py-2 items-center">
              <Text className="text-white font-semibold text-sm">Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-foreground mb-3">Transaction History</Text>
          <View className="gap-2">
            {transactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                className="bg-surface border border-border rounded-xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
                    <Text className="text-lg">{tx.type === "ride" ? "🚗" : "💳"}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">{tx.description}</Text>
                    <Text className="text-xs text-muted">{tx.date}</Text>
                  </View>
                </View>
                <Text className={`text-sm font-semibold ${tx.type === "ride" ? "text-error" : "text-success"}`}>
                  {tx.amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
