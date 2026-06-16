import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { RIDE_CATEGORIES } from "@/constants/rides";

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export default function RiderHome() {
  const [location, setLocation] = useState<[number, number]>([5.6037, -0.1870]);
  const [destination, setDestination] = useState<Location | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(RIDE_CATEGORIES[0]);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock distance/duration calculation
  const calculateDistance = useCallback(() => {
    if (!destination) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setDistance(18.4);
      setDuration(41);
      setLoading(false);
    }, 500);
  }, [destination]);

  useEffect(() => {
    calculateDistance();
  }, [destination, calculateDistance]);

  const calculateFare = () => {
    if (!distance || !duration) return 0;
    const distanceFare = selectedCategory.basePrice + (distance * selectedCategory.pricePerKm);
    const timeFare = duration * selectedCategory.pricePerMin;
    const subtotal = distanceFare + timeFare;
    return Math.max(subtotal, selectedCategory.minFare);
  };

  const fare = calculateFare();

  return (
    <ScreenContainer className="p-0">
      {/* Full Screen Map Background */}
      <View className="absolute inset-0 bg-background">
        <View className="flex-1 bg-secondary items-center justify-center">
          <Text className="text-muted text-sm">Map View</Text>
        </View>
      </View>

      {/* Header - Positioned over map */}
      <View className="absolute top-0 left-0 right-0 z-30 pt-4 px-4 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
            <Text className="text-xs font-bold text-primary">H</Text>
          </View>
          <Text className="font-bold text-sm text-foreground">HY3N</Text>
        </View>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center">
          <Text className="text-lg">🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Nearby Cars Indicator */}
      {!destination && (
        <View className="absolute top-28 left-4 z-10 bg-card/90 border border-border rounded-xl px-3 py-2">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 bg-success rounded-full" />
            <Text className="text-xs font-semibold text-foreground">3 cars nearby</Text>
          </View>
        </View>
      )}

      {/* Bottom Sheet - Search/Booking */}
      <View className="absolute bottom-0 left-0 right-0 z-20 bg-card border-t border-border rounded-t-3xl p-4">
        {!destination ? (
          <>
            {/* Where To Button */}
            <TouchableOpacity
              onPress={() => setSearchOpen(true)}
              className="w-full bg-secondary rounded-2xl p-4 flex-row items-center gap-4 mb-4"
            >
              <View className="w-12 h-12 rounded-xl bg-primary items-center justify-center">
                <Text className="text-lg">🔍</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-lg text-foreground">Where to?</Text>
                <Text className="text-sm text-muted">Enter your destination</Text>
              </View>
              <Text className="text-lg">📍</Text>
            </TouchableOpacity>

            {/* Saved Places */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <TouchableOpacity className="mr-3 px-4 py-2.5 bg-secondary rounded-xl flex-row items-center gap-2">
                <Text className="text-lg">🏠</Text>
                <View>
                  <Text className="text-sm font-semibold text-foreground">Home</Text>
                  <Text className="text-xs text-muted">Set location</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity className="mr-3 px-4 py-2.5 bg-secondary rounded-xl flex-row items-center gap-2">
                <Text className="text-lg">💼</Text>
                <View>
                  <Text className="text-sm font-semibold text-foreground">Work</Text>
                  <Text className="text-xs text-muted">Set location</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
            {/* Route Summary */}
            <View className="mb-5 p-4 bg-secondary rounded-xl">
              <View className="flex-row gap-3 mb-3">
                <View className="items-center gap-1 mt-1">
                  <View className="w-3 h-3 rounded-full border-2 border-success" />
                  <View className="w-0.5 h-8 bg-border" />
                  <Text className="text-lg">📍</Text>
                </View>
                <View className="flex-1 gap-3">
                  <View>
                    <Text className="text-xs text-muted">Pickup</Text>
                    <Text className="text-sm font-medium text-foreground">Current Location</Text>
                  </View>
                  <View>
                    <Text className="text-xs text-muted">Destination</Text>
                    <Text className="text-sm font-medium text-foreground">{destination.name}</Text>
                  </View>
                </View>
              </View>

              {/* Distance & Duration */}
              {distance && duration && (
                <View className="flex-row justify-center gap-4 pt-3 border-t border-border">
                  <View className="items-center gap-1">
                    <Text className="text-xs text-muted">Distance</Text>
                    <Text className="text-sm font-bold text-foreground">{distance.toFixed(1)} km</Text>
                  </View>
                  <View className="items-center gap-1">
                    <Text className="text-xs text-muted">Duration</Text>
                    <Text className="text-sm font-bold text-foreground">~{duration} min</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Ride Categories */}
            <View className="mb-5">
              <Text className="text-xs text-muted uppercase tracking-wider mb-2 font-medium">Choose Ride</Text>
              <View className="gap-2">
                {RIDE_CATEGORIES.map((category) => {
                  const categoryFare = calculateFare();
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => setSelectedCategory(category)}
                      className={`p-4 rounded-xl border flex-row items-center justify-between ${
                        selectedCategory.id === category.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card"
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground">{category.name}</Text>
                        <Text className="text-xs text-muted">{category.description}</Text>
                      </View>
                      <Text className="text-lg font-bold text-primary">GH₵{categoryFare.toFixed(2)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Book Button */}
            <TouchableOpacity className="w-full bg-primary rounded-xl py-4 items-center mb-4">
              <Text className="text-primary-foreground font-bold">Book {selectedCategory.name}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}
