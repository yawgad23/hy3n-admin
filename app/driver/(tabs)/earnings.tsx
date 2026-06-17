import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
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

type Period = 'today' | 'week' | 'month';

interface EarningsSummary {
  total: number;
  trips: number;
  commission: number;
  net: number;
  hours: number;
}

export default function DriverEarningsScreen() {
  const { user, driverProfile } = useDriverAuth();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('today');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<EarningsSummary>({ total: 0, trips: 0, commission: 0, net: 0, hours: 0 });
  const [dailyBreakdown, setDailyBreakdown] = useState<{ day: string; amount: number; trips: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    firestoreDB.list(COLLECTIONS.RIDES, { driver_id: user.uid, status: 'completed' }).then((rides: any[]) => {
      const now = new Date();
      let filtered: any[] = [];
      if (period === 'today') {
        const today = now.toISOString().split('T')[0];
        filtered = rides.filter(r => r.created_date?.startsWith(today));
      } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = rides.filter(r => r.created_date && new Date(r.created_date) >= weekAgo);
      } else {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = rides.filter(r => r.created_date && new Date(r.created_date) >= monthAgo);
      }
      const total = filtered.reduce((s: number, r: any) => s + (r.fare || 0), 0);
      const commissionRate = 0.15; // 15% HY3N commission
      const commission = total * commissionRate;
      const net = total - commission;
      setSummary({ total, trips: filtered.length, commission, net, hours: filtered.length * 0.5 });

      // Daily breakdown for week view
      if (period === 'week') {
        const days: Record<string, { amount: number; trips: number }> = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().split('T')[0];
          days[key] = { amount: 0, trips: 0 };
        }
        filtered.forEach((r: any) => {
          const key = r.created_date?.split('T')[0];
          if (key && days[key]) { days[key].amount += r.fare || 0; days[key].trips += 1; }
        });
        setDailyBreakdown(Object.entries(days).map(([day, v]) => ({
          day: new Date(day).toLocaleDateString('en-GH', { weekday: 'short' }),
          amount: v.amount,
          trips: v.trips,
        })));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user, period]);

  const maxBar = Math.max(...dailyBreakdown.map(d => d.amount), 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Period Tabs */}
        <View style={styles.periodRow}>
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color={GOLD} /></View>
        ) : (
          <>
            {/* Main Earnings Card */}
            <View style={styles.mainCard}>
              <Text style={styles.mainLabel}>Gross Earnings</Text>
              <Text style={styles.mainAmount}>GH₵{summary.total.toFixed(2)}</Text>
              <View style={styles.mainDivider} />
              <View style={styles.mainRow}>
                <View style={styles.mainStat}>
                  <Text style={styles.mainStatValue}>{summary.trips}</Text>
                  <Text style={styles.mainStatLabel}>Trips</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStat}>
                  <Text style={styles.mainStatValue}>GH₵{summary.commission.toFixed(2)}</Text>
                  <Text style={styles.mainStatLabel}>HY3N Fee (15%)</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStat}>
                  <Text style={[styles.mainStatValue, { color: GREEN }]}>GH₵{summary.net.toFixed(2)}</Text>
                  <Text style={styles.mainStatLabel}>Net Earnings</Text>
                </View>
              </View>
            </View>

            {/* Weekly Bar Chart */}
            {period === 'week' && dailyBreakdown.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Daily Breakdown</Text>
                <View style={styles.barChart}>
                  {dailyBreakdown.map((d, i) => (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barAmount}>{d.amount > 0 ? `₵${d.amount.toFixed(0)}` : ''}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${(d.amount / maxBar) * 100}%` }]} />
                      </View>
                      <Text style={styles.barDay}>{d.day}</Text>
                      {d.trips > 0 && <Text style={styles.barTrips}>{d.trips}t</Text>}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Commission Info */}
            <View style={styles.commissionCard}>
              <View style={styles.commissionHeader}>
                <MaterialIcons name="info-outline" size={18} color={GOLD} />
                <Text style={styles.commissionTitle}>HY3N Commission Structure</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>Platform fee</Text>
                <Text style={styles.commissionValue}>15% per trip</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>Daily commission fee</Text>
                <Text style={styles.commissionValue}>GH₵20 / day</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>Payment method</Text>
                <Text style={styles.commissionValue}>Mobile Money</Text>
              </View>
              <Text style={styles.commissionNote}>
                Earnings are paid out every Monday via Mobile Money. Contact hello@ridehy3n.com for payout queries.
              </Text>
            </View>

            {/* Driver Tier */}
            <View style={styles.tierCard}>
              <View style={styles.tierHeader}>
                <MaterialIcons name="star" size={20} color={GOLD} />
                <Text style={styles.tierTitle}>Driver Tier</Text>
              </View>
              <View style={styles.tierRow}>
                {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier, i) => {
                  const trips = [0, 50, 200, 500][i];
                  const isActive = (driverProfile?.total_trips || 0) >= trips && (driverProfile?.total_trips || 0) < ([50, 200, 500, 99999][i]);
                  return (
                    <View key={tier} style={[styles.tierBadge, isActive && styles.tierBadgeActive]}>
                      <Text style={[styles.tierBadgeText, isActive && { color: GOLD }]}>{tier}</Text>
                      <Text style={styles.tierBadgeTrips}>{trips}+ trips</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.tierSubtext}>
                {driverProfile?.total_trips || 0} trips completed · Higher tiers unlock better bonuses
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT },
  periodRow: { flexDirection: 'row', gap: 8, padding: 16 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#111', borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  periodBtnActive: { backgroundColor: GOLD + '20', borderColor: GOLD },
  periodText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  periodTextActive: { color: GOLD },
  loadingWrap: { paddingVertical: 60, alignItems: 'center' },
  mainCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER },
  mainLabel: { fontSize: 13, color: MUTED, marginBottom: 4 },
  mainAmount: { fontSize: 36, fontWeight: '800', color: GOLD, marginBottom: 16 },
  mainDivider: { height: 1, backgroundColor: BORDER, marginBottom: 16 },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  mainStat: { flex: 1, alignItems: 'center', gap: 4 },
  mainStatValue: { fontSize: 15, fontWeight: '800', color: TEXT },
  mainStatLabel: { fontSize: 11, color: MUTED, textAlign: 'center' },
  mainStatDivider: { width: 1, height: 32, backgroundColor: BORDER },
  chartCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BORDER },
  chartTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 16 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barAmount: { fontSize: 9, color: GOLD, fontWeight: '600' },
  barTrack: { flex: 1, width: '100%', backgroundColor: '#1A1A1A', borderRadius: 4, justifyContent: 'flex-end' },
  barFill: { backgroundColor: GOLD, borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: 11, color: MUTED, fontWeight: '600' },
  barTrips: { fontSize: 9, color: MUTED },
  commissionCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BORDER },
  commissionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  commissionTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  commissionLabel: { color: MUTED, fontSize: 13 },
  commissionValue: { color: TEXT, fontSize: 13, fontWeight: '600' },
  commissionNote: { marginTop: 12, fontSize: 12, color: MUTED, lineHeight: 18 },
  tierCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BORDER },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  tierTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  tierRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tierBadge: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: BORDER },
  tierBadgeActive: { backgroundColor: GOLD + '15', borderColor: GOLD },
  tierBadgeText: { fontSize: 12, fontWeight: '700', color: MUTED },
  tierBadgeTrips: { fontSize: 10, color: MUTED, marginTop: 2 },
  tierSubtext: { fontSize: 12, color: MUTED, textAlign: 'center' },
});
