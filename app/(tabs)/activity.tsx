import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";

interface Trip {
  id: string;
  date: string;
  pickup: string;
  dropoff: string;
  fare: number;
  rating?: number;
  category: string;
}

const mockTrips: Trip[] = [
  {
    id: "1",
    date: "Today, 2:30 PM",
    pickup: "Osu, Accra",
    dropoff: "Adabraka, Accra",
    fare: 45.50,
    rating: 5,
    category: "Standard"
  },
  {
    id: "2",
    date: "Yesterday, 6:15 PM",
    pickup: "Airport, Accra",
    dropoff: "Tema, Greater Accra",
    fare: 120.00,
    rating: 4,
    category: "Comfort"
  },
  {
    id: "3",
    date: "2 days ago, 10:00 AM",
    pickup: "Makola Market",
    dropoff: "Kasoa, Central Region",
    fare: 85.75,
    category: "Standard"
  }
];

export default function ActivityScreen() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("past");

  return (
    <ScreenContainer className="p-4">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-foreground">Activity</Text>
        <Text className="text-sm text-muted mt-1">Your trip history</Text>
      </View>

      {/* Tab Selector */}
      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity
          onPress={() => setActiveTab("upcoming")}
          className={`flex-1 py-3 px-4 rounded-lg ${
            activeTab === "upcoming" ? "bg-primary" : "bg-surface border border-border"
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === "upcoming" ? "text-background" : "text-foreground"
            }`}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("past")}
          className={`flex-1 py-3 px-4 rounded-lg ${
            activeTab === "past" ? "bg-primary" : "bg-surface border border-border"
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === "past" ? "text-background" : "text-foreground"
            }`}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Trips List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === "past" && mockTrips.length > 0 ? (
          <View className="gap-3">
            {mockTrips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                className="bg-surface border border-border rounded-xl p-4 active:opacity-80"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1">
                    <Text className="text-xs text-muted mb-1">{trip.date}</Text>
                    <Text className="text-sm font-semibold text-foreground">{trip.category}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-lg font-bold text-primary">GH₵{trip.fare.toFixed(2)}</Text>
                    {trip.rating && (
                      <View className="flex-row items-center gap-1 mt-1">
                        <Text className="text-xs">⭐</Text>
                        <Text className="text-xs text-muted">{trip.rating}.0</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="gap-2">
                  <View className="flex-row items-center gap-3">
                    <View className="w-6 h-6 rounded-full bg-success/20 items-center justify-center">
                      <Text className="text-sm">📍</Text>
                    </View>
                    <Text className="text-sm text-foreground flex-1">{trip.pickup}</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <View className="w-6 h-6 rounded-full bg-error/20 items-center justify-center">
                      <Text className="text-sm">📍</Text>
                    </View>
                    <Text className="text-sm text-foreground flex-1">{trip.dropoff}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-12">
            <Text className="text-4xl mb-4">⏰</Text>
            <Text className="text-foreground font-semibold mt-4">No trips yet</Text>
            <Text className="text-muted text-sm mt-2">Your upcoming trips will appear here</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
