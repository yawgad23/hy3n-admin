import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

interface Transaction {
  id: string;
  type: "credit" | "debit";
  description: string;
  amount: number;
  date: string;
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "debit",
    description: "Ride to Adabraka",
    amount: 45.50,
    date: "Today, 2:30 PM"
  },
  {
    id: "2",
    type: "credit",
    description: "Wallet top-up",
    amount: 100.00,
    date: "Yesterday, 5:00 PM"
  },
  {
    id: "3",
    type: "debit",
    description: "Ride to Tema",
    amount: 120.00,
    date: "2 days ago"
  }
];

export default function WalletScreen() {
  const [balance] = useState(234.50);

  return (
    <ScreenContainer className="p-4">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-foreground">Wallet</Text>
        <Text className="text-sm text-muted mt-1">Manage your balance</Text>
      </View>

      {/* Balance Card */}
      <View className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 mb-6">
        <Text className="text-sm text-background/80 mb-2">Available Balance</Text>
        <Text className="text-4xl font-bold text-background mb-4">GH₵{balance.toFixed(2)}</Text>
        <TouchableOpacity className="bg-background/20 rounded-lg py-3 px-4">
          <Text className="text-background font-semibold text-center">Top Up Wallet</Text>
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

      {/* Transaction History */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-foreground mb-3">Recent Transactions</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="gap-2">
          {mockTransactions.map((transaction) => (
            <View
              key={transaction.id}
              className="bg-surface border border-border rounded-lg p-4 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  {transaction.description}
                </Text>
                <Text className="text-xs text-muted mt-1">{transaction.date}</Text>
              </View>
              <Text
                className={`text-sm font-bold ${
                  transaction.type === "credit" ? "text-success" : "text-foreground"
                }`}
              >
                {transaction.type === "credit" ? "+" : "-"}GH₵{transaction.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
