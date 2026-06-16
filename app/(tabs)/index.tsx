import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, UrlTile } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { RIDE_CATEGORIES, POPULAR_DESTINATIONS, PAYMENT_METHODS, calculateFare } from "@/constants/rides";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface SavedPlace {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

const DEFAULT_LOCATION: [number, number] = [5.6037, -0.187]; // Accra, Ghana

const ICON_MAP: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  // Lucide-style names (legacy)
  Car: "directions-car",
  Star: "star",
  ShieldCheck: "verified-user",
  Bike: "two-wheeler",
  Package: "inventory",
  Bus: "directions-bus",
  Crown: "workspace-premium",
  // rides.ts icon names (lowercase)
  car: "directions-car",
  star: "star",
  "shield-check": "verified-user",
  bike: "two-wheeler",
  package: "inventory",
  bus: "directions-bus",
};

const PROMO_CODES: Record<string, { type: "percent" | "fixed"; value: number; maxDiscount?: number }> = {
  FIRSTRIDE: { type: "percent", value: 50, maxDiscount: 20 },
  HY3N10: { type: "percent", value: 10 },
  FREERIDE: { type: "fixed", value: 30 },
  WELCOME: { type: "percent", value: 20, maxDiscount: 15 },
  WEEKEND: { type: "percent", value: 15 },
};

function calculateDiscount(code: string, fare: number): number {
  const promo = PROMO_CODES[code.toUpperCase()];
  if (!promo) return 0;
  if (promo.type === "percent") {
    const discount = fare * (promo.value / 100);
    return promo.maxDiscount ? Math.min(discount, promo.maxDiscount) : discount;
  }
  return Math.min(promo.value, fare);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [userLocation] = useState<[number, number]>(DEFAULT_LOCATION);
  const [destination, setDestination] = useState<Location | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(RIDE_CATEGORIES[0]);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([
    { name: "Home", address: "Set location" },
    { name: "Work", address: "Set location" },
  ]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<Location[]>([]);

  // Schedule
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Split Fare
  const [splitData, setSplitData] = useState<{ totalPeople: number; perPersonFare: number } | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState("2");

  // Promo Code
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    AsyncStorage.getItem("savedPlaces").then((v) => { if (v) setSavedPlaces(JSON.parse(v)); });
    AsyncStorage.getItem("searchHistory").then((v) => { if (v) setSearchHistory(JSON.parse(v)); });
  }, []);

  const distance = destination
    ? Math.sqrt(
        Math.pow((destination.lat - userLocation[0]) * 111, 2) +
          Math.pow((destination.lng - userLocation[1]) * 111 * Math.cos((userLocation[0] * Math.PI) / 180), 2)
      )
    : 0;
  const duration = Math.round(distance * 3.5 + 5);
  const baseFare = destination ? calculateFare(selectedCategory.id, distance, duration) : 0;
  const discount = appliedPromo ? calculateDiscount(appliedPromo, baseFare) : 0;
  const finalFare = baseFare - discount;
  const perPersonFare = splitData ? finalFare / splitData.totalPeople : finalFare;

  const filteredDestinations = searchQuery
    ? POPULAR_DESTINATIONS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_DESTINATIONS;

  const handleSelectDestination = async (loc: Location) => {
    setDestination(loc);
    setSearchOpen(false);
    setSearchQuery("");
    const updated = [loc, ...searchHistory.filter((h) => h.name !== loc.name)].slice(0, 5);
    setSearchHistory(updated);
    await AsyncStorage.setItem("searchHistory", JSON.stringify(updated));
    // Fit map to show both user and destination
    if (mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: userLocation[0], longitude: userLocation[1] },
          { latitude: loc.lat, longitude: loc.lng },
        ],
        { edgePadding: { top: 80, right: 40, bottom: 300, left: 40 }, animated: true }
      );
    }
  };

  const handleBook = async () => {
    if (!destination) return;
    setBookingLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setActiveRide({
      category: selectedCategory.name,
      destination,
      distance,
      duration,
      fare: perPersonFare,
      payment: selectedPayment.name,
      status: "searching",
      scheduled: isScheduled ? scheduledFor : null,
    });
    setBookingLoading(false);
  };

  const handleCancelRide = () => {
    Alert.alert("Cancel Ride", "Are you sure you want to cancel this ride?", [
      { text: "No", style: "cancel" },
      { text: "Yes, Cancel", style: "destructive", onPress: () => { setActiveRide(null); setDestination(null); } },
    ]);
  };

  const handleCancelBooking = () => {
    setDestination(null);
    setSelectedCategory(RIDE_CATEGORIES[0]);
    setAppliedPromo(null);
    setSplitData(null);
    setIsScheduled(false);
    setScheduledFor(null);
    // Reset map to user location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation[0],
        longitude: userLocation[1],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleQuickPlace = (place: SavedPlace) => {
    if (!place.lat || !place.lng) { setSearchOpen(true); return; }
    handleSelectDestination({ name: place.name, address: place.address, lat: place.lat, lng: place.lng });
  };

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!PROMO_CODES[code]) {
      setPromoError("Invalid promo code");
      return;
    }
    setAppliedPromo(code);
    setPromoExpanded(false);
    setPromoError("");
  };

  const handleSplitConfirm = () => {
    const count = parseInt(splitCount);
    if (isNaN(count) || count < 2 || count > 6) {
      Alert.alert("Invalid", "Please enter a number between 2 and 6");
      return;
    }
    setSplitData({ totalPeople: count, perPersonFare: parseFloat((finalFare / count).toFixed(2)) });
    setShowSplitModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Map - full screen background using react-native-maps */}
      {Platform.OS === "web" ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#111", alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="map" size={64} color="#2A2A2A" />
          <Text style={{ color: "#3A3A3A", marginTop: 12, fontSize: 14 }}>Map loads on device</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: userLocation[0],
            longitude: userLocation[1],
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          customMapStyle={[
            { elementType: "geometry", stylers: [{ color: "#212121" }] },
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
            { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
            { featureType: "poi", elementType: "geometry", stylers: [{ color: "#181818" }] },
          ]}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          toolbarEnabled={false}
          zoomControlEnabled={false}
        >
          {/* User location marker - green circle */}
          <Marker
            coordinate={{ latitude: userLocation[0], longitude: userLocation[1] }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#006B3F", borderWidth: 3, borderColor: "#fff", shadowColor: "#006B3F", shadowOpacity: 0.6, shadowRadius: 8 }} />
          </Marker>

          {/* Destination marker - gold circle */}
          {destination && (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#D4AF37", borderWidth: 3, borderColor: "#fff", shadowColor: "#D4AF37", shadowOpacity: 0.6, shadowRadius: 8 }} />
            </Marker>
          )}

          {/* Route line */}
          {destination && (
            <Polyline
              coordinates={[
                { latitude: userLocation[0], longitude: userLocation[1] },
                { latitude: destination.lat, longitude: destination.lng },
              ]}
              strokeColor="#D4AF37"
              strokeWidth={3}
              lineDashPattern={[8, 6]}
            />
          )}
        </MapView>
      )}

      {/* Header - overlaid on map */}
      <View style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#000", fontWeight: "bold", fontSize: 14 }}>H</Text>
          </View>
          <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 18, letterSpacing: 1 }}>HY3N</Text>
        </View>
        <TouchableOpacity
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(17,17,17,0.9)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2A2A2A" }}
          onPress={() => Alert.alert("Notifications", "No new notifications")}
        >
          <MaterialIcons name="notifications" size={20} color="#FAFAFA" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet - overlaid on map */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111111", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 80, maxHeight: SCREEN_HEIGHT * 0.72, borderTopWidth: 1, borderTopColor: "#2A2A2A", zIndex: 10 }}>
        {activeRide ? (
          // Active Ride View
          <ScrollView style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(212,175,55,0.15)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="directions-car" size={22} color="#D4AF37" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 11, marginBottom: 2 }}>Ride Booked</Text>
                <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 17 }}>{activeRide.category}</Text>
              </View>
              <View style={{ backgroundColor: "rgba(0,107,63,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ color: "#006B3F", fontSize: 12, fontWeight: "600" }}>
                  {activeRide.scheduled ? "Scheduled" : "Searching..."}
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: "#1A1A1A", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: "#2A2A2A" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Destination</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12, fontWeight: "600", flex: 1, textAlign: "right" }} numberOfLines={1}>{activeRide.destination.name}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Distance</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12, fontWeight: "600" }}>{activeRide.distance.toFixed(1)} km · ~{activeRide.duration} min</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Fare</Text>
                <Text style={{ color: "#D4AF37", fontSize: 14, fontWeight: "bold" }}>GH₵{activeRide.fare.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Payment</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12, fontWeight: "600" }}>{activeRide.payment}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancelRide} style={{ borderWidth: 1, borderColor: "rgba(206,17,38,0.4)", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#CE1126", fontWeight: "600", fontSize: 15 }}>Cancel Ride</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : destination ? (
          // Booking Sheet
          <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Destination header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity onPress={handleCancelBooking} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <MaterialIcons name="arrow-back" size={18} color="#FAFAFA" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 11 }}>To</Text>
                <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 15 }} numberOfLines={1}>{destination.name}</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 11 }}>{distance.toFixed(1)} km · ~{duration} min</Text>
              </View>
            </View>

            {/* Ride Categories */}
            {RIDE_CATEGORIES.map((cat) => {
              const iconName = ICON_MAP[cat.icon] || "directions-car";
              const fare = calculateFare(cat.id, distance, duration);
              const isSelected = selectedCategory.id === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    marginBottom: 8,
                    backgroundColor: isSelected ? "rgba(212,175,55,0.12)" : "#1A1A1A",
                    borderWidth: 1.5,
                    borderColor: isSelected ? "#D4AF37" : "#2A2A2A",
                  }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isSelected ? "rgba(212,175,55,0.2)" : "#222", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name={iconName} size={22} color={isSelected ? "#D4AF37" : "#9CA3AF"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 14 }}>{cat.name}</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 1 }}>{cat.description}</Text>
                  </View>
                  <Text style={{ color: "#D4AF37", fontWeight: "bold", fontSize: 15 }}>GH₵{fare.toFixed(2)}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Split Fare Display */}
            {splitData && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(0,107,63,0.1)", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(0,107,63,0.3)" }}>
                <Text style={{ color: "#006B3F", fontSize: 13, fontWeight: "600" }}>Split {splitData.totalPeople} ways</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: "#D4AF37", fontWeight: "bold", fontSize: 14 }}>GH₵{splitData.perPersonFare.toFixed(2)}/person</Text>
                  <TouchableOpacity onPress={() => setSplitData(null)}>
                    <MaterialIcons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Payment & Options Row */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {PAYMENT_METHODS.map((pm) => (
                    <TouchableOpacity
                      key={pm.id}
                      onPress={() => setSelectedPayment(pm)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: selectedPayment.id === pm.id ? "rgba(212,175,55,0.15)" : "#1A1A1A",
                        borderWidth: 1,
                        borderColor: selectedPayment.id === pm.id ? "#D4AF37" : "#2A2A2A",
                      }}
                    >
                      <MaterialIcons name={pm.icon as React.ComponentProps<typeof MaterialIcons>["name"]} size={14} color={selectedPayment.id === pm.id ? "#D4AF37" : "#9CA3AF"} />
                      <Text style={{ color: selectedPayment.id === pm.id ? "#D4AF37" : "#9CA3AF", fontSize: 12, fontWeight: "500" }}>{pm.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Trip Type Toggle */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => { setIsScheduled(false); setScheduledFor(null); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: !isScheduled ? "rgba(212,175,55,0.15)" : "#1A1A1A", borderWidth: 1, borderColor: !isScheduled ? "#D4AF37" : "#2A2A2A" }}
              >
                <Text style={{ color: !isScheduled ? "#D4AF37" : "#9CA3AF", fontSize: 13, fontWeight: "600" }}>Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowScheduleModal(true)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: isScheduled ? "rgba(212,175,55,0.15)" : "#1A1A1A", borderWidth: 1, borderColor: isScheduled ? "#D4AF37" : "#2A2A2A" }}
              >
                <Text style={{ color: isScheduled ? "#D4AF37" : "#9CA3AF", fontSize: 13, fontWeight: "600" }}>
                  {isScheduled && scheduledFor ? scheduledFor : "Schedule"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Split Fare Button */}
            <TouchableOpacity
              onPress={() => setShowSplitModal(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 8 }}
            >
              <MaterialIcons name="group" size={16} color="#9CA3AF" />
              <Text style={{ color: "#9CA3AF", fontSize: 13, fontWeight: "500" }}>Split Fare</Text>
            </TouchableOpacity>

            {/* Promo Code */}
            {appliedPromo ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(0,107,63,0.1)", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(0,107,63,0.3)" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="local-offer" size={16} color="#006B3F" />
                  <Text style={{ color: "#006B3F", fontSize: 13, fontWeight: "600" }}>{appliedPromo} applied</Text>
                  <Text style={{ color: "#D4AF37", fontSize: 13, fontWeight: "bold" }}>-GH₵{discount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity onPress={() => { setAppliedPromo(null); setPromoInput(""); }}>
                  <MaterialIcons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setPromoExpanded(!promoExpanded)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#1A1A1A", borderWidth: 1, borderColor: "#2A2A2A" }}
                >
                  <MaterialIcons name="local-offer" size={16} color="#9CA3AF" />
                  <Text style={{ color: "#9CA3AF", fontSize: 13, fontWeight: "500", flex: 1 }}>Add promo code</Text>
                  <MaterialIcons name={promoExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={18} color="#9CA3AF" />
                </TouchableOpacity>
                {promoExpanded && (
                  <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={promoInput}
                      onChangeText={(t) => { setPromoInput(t); setPromoError(""); }}
                      placeholder="Enter code"
                      placeholderTextColor="#4A4A4A"
                      autoCapitalize="characters"
                      style={{ flex: 1, backgroundColor: "#1A1A1A", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#FAFAFA", fontSize: 13, borderWidth: 1, borderColor: promoError ? "#CE1126" : "#2A2A2A" }}
                      returnKeyType="done"
                      onSubmitEditing={handleApplyPromo}
                    />
                    <TouchableOpacity
                      onPress={handleApplyPromo}
                      style={{ backgroundColor: "#D4AF37", borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ color: "#000", fontWeight: "bold", fontSize: 13 }}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {promoError ? <Text style={{ color: "#CE1126", fontSize: 11, marginTop: 4, marginLeft: 4 }}>{promoError}</Text> : null}
              </View>
            )}

            {/* Fare Summary */}
            {discount > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, paddingHorizontal: 4 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Subtotal</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12, textDecorationLine: "line-through" }}>GH₵{baseFare.toFixed(2)}</Text>
              </View>
            )}

            {/* Book Button */}
            <TouchableOpacity
              onPress={handleBook}
              style={{ backgroundColor: "#D4AF37", borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 4 }}
            >
              {bookingLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <MaterialIcons name="navigation" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                    Request HY3N · GH₵{perPersonFare.toFixed(2)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          // Default "Where to?" sheet
          <View style={{ padding: 16 }}>
            <TouchableOpacity
              onPress={() => setSearchOpen(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#1A1A1A", borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#2A2A2A" }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="search" size={22} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 16 }}>Where to?</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>Enter your destination</Text>
              </View>
              <MaterialIcons name="location-on" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            {/* Saved Places */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {savedPlaces.map((place, i) => {
                  const iconName: React.ComponentProps<typeof MaterialIcons>["name"] =
                    place.name.toLowerCase() === "home" ? "home" : place.name.toLowerCase() === "work" ? "work" : "star";
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleQuickPlace(place)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#1A1A1A", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A2A", minWidth: 110 }}
                    >
                      <MaterialIcons name={iconName} size={16} color="#D4AF37" />
                      <View>
                        <Text style={{ color: "#FAFAFA", fontWeight: "600", fontSize: 13 }}>{place.name}</Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 10 }} numberOfLines={1}>{place.address}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setSearchOpen(true)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "rgba(26,26,26,0.5)", borderRadius: 12, borderWidth: 1, borderColor: "#2A2A2A", borderStyle: "dashed" }}
                >
                  <MaterialIcons name="add" size={16} color="#9CA3AF" />
                  <Text style={{ color: "#9CA3AF", fontSize: 13, fontWeight: "500" }}>Add</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Search Modal */}
      <Modal visible={searchOpen} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: "#0A0A0A", paddingTop: insets.top }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#2A2A2A" }}>
            <TouchableOpacity onPress={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="arrow-back" size={20} color="#FAFAFA" />
            </TouchableOpacity>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search destination..."
              placeholderTextColor="#4A4A4A"
              autoFocus
              style={{ flex: 1, backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: "#FAFAFA", fontSize: 15, borderWidth: 1, borderColor: "#2A2A2A" }}
              returnKeyType="search"
            />
          </View>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {searchHistory.length > 0 && !searchQuery && (
              <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Recent</Text>
                {searchHistory.map((loc, i) => (
                  <TouchableOpacity key={i} onPress={() => handleSelectDestination(loc)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 }}>
                    <MaterialIcons name="history" size={18} color="#9CA3AF" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FAFAFA", fontSize: 14, fontWeight: "500" }}>{loc.name}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{loc.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 1, backgroundColor: "#1A1A1A", marginVertical: 8 }} />
              </View>
            )}
            <View style={{ paddingHorizontal: 16, paddingTop: searchHistory.length > 0 && !searchQuery ? 0 : 16 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 12, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Popular Destinations</Text>
              {filteredDestinations.map((loc, i) => (
                <TouchableOpacity key={i} onPress={() => handleSelectDestination(loc)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="location-on" size={18} color="#D4AF37" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FAFAFA", fontSize: 14, fontWeight: "500" }}>{loc.name}</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{loc.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Split Fare Modal */}
      <Modal visible={showSplitModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#111111", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "#2A2A2A" }}>
            <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 18, marginBottom: 16 }}>Split Fare</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 12 }}>How many people are sharing this ride?</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setSplitCount(String(n))}
                  style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: splitCount === String(n) ? "#D4AF37" : "#1A1A1A", borderWidth: 1, borderColor: splitCount === String(n) ? "#D4AF37" : "#2A2A2A" }}
                >
                  <Text style={{ color: splitCount === String(n) ? "#000" : "#FAFAFA", fontWeight: "bold", fontSize: 16 }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handleSplitConfirm} style={{ backgroundColor: "#D4AF37", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#000", fontWeight: "bold", fontSize: 15 }}>Confirm Split</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSplitModal(false)} style={{ alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal visible={showScheduleModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#111111", borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: "#2A2A2A" }}>
            <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 18, marginBottom: 16 }}>Schedule Ride</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 8 }}>Date (DD/MM/YYYY)</Text>
            <TextInput
              value={scheduleDate}
              onChangeText={setScheduleDate}
              placeholder="e.g. 25/12/2024"
              placeholderTextColor="#4A4A4A"
              style={{ backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#FAFAFA", fontSize: 14, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 12 }}
              returnKeyType="next"
            />
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 8 }}>Time (HH:MM)</Text>
            <TextInput
              value={scheduleTime}
              onChangeText={setScheduleTime}
              placeholder="e.g. 14:30"
              placeholderTextColor="#4A4A4A"
              style={{ backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#FAFAFA", fontSize: 14, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 16 }}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => {
                if (!scheduleDate || !scheduleTime) { Alert.alert("Please enter both date and time"); return; }
                setScheduledFor(`${scheduleDate} ${scheduleTime}`);
                setIsScheduled(true);
                setShowScheduleModal(false);
              }}
              style={{ backgroundColor: "#D4AF37", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
            >
              <Text style={{ color: "#000", fontWeight: "bold", fontSize: 15 }}>Confirm Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowScheduleModal(false); setIsScheduled(false); }} style={{ alignItems: "center", paddingVertical: 12 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
