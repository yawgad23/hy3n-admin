import { useState, useEffect } from "react";
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
import { WebView } from "react-native-webview";
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

const MAP_HTML = (userLat: number, userLng: number, destLat?: number, destLng?: number) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; background: #0A0A0A; }
  .leaflet-control-zoom { display: none; }
  .leaflet-control-attribution { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${userLat}, ${userLng}], 15);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 20
  }).addTo(map);
  var userIcon = L.divIcon({
    className: '',
    html: '<div style="width:20px;height:20px;border-radius:50%;background:#006B3F;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,107,63,0.6);"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  });
  L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);
  ${destLat && destLng ? `
  var destIcon = L.divIcon({
    className: '',
    html: '<div style="width:20px;height:20px;border-radius:50%;background:#D4AF37;border:3px solid #fff;box-shadow:0 2px 8px rgba(212,175,55,0.6);"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10]
  });
  L.marker([${destLat}, ${destLng}], { icon: destIcon }).addTo(map);
  L.polyline([[${userLat}, ${userLng}], [${destLat}, ${destLng}]], {
    color: '#D4AF37', weight: 3, dashArray: '8 6', opacity: 0.8
  }).addTo(map);
  map.fitBounds([[${userLat}, ${userLng}], [${destLat}, ${destLng}]], { padding: [40, 40] });
  ` : ''}
</script>
</body>
</html>
`;

const ICON_MAP: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
  Car: "directions-car",
  Star: "star",
  ShieldCheck: "verified-user",
  Bike: "two-wheeler",
  Package: "inventory",
  Bus: "directions-bus",
  Crown: "workspace-premium",
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

  const mapHtml = MAP_HTML(userLocation[0], userLocation[1], destination?.lat, destination?.lng);

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Map - full screen */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {Platform.OS === "web" ? (
          <View style={{ flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="map" size={64} color="#2A2A2A" />
            <Text style={{ color: "#3A3A3A", marginTop: 12, fontSize: 14 }}>Map loads on device</Text>
          </View>
        ) : (
          <WebView source={{ html: mapHtml }} style={{ flex: 1 }} scrollEnabled={false} javaScriptEnabled />
        )}
      </View>

      {/* Header */}
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

      {/* Bottom Sheet */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111111", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: insets.bottom + 80, maxHeight: SCREEN_HEIGHT * 0.72, borderTopWidth: 1, borderTopColor: "#2A2A2A" }}>
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
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(0,107,63,0.15)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,107,63,0.3)" }}>
                <Text style={{ color: "#006B3F", fontSize: 11, fontWeight: "600" }}>Searching...</Text>
              </View>
            </View>
            {activeRide.scheduled && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(212,175,55,0.08)", borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "rgba(212,175,55,0.2)" }}>
                <MaterialIcons name="schedule" size={16} color="#D4AF37" />
                <Text style={{ color: "#D4AF37", fontSize: 12 }}>Scheduled for {activeRide.scheduled}</Text>
              </View>
            )}
            <View style={{ backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14, marginBottom: 14, gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>To</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12, fontWeight: "500", flex: 1, textAlign: "right" }}>{activeRide.destination.name}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Distance</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12 }}>{activeRide.distance.toFixed(1)} km</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Duration</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12 }}>~{activeRide.duration} min</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Fare</Text>
                <Text style={{ color: "#D4AF37", fontWeight: "bold", fontSize: 13 }}>GH₵{activeRide.fare.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Payment</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12 }}>{activeRide.payment}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCancelRide} style={{ borderWidth: 1, borderColor: "rgba(206,17,38,0.4)", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#CE1126", fontWeight: "600", fontSize: 14 }}>Cancel Ride</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : destination ? (
          // Booking Sheet
          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {/* Destination header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 11 }}>To</Text>
                <Text style={{ color: "#FAFAFA", fontWeight: "600", fontSize: 15 }} numberOfLines={1}>{destination.name}</Text>
                <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 2 }}>{distance.toFixed(1)} km · ~{duration} min</Text>
              </View>
              <TouchableOpacity onPress={handleCancelBooking} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Ride Categories - full width cards */}
            <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Choose Ride</Text>
            <View style={{ gap: 8, marginBottom: 14 }}>
              {RIDE_CATEGORIES.map((cat) => {
                const catFare = calculateFare(cat.id, distance, duration);
                const isSelected = selectedCategory.id === cat.id;
                const iconName = ICON_MAP[cat.icon] || "directions-car";
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? "#D4AF37" : "#2A2A2A", backgroundColor: isSelected ? "rgba(212,175,55,0.08)" : "#1A1A1A" }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: isSelected ? "rgba(212,175,55,0.2)" : "#2A2A2A", alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name={iconName} size={24} color={isSelected ? "#D4AF37" : "#9CA3AF"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FAFAFA", fontWeight: "600", fontSize: 14 }}>{cat.name}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{cat.description}</Text>
                    </View>
                    <Text style={{ color: isSelected ? "#D4AF37" : "#FAFAFA", fontWeight: "bold", fontSize: 15 }}>GH₵{catFare.toFixed(2)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Payment Methods */}
            <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Payment</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = selectedPayment.id === pm.id;
                  const pmIconMap: Record<string, React.ComponentProps<typeof MaterialIcons>["name"]> = {
                    cash: "payments", mobile_money: "smartphone", wallet: "account-balance-wallet", card: "credit-card",
                  };
                  return (
                    <TouchableOpacity
                      key={pm.id}
                      onPress={() => setSelectedPayment(pm)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: isSelected ? "#D4AF37" : "#1A1A1A", borderWidth: 1, borderColor: isSelected ? "#D4AF37" : "#2A2A2A" }}
                    >
                      <MaterialIcons name={pmIconMap[pm.id] || "payments"} size={16} color={isSelected ? "#000" : "#9CA3AF"} />
                      <Text style={{ color: isSelected ? "#000" : "#9CA3AF", fontSize: 12, fontWeight: "600" }}>{pm.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Split Fare */}
            <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Split Fare</Text>
            <TouchableOpacity
              onPress={() => setShowSplitModal(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: splitData ? "#D4AF37" : "#2A2A2A", backgroundColor: splitData ? "rgba(212,175,55,0.08)" : "#1A1A1A", marginBottom: 14 }}
            >
              <MaterialIcons name="group" size={20} color={splitData ? "#D4AF37" : "#9CA3AF"} />
              <View style={{ flex: 1 }}>
                {splitData ? (
                  <>
                    <Text style={{ color: "#D4AF37", fontWeight: "600", fontSize: 14 }}>Split with {splitData.totalPeople - 1} friend{splitData.totalPeople > 2 ? "s" : ""}</Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 12 }}>GH₵{splitData.perPersonFare.toFixed(2)} each</Text>
                  </>
                ) : (
                  <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Split fare with friends</Text>
                )}
              </View>
              {splitData && (
                <TouchableOpacity onPress={() => setSplitData(null)}>
                  <MaterialIcons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Trip Type - Now vs Schedule */}
            <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Trip Type</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: isScheduled ? 8 : 14 }}>
              <TouchableOpacity
                onPress={() => setIsScheduled(false)}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: !isScheduled ? "#D4AF37" : "#2A2A2A", backgroundColor: !isScheduled ? "rgba(212,175,55,0.08)" : "#1A1A1A" }}
              >
                <MaterialIcons name="flash-on" size={16} color={!isScheduled ? "#D4AF37" : "#9CA3AF"} />
                <Text style={{ color: !isScheduled ? "#D4AF37" : "#9CA3AF", fontWeight: "600", fontSize: 13 }}>Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setIsScheduled(true); setShowScheduleModal(true); }}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isScheduled ? "#D4AF37" : "#2A2A2A", backgroundColor: isScheduled ? "rgba(212,175,55,0.08)" : "#1A1A1A" }}
              >
                <MaterialIcons name="schedule" size={16} color={isScheduled ? "#D4AF37" : "#9CA3AF"} />
                <Text style={{ color: isScheduled ? "#D4AF37" : "#9CA3AF", fontWeight: "600", fontSize: 13 }}>Schedule</Text>
              </TouchableOpacity>
            </View>
            {isScheduled && scheduledFor && (
              <TouchableOpacity
                onPress={() => setShowScheduleModal(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#1A1A1A", borderRadius: 14, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 14 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name="event" size={20} color="#D4AF37" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#9CA3AF", fontSize: 11 }}>Scheduled for</Text>
                  <Text style={{ color: "#FAFAFA", fontWeight: "600", fontSize: 14 }}>{scheduledFor}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {/* Promo Code */}
            {!promoExpanded && !appliedPromo ? (
              <TouchableOpacity
                onPress={() => setPromoExpanded(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "#1A1A1A", borderRadius: 14, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 14 }}
              >
                <MaterialIcons name="local-offer" size={18} color="#9CA3AF" />
                <Text style={{ color: "#9CA3AF", fontSize: 14, flex: 1 }}>Add promo code</Text>
                <MaterialIcons name="chevron-right" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : appliedPromo ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "rgba(0,107,63,0.1)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,107,63,0.3)", marginBottom: 14 }}>
                <MaterialIcons name="check-circle" size={18} color="#006B3F" />
                <Text style={{ color: "#006B3F", fontSize: 14, flex: 1, fontWeight: "600" }}>{appliedPromo} applied · -GH₵{discount.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => { setAppliedPromo(null); setPromoInput(""); }}>
                  <MaterialIcons name="close" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: "#1A1A1A", borderRadius: 14, borderWidth: 1, borderColor: "#2A2A2A", marginBottom: 14, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 10 }}>
                  <MaterialIcons name="local-offer" size={18} color="#9CA3AF" />
                  <TextInput
                    autoFocus
                    placeholder="Enter promo code"
                    placeholderTextColor="#9CA3AF"
                    value={promoInput}
                    onChangeText={(t) => { setPromoInput(t); setPromoError(""); }}
                    style={{ flex: 1, color: "#FAFAFA", fontSize: 14 }}
                    autoCapitalize="characters"
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={() => { setPromoExpanded(false); setPromoInput(""); setPromoError(""); }}>
                    <MaterialIcons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {promoError ? <Text style={{ color: "#CE1126", fontSize: 12, paddingHorizontal: 14, paddingBottom: 8 }}>{promoError}</Text> : null}
                <TouchableOpacity
                  onPress={handleApplyPromo}
                  style={{ backgroundColor: "#D4AF37", padding: 12, alignItems: "center" }}
                >
                  <Text style={{ color: "#000", fontWeight: "bold", fontSize: 14 }}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Fare Summary */}
            <View style={{ backgroundColor: "#1A1A1A", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#2A2A2A" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Estimated Fare</Text>
                <Text style={{ color: "#FAFAFA", fontSize: 12 }}>GH₵{baseFare.toFixed(2)}</Text>
              </View>
              {discount > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: "#006B3F", fontSize: 12 }}>Promo Discount</Text>
                  <Text style={{ color: "#006B3F", fontSize: 12 }}>-GH₵{discount.toFixed(2)}</Text>
                </View>
              )}
              {splitData && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Your Share ({splitData.totalPeople} people)</Text>
                  <Text style={{ color: "#D4AF37", fontSize: 12 }}>GH₵{perPersonFare.toFixed(2)}</Text>
                </View>
              )}
              <View style={{ height: 1, backgroundColor: "#2A2A2A", marginVertical: 8 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 15 }}>You Pay</Text>
                <Text style={{ color: "#D4AF37", fontWeight: "bold", fontSize: 18 }}>GH₵{perPersonFare.toFixed(2)}</Text>
              </View>
            </View>

            {/* Book Button */}
            <TouchableOpacity
              onPress={handleBook}
              disabled={bookingLoading}
              style={{ backgroundColor: "#006B3F", borderRadius: 14, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 8 }}
            >
              {bookingLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="navigation" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Request HY3N</Text>
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

      {/* Destination Search Modal */}
      <Modal visible={searchOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#2A2A2A" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={() => { setSearchOpen(false); setSearchQuery(""); }}>
                <MaterialIcons name="arrow-back" size={24} color="#FAFAFA" />
              </TouchableOpacity>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1A", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: "#2A2A2A" }}>
                <MaterialIcons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  autoFocus
                  placeholder="Search destination..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{ flex: 1, color: "#FAFAFA", fontSize: 15 }}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialIcons name="close" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {!searchQuery && savedPlaces.filter((p) => p.lat && p.lng).length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Saved Places</Text>
                {savedPlaces.filter((p) => p.lat && p.lng).map((place, i) => (
                  <TouchableOpacity key={i} onPress={() => handleSelectDestination({ name: place.name, address: place.address, lat: place.lat!, lng: place.lng! })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name={place.name === "Home" ? "home" : "work"} size={20} color="#D4AF37" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FAFAFA", fontWeight: "500", fontSize: 14 }}>{place.name}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{place.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!searchQuery && searchHistory.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Recent</Text>
                  <TouchableOpacity onPress={async () => { setSearchHistory([]); await AsyncStorage.removeItem("searchHistory"); }}>
                    <Text style={{ color: "#CE1126", fontSize: 12 }}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                {searchHistory.map((loc, i) => (
                  <TouchableOpacity key={i} onPress={() => handleSelectDestination(loc)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name="access-time" size={20} color="#9CA3AF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FAFAFA", fontWeight: "500", fontSize: 14 }}>{loc.name}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{loc.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View>
              <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                {searchQuery ? "Results" : "Popular Destinations"}
              </Text>
              {filteredDestinations.length === 0 ? (
                <Text style={{ color: "#9CA3AF", fontSize: 14, textAlign: "center", marginTop: 24 }}>No results found</Text>
              ) : (
                filteredDestinations.map((loc, i) => (
                  <TouchableOpacity key={i} onPress={() => handleSelectDestination(loc)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}>
                      <MaterialIcons name="location-on" size={20} color="#9CA3AF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FAFAFA", fontWeight: "500", fontSize: 14 }}>{loc.name}</Text>
                      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>{loc.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Split Fare Modal */}
      <Modal visible={showSplitModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#111111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 18, marginBottom: 8 }}>Split Fare</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 20 }}>How many people are splitting this ride?</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setSplitCount(String(n))}
                  style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: splitCount === String(n) ? "#D4AF37" : "#2A2A2A", backgroundColor: splitCount === String(n) ? "rgba(212,175,55,0.1)" : "#1A1A1A", alignItems: "center" }}
                >
                  <Text style={{ color: splitCount === String(n) ? "#D4AF37" : "#9CA3AF", fontWeight: "600" }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 20, textAlign: "center" }}>
              GH₵{(perPersonFare / (splitData?.totalPeople || 1)).toFixed(2)} per person · Total GH₵{finalFare.toFixed(2)}
            </Text>
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
      <Modal visible={showScheduleModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#111111", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 18, marginBottom: 8 }}>Schedule Ride</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 20 }}>Enter the date and time for your ride</Text>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 6 }}>Date (e.g. Mon, Jun 16)</Text>
              <TextInput
                placeholder="e.g. Mon, Jun 16"
                placeholderTextColor="#9CA3AF"
                value={scheduleDate}
                onChangeText={setScheduleDate}
                style={{ backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14, color: "#FAFAFA", fontSize: 14, borderWidth: 1, borderColor: "#2A2A2A" }}
              />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 6 }}>Time (e.g. 9:00 AM)</Text>
              <TextInput
                placeholder="e.g. 9:00 AM"
                placeholderTextColor="#9CA3AF"
                value={scheduleTime}
                onChangeText={setScheduleTime}
                style={{ backgroundColor: "#1A1A1A", borderRadius: 12, padding: 14, color: "#FAFAFA", fontSize: 14, borderWidth: 1, borderColor: "#2A2A2A" }}
              />
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!scheduleDate || !scheduleTime) { Alert.alert("Please enter date and time"); return; }
                setScheduledFor(`${scheduleDate} · ${scheduleTime}`);
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
