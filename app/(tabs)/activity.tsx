import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface Trip {
  id: string;
  date: string;
  time: string;
  from: string;
  to: string;
  category: string;
  fare: number;
  distance: number;
  duration: number;
  status: "completed" | "cancelled" | "scheduled";
  rating?: number;
  driver?: string;
  payment: string;
}

const PAST_TRIPS: Trip[] = [
  {
    id: "1", date: "Today", time: "10:45 AM",
    from: "Nmai Dzorm", to: "Kotoka International Airport",
    category: "Comfort", fare: 85.50, distance: 14.2, duration: 28,
    status: "completed", rating: 5, driver: "Kwame A.", payment: "Cash",
  },
  {
    id: "2", date: "Yesterday", time: "3:20 PM",
    from: "Accra Mall", to: "Osu Oxford Street",
    category: "Standard", fare: 32.00, distance: 5.8, duration: 18,
    status: "completed", rating: 4, driver: "Ama K.", payment: "MoMo",
  },
  {
    id: "3", date: "Jun 14", time: "8:10 AM",
    from: "University of Ghana", to: "Tema Station",
    category: "Kantanka", fare: 55.20, distance: 9.4, duration: 22,
    status: "completed", rating: 5, driver: "Kofi M.", payment: "Wallet",
  },
  {
    id: "4", date: "Jun 12", time: "6:30 PM",
    from: "Labadi Beach", to: "West Hills Mall",
    category: "Executive", fare: 120.00, distance: 18.5, duration: 42,
    status: "cancelled", payment: "Cash",
  },
  {
    id: "5", date: "Jun 10", time: "11:00 AM",
    from: "Achimota Mall", to: "Accra Mall",
    category: "Okada", fare: 18.80, distance: 4.2, duration: 12,
    status: "completed", rating: 4, driver: "Yaw B.", payment: "Cash",
  },
];

const UPCOMING_TRIPS: Trip[] = [
  {
    id: "6", date: "Jun 17", time: "8:00 AM",
    from: "Accra Central", to: "Kotoka International Airport",
    category: "Executive", fare: 120.00, distance: 15.3, duration: 40,
    status: "scheduled", payment: "Mobile Money",
  },
];

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("past");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const trips = activeTab === "upcoming" ? UPCOMING_TRIPS : PAST_TRIPS;

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <View style={{ flexDirection: "row", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <MaterialIcons key={s} name="star" size={12} color={s <= rating ? "#D4AF37" : "#2A2A2A"} />
        ))}
      </View>
    );
  };

  const statusColor = (s: Trip["status"]) =>
    s === "completed" ? "#006B3F" : s === "cancelled" ? "#CE1126" : "#D4AF37";
  const statusBg = (s: Trip["status"]) =>
    s === "completed" ? "rgba(0,107,63,0.12)" : s === "cancelled" ? "rgba(206,17,38,0.12)" : "rgba(212,175,55,0.12)";

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: "#2A2A2A", flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#D4AF37", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#000", fontWeight: "bold", fontSize: 13 }}>H</Text>
        </View>
        <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 20, flex: 1 }}>Activity</Text>
      </View>

      {/* Tabs - Upcoming / Past */}
      <View style={{ flexDirection: "row", backgroundColor: "#0A0A0A", borderBottomWidth: 0.5, borderBottomColor: "#2A2A2A" }}>
        {(["upcoming", "past"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingVertical: 14, alignItems: "center",
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? "#D4AF37" : "transparent",
            }}
          >
            <Text style={{ color: activeTab === tab ? "#D4AF37" : "#9CA3AF", fontWeight: "600", fontSize: 14, textTransform: "capitalize" }}>
              {tab === "upcoming" ? "Upcoming" : "Past"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D4AF37" />}
      >
        {trips.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <MaterialIcons name={activeTab === "upcoming" ? "schedule" : "history"} size={56} color="#2A2A2A" />
            <Text style={{ color: "#9CA3AF", marginTop: 16, fontSize: 16, fontWeight: "600" }}>
              {activeTab === "upcoming" ? "No upcoming rides" : "No past rides"}
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 6, textAlign: "center" }}>
              {activeTab === "upcoming" ? "Schedule a ride from the Home tab" : "Your completed rides will appear here"}
            </Text>
          </View>
        ) : (
          trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              onPress={() => setSelectedTrip(trip)}
              style={{ backgroundColor: "#111111", borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: "#2A2A2A", marginBottom: 12 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: "#9CA3AF", fontSize: 11 }}>{trip.date} · {trip.time}</Text>
                  <Text style={{ color: "#FAFAFA", fontWeight: "600", fontSize: 15, marginTop: 2 }} numberOfLines={1}>{trip.to}</Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 1 }} numberOfLines={1}>from {trip.from}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: "#D4AF37", fontWeight: "bold", fontSize: 16 }}>
                    {trip.status === "cancelled" ? "—" : `GH₵${trip.fare.toFixed(2)}`}
                  </Text>
                  <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: statusBg(trip.status) }}>
                    <Text style={{ color: statusColor(trip.status), fontSize: 10, fontWeight: "700", textTransform: "capitalize" }}>
                      {trip.status}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#2A2A2A" }}>
                <MaterialIcons name="directions-car" size={13} color="#9CA3AF" />
                <Text style={{ color: "#9CA3AF", fontSize: 12, flex: 1 }}>{trip.category} · {trip.distance.toFixed(1)} km · {trip.duration} min</Text>
                {renderStars(trip.rating)}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Trip Detail Modal */}
      <Modal visible={!!selectedTrip} animationType="slide" presentationStyle="pageSheet">
        {selectedTrip && (
          <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: "#2A2A2A" }}>
              <TouchableOpacity
                onPress={() => setSelectedTrip(null)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A1A1A", alignItems: "center", justifyContent: "center" }}
              >
                <MaterialIcons name="close" size={18} color="#FAFAFA" />
              </TouchableOpacity>
              <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 18, flex: 1 }}>Trip Details</Text>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: statusBg(selectedTrip.status) }}>
                <Text style={{ color: statusColor(selectedTrip.status), fontSize: 12, fontWeight: "700", textTransform: "capitalize" }}>{selectedTrip.status}</Text>
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
              {/* Route */}
              <View style={{ backgroundColor: "#111111", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: "#2A2A2A" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Route</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center" }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#006B3F" }} />
                    <View style={{ width: 1, height: 28, backgroundColor: "#2A2A2A" }} />
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#D4AF37" }} />
                  </View>
                  <View style={{ flex: 1, gap: 18 }}>
                    <View>
                      <Text style={{ color: "#9CA3AF", fontSize: 11 }}>Pickup</Text>
                      <Text style={{ color: "#FAFAFA", fontWeight: "500", fontSize: 14 }}>{selectedTrip.from}</Text>
                    </View>
                    <View>
                      <Text style={{ color: "#9CA3AF", fontSize: 11 }}>Destination</Text>
                      <Text style={{ color: "#FAFAFA", fontWeight: "500", fontSize: 14 }}>{selectedTrip.to}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Distance", value: `${selectedTrip.distance.toFixed(1)} km` },
                  { label: "Duration", value: `${selectedTrip.duration} min` },
                  { label: "Category", value: selectedTrip.category },
                ].map((stat) => (
                  <View key={stat.label} style={{ flex: 1, backgroundColor: "#111111", borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: "#2A2A2A", alignItems: "center" }}>
                    <Text style={{ color: "#9CA3AF", fontSize: 10 }}>{stat.label}</Text>
                    <Text style={{ color: "#FAFAFA", fontWeight: "600", fontSize: 12, marginTop: 4, textAlign: "center" }}>{stat.value}</Text>
                  </View>
                ))}
              </View>

              {/* Fare */}
              <View style={{ backgroundColor: "#111111", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: "#2A2A2A" }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Payment Method</Text>
                  <Text style={{ color: "#FAFAFA", fontSize: 13 }}>{selectedTrip.payment}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#FAFAFA", fontWeight: "bold", fontSize: 15 }}>Total Fare</Text>
                  <Text style={{ color: "#D4AF37", fontWeight: "bold", fontSize: 20 }}>
                    {selectedTrip.status === "cancelled" ? "N/A" : `GH₵${selectedTrip.fare.toFixed(2)}`}
                  </Text>
                </View>
              </View>

              {/* Driver */}
              {selectedTrip.driver && (
                <View style={{ backgroundColor: "#111111", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: "#2A2A2A" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(212,175,55,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <MaterialIcons name="person" size={20} color="#D4AF37" />
                      </View>
                      <View>
                        <Text style={{ color: "#9CA3AF", fontSize: 11 }}>Driver</Text>
                        <Text style={{ color: "#FAFAFA", fontWeight: "500", fontSize: 14 }}>{selectedTrip.driver}</Text>
                      </View>
                    </View>
                    {selectedTrip.rating && (
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ color: "#9CA3AF", fontSize: 11 }}>Your Rating</Text>
                        <View style={{ marginTop: 4 }}>{renderStars(selectedTrip.rating)}</View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Date/Time */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 20 }}>
                <Text style={{ color: "#6B7280", fontSize: 12 }}>{selectedTrip.date}</Text>
                <Text style={{ color: "#6B7280", fontSize: 12 }}>{selectedTrip.time}</Text>
              </View>

              {/* Actions */}
              <View style={{ gap: 10 }}>
                {selectedTrip.status === "completed" && (
                  <TouchableOpacity
                    onPress={() => { setSelectedTrip(null); Alert.alert("Rebook", `Booking a new ${selectedTrip.category} ride to ${selectedTrip.to}`); }}
                    style={{ backgroundColor: "#D4AF37", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                  >
                    <Text style={{ color: "#000", fontWeight: "bold", fontSize: 15 }}>Rebook this Trip</Text>
                  </TouchableOpacity>
                )}
                {selectedTrip.status === "scheduled" && (
                  <TouchableOpacity
                    onPress={() => Alert.alert("Cancel Ride", "Are you sure you want to cancel this scheduled ride?", [
                      { text: "No", style: "cancel" },
                      { text: "Yes, Cancel", style: "destructive", onPress: () => { setSelectedTrip(null); Alert.alert("Ride Cancelled"); } },
                    ])}
                    style={{ borderWidth: 1, borderColor: "rgba(206,17,38,0.4)", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
                  >
                    <Text style={{ color: "#CE1126", fontWeight: "600", fontSize: 15 }}>Cancel Scheduled Ride</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => Alert.alert("Report Issue", "Your report has been submitted. Our team will review it shortly.")}
                  style={{ backgroundColor: "#111111", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 0.5, borderColor: "#2A2A2A" }}
                >
                  <Text style={{ color: "#9CA3AF", fontWeight: "500", fontSize: 14 }}>Report an Issue</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}
