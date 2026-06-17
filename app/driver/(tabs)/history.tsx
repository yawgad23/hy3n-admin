import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDriverAuth } from '@/lib/driver-auth-context';
import { firestoreDB, COLLECTIONS } from '@/lib/firebase';

const GOLD = '#D4AF37';
const BG = '#0A0A0A';
const CARD = '#111111';
const BORDER = '#2A2A2A';
const TEXT = '#FAFAFA';
const MUTED = '#9CA3AF';
const GREEN = '#22C55E';

interface Trip {
  id: string;
  pickup: string;
  destination: string;
  fare: number;
  status: string;
  created_date?: string;
  rider_name?: string;
  distance?: number;
}

type Filter = 'all' | 'completed' | 'cancelled';

export default function DriverHistoryScreen() {
  const { user } = useDriverAuth();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    firestoreDB.list(COLLECTIONS.RIDES, { driver_id: user.uid }).then((data: any[]) => {
      setTrips(data as Trip[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const filtered = trips.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search.trim() || t.pickup.toLowerCase().includes(search.toLowerCase()) || t.destination.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalEarnings = trips.filter(t => t.status === 'completed').reduce((s, t) => s + (t.fare || 0), 0);
  const completedCount = trips.filter(t => t.status === 'completed').length;
  const cancelledCount = trips.filter(t => t.status === 'cancelled').length;

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#0D1A0D' : '#2A0000' }]}>
          <Text style={[styles.statusText, { color: item.status === 'completed' ? GREEN : '#F87171' }]}>
            {item.status === 'completed' ? 'Completed' : item.status === 'cancelled' ? 'Cancelled' : item.status}
          </Text>
        </View>
        <Text style={styles.tripDate}>{formatDate(item.created_date)}</Text>
      </View>
      <View style={styles.tripRoute}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: GREEN }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup}</Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>
      <View style={styles.tripFooter}>
        {item.rider_name && <Text style={styles.riderName}><MaterialIcons name="person" size={13} color={MUTED} /> {item.rider_name}</Text>}
        {item.distance && <Text style={styles.tripDistance}>{item.distance.toFixed(1)} km</Text>}
        <Text style={[styles.tripFare, { color: item.status === 'completed' ? GOLD : MUTED }]}>
          {item.status === 'completed' ? `GH₵${item.fare.toFixed(2)}` : '—'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trip History</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>GH₵{totalEarnings.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Total Earned</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{cancelledCount}</Text>
          <Text style={styles.summaryLabel}>Cancelled</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={MUTED} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search trips..."
          placeholderTextColor={MUTED}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={18} color={MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'completed', 'cancelled'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trip List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="history" size={48} color={MUTED} />
          <Text style={styles.emptyTitle}>No trips found</Text>
          <Text style={styles.emptyText}>{trips.length === 0 ? 'Complete your first trip to see it here' : 'Try adjusting your search or filter'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderTrip}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT },
  summaryRow: { flexDirection: 'row', gap: 10, padding: 16 },
  summaryCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: BORDER },
  summaryValue: { fontSize: 16, fontWeight: '800', color: GOLD },
  summaryLabel: { fontSize: 11, color: MUTED, textAlign: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  filterBtnActive: { backgroundColor: GOLD + '20', borderColor: GOLD },
  filterText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: GOLD },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: MUTED },
  emptyText: { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 32 },
  tripCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  tripHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tripDate: { fontSize: 12, color: MUTED },
  tripRoute: { gap: 4, marginBottom: 10 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { flex: 1, color: TEXT, fontSize: 13 },
  routeConnector: { width: 1, height: 10, backgroundColor: BORDER, marginLeft: 3 },
  tripFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  riderName: { color: MUTED, fontSize: 12, flex: 1 },
  tripDistance: { color: MUTED, fontSize: 12 },
  tripFare: { fontSize: 16, fontWeight: '800' },
});
