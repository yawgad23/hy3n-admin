import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function HistoryScreen() {
  return (
    <ScreenContainer className="p-4">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-foreground">Activity</Text>
        <Text className="text-sm text-muted mt-1">Your trip history</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {[1, 2, 3].map((i) => (
            <View key={i} className="bg-surface border border-border rounded-xl p-4">
              <View className="flex-row justify-between mb-2">
                <Text className="font-semibold text-foreground">Trip {i}</Text>
                <Text className="font-bold text-primary">GH₵45.50</Text>
              </View>
              <Text className="text-xs text-muted">Today, 2:30 PM</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
