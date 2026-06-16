import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export default function ActivityScreen() {
  const trips = [
    {
      id: 1,
      date: "Today, 2:30 PM",
      from: "Accra Mall",
      to: "Osu",
      fare: "GH₵ 45.50",
      driver: "Kwame A.",
      rating: 4.8,
      category: "Standard"
    },
    {
      id: 2,
      date: "Yesterday, 6:15 PM",
      from: "Kasoa",
      to: "Tema",
      fare: "GH₵ 62.00",
      driver: "Ama K.",
      rating: 5.0,
      category: "Comfort"
    },
    {
      id: 3,
      date: "Dec 14, 11:45 AM",
      from: "Airport",
      to: "East Legon",
      fare: "GH₵ 85.00",
      driver: "Kofi M.",
      rating: 4.9,
      category: "Executive"
    },
  ];

  return (
    <ScreenContainer className="p-0">
      {/* Header */}
      <View className="border-b border-border px-4 py-4 bg-background">
        <Text className="text-2xl font-bold text-foreground">Activity</Text>
      </View>

      {/* Trip History */}
      <ScrollView className="flex-1 p-4">
        <View className="gap-3">
          {trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              className="bg-surface border border-border rounded-xl p-4"
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">{trip.date}</Text>
                  <Text className="text-sm font-semibold text-foreground">{trip.from}</Text>
                  <View className="flex-row items-center gap-2 my-1">
                    <View className="w-1 h-1 bg-muted rounded-full" />
                    <View className="w-1 h-1 bg-muted rounded-full" />
                    <View className="w-1 h-1 bg-muted rounded-full" />
                  </View>
                  <Text className="text-sm text-muted">{trip.to}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-lg font-bold text-primary">{trip.fare}</Text>
                  <Text className="text-xs text-muted mt-1">{trip.category}</Text>
                </View>
              </View>

              <View className="border-t border-border pt-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center">
                    <Text className="text-xs">👤</Text>
                  </View>
                  <View>
                    <Text className="text-xs text-muted">Driver</Text>
                    <Text className="text-sm font-medium text-foreground">{trip.driver}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs">⭐</Text>
                  <Text className="text-sm font-semibold text-primary">{trip.rating}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
