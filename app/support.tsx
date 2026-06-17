import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

const GREEN = "#006B3F";
const RED = "#CE1126";
const GOLD = "#D4AF37";
const BG = "#0A0A0A";
const CARD = "#1A1A1A";
const BORDER = "#2A2A2A";
const TEXT = "#FAFAFA";
const MUTED = "#9CA3AF";

const TICKET_CATEGORIES = [
  { id: "ride_issue", label: "Ride Issue", icon: "directions-car" as const, color: RED },
  { id: "payment", label: "Payment Problem", icon: "payment" as const, color: GOLD },
  { id: "driver", label: "Driver Complaint", icon: "person" as const, color: "#EA580C" },
  { id: "app_bug", label: "App Bug", icon: "bug-report" as const, color: "#4A90E2" },
  { id: "account", label: "Account Issue", icon: "manage-accounts" as const, color: "#9B59B6" },
  { id: "other", label: "Other", icon: "help" as const, color: MUTED },
];

const MOCK_TICKETS = [
  { id: "TKT-001", category: "Payment Problem", subject: "Overcharged for ride to Airport", status: "resolved" as const, date: "Jun 14, 2026", response: "We've refunded GH₵12.50 to your wallet. Sorry for the inconvenience!" },
  { id: "TKT-002", category: "App Bug", subject: "Map not loading on home screen", status: "in_progress" as const, date: "Jun 16, 2026", response: null },
];

export default function SupportScreen() {
  const router = useRouter();
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState(MOCK_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<typeof MOCK_TICKETS[0] | null>(null);

  const handleSubmit = async () => {
    if (!selectedCategory) { Alert.alert("Required", "Please select a category"); return; }
    if (!subject.trim()) { Alert.alert("Required", "Please enter a subject"); return; }
    if (!description.trim() || description.length < 20) { Alert.alert("Required", "Please describe your issue in at least 20 characters"); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    const newTicket = {
      id: "TKT-" + String(tickets.length + 3).padStart(3, "0"),
      category: TICKET_CATEGORIES.find(c => c.id === selectedCategory)?.label || "Other",
      subject,
      status: "in_progress" as const,
      date: new Date().toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" }),
      response: null,
    };
    setTickets(prev => [newTicket, ...prev]);
    setSubmitting(false);
    setShowNewTicket(false);
    setSelectedCategory("");
    setSubject("");
    setDescription("");
    Alert.alert("Ticket Submitted", `Your support ticket ${newTicket.id} has been submitted. We'll respond within 24 hours.`);
  };

  const statusConfig = {
    resolved: { label: "Resolved", color: GREEN },
    in_progress: { label: "In Progress", color: GOLD },
    open: { label: "Open", color: "#4A90E2" },
  };

  return (
    <ScreenContainer containerClassName="bg-[#0A0A0A]" safeAreaClassName="bg-[#0A0A0A]">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: BORDER }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="arrow-back" size={20} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 18, flex: 1 }}>Contact Support</Text>
        <TouchableOpacity
          onPress={() => setShowNewTicket(true)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${GREEN}1A`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: `${GREEN}4D` }}
        >
          <MaterialIcons name="add" size={16} color={GREEN} />
          <Text style={{ color: GREEN, fontWeight: "600", fontSize: 13 }}>New Ticket</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        {/* Contact Options */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => {
              const whatsappUrl = "https://wa.me/233200000000?text=Hi%20HY3N%20Support%2C%20I%20need%20help%20with%20my%20ride.";
              Linking.canOpenURL(whatsappUrl).then(supported => {
                if (supported) {
                  Linking.openURL(whatsappUrl);
                } else {
                  Alert.alert("WhatsApp not found", "Please install WhatsApp or email us at hello@ridehy3n.com");
                }
              });
            }}
            style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 0.5, borderColor: BORDER, gap: 6 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN + "1A", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="chat" size={20} color={GREEN} />
            </View>
            <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 12 }}>Live Chat</Text>
            <Text style={{ color: MUTED, fontSize: 10 }}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("tel:+233200000000")}
            style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 0.5, borderColor: BORDER, gap: 6 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#4A90E21A", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="call" size={20} color="#4A90E2" />
            </View>
            <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 12 }}>Call Us</Text>
            <Text style={{ color: MUTED, fontSize: 10 }}>24/7 Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:hello@ridehy3n.com?subject=HY3N%20Rider%20Support&body=Hi%20HY3N%20Support%20Team%2C%0A%0AI%20need%20help%20with%3A%0A%0A")}
            style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 0.5, borderColor: BORDER, gap: 6 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: GOLD + "1A", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="email" size={20} color={GOLD} />
            </View>
            <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 12 }}>Email</Text>
            <Text style={{ color: MUTED, fontSize: 10 }}>Within 24h</Text>
          </TouchableOpacity>
        </View>

        {/* My Tickets */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 16 }}>My Tickets</Text>
          <Text style={{ color: MUTED, fontSize: 12 }}>{tickets.length} total</Text>
        </View>

        {tickets.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <MaterialIcons name="support-agent" size={40} color={MUTED} />
            <Text style={{ color: MUTED, fontSize: 14, marginTop: 12, textAlign: "center" }}>No support tickets yet.</Text>
          </View>
        ) : (
          tickets.map((ticket) => {
            const sc = statusConfig[ticket.status] || statusConfig.open;
            return (
              <TouchableOpacity
                key={ticket.id}
                onPress={() => setSelectedTicket(ticket)}
                style={{ backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 0.5, borderColor: BORDER }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ color: MUTED, fontSize: 11, fontWeight: "600" }}>{ticket.id}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: sc.color + "1A" }}>
                        <Text style={{ color: sc.color, fontSize: 10, fontWeight: "700" }}>{sc.label}</Text>
                      </View>
                    </View>
                    <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 13 }} numberOfLines={1}>{ticket.subject}</Text>
                    <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{ticket.category} • {ticket.date}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={18} color={MUTED} />
                </View>
                {ticket.response && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: BORDER, flexDirection: "row", gap: 8 }}>
                    <MaterialIcons name="support-agent" size={14} color={GREEN} />
                    <Text style={{ color: MUTED, fontSize: 11, flex: 1 }} numberOfLines={2}>{ticket.response}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* New Ticket Modal */}
      <Modal visible={showNewTicket} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 0.5, borderBottomColor: BORDER }}>
            <TouchableOpacity onPress={() => setShowNewTicket(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="close" size={20} color={TEXT} />
            </TouchableOpacity>
            <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 18, flex: 1 }}>New Support Ticket</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "600", marginBottom: 10 }}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {TICKET_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: selectedCategory === cat.id ? cat.color + "1A" : CARD, borderWidth: 1, borderColor: selectedCategory === cat.id ? cat.color : BORDER }}
                >
                  <MaterialIcons name={cat.icon} size={14} color={selectedCategory === cat.id ? cat.color : MUTED} />
                  <Text style={{ color: selectedCategory === cat.id ? cat.color : MUTED, fontWeight: "600", fontSize: 12 }}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "600", marginBottom: 6 }}>Subject</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief description of your issue"
              placeholderTextColor="#4A4A4A"
              style={{ backgroundColor: CARD, borderRadius: 12, padding: 14, color: TEXT, fontSize: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 14 }}
            />

            <Text style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "600", marginBottom: 6 }}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Please describe your issue in detail..."
              placeholderTextColor="#4A4A4A"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ backgroundColor: CARD, borderRadius: 12, padding: 14, color: TEXT, fontSize: 14, borderWidth: 1, borderColor: BORDER, marginBottom: 20, minHeight: 120 }}
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{ backgroundColor: GREEN, borderRadius: 14, paddingVertical: 15, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>Submit Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal visible={!!selectedTicket} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: BG }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 0.5, borderBottomColor: BORDER }}>
            <TouchableOpacity onPress={() => setSelectedTicket(null)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="close" size={20} color={TEXT} />
            </TouchableOpacity>
            <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 18, flex: 1 }}>Ticket Details</Text>
          </View>
          {selectedTicket && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: BORDER }}>
                {[
                  { label: "Ticket ID", value: selectedTicket.id },
                  { label: "Category", value: selectedTicket.category },
                  { label: "Date", value: selectedTicket.date },
                  { label: "Status", value: (statusConfig[selectedTicket.status] || statusConfig.open).label },
                ].map((row) => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                    <Text style={{ color: MUTED, fontSize: 13 }}>{row.label}</Text>
                    <Text style={{ color: TEXT, fontSize: 13, fontWeight: "600" }}>{row.value}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "600", marginBottom: 8 }}>Your Issue</Text>
              <View style={{ backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 0.5, borderColor: BORDER }}>
                <Text style={{ color: TEXT, fontWeight: "bold", fontSize: 14, marginBottom: 6 }}>{selectedTicket.subject}</Text>
              </View>
              {selectedTicket.response && (
                <>
                  <Text style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "600", marginBottom: 8 }}>Support Response</Text>
                  <View style={{ backgroundColor: `${GREEN}1A`, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: `${GREEN}4D` }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <MaterialIcons name="support-agent" size={18} color={GREEN} />
                      <Text style={{ color: GREEN, fontWeight: "600", fontSize: 13 }}>HY3N Support Team</Text>
                    </View>
                    <Text style={{ color: TEXT, fontSize: 13, lineHeight: 20 }}>{selectedTicket.response}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}
