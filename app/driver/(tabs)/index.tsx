import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Dimensions, Alert, ActivityIndicator, Animated, Image, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useDriverAuth } from '@/lib/driver-auth-context';
import { firestoreDB, COLLECTIONS } from '@/lib/firebase';
import { router } from 'expo-router';

const GOLD = '#D4AF37';
const GREEN = '#22C55E';
const RED = '#EF4444';
const BG = '#0A0A0A';
const CARD = '#111111';
const BORDER = '#2A2A2A';
const TEXT = '#FAFAFA';
const MUTED = '#9CA3AF';
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface RideRequest {
  id: string;
  rider_name?: string;
  rider_phone?: string;
  pickup: { name: string; address: string; lat?: number; lng?: number } | string;
  destination: { name: string; address: string; lat?: number; lng?: number } | string;
  fare: number;
  distance?: number;
  duration?: number;
  eta?: number;
  status: string;
  category?: string;
  ride_pin?: string;
  created_at?: string;
  created_date?: string;
}

interface ActiveTrip {
  id: string;
  rider_name?: string;
  rider_phone?: string;
  pickup: { name: string; address: string } | string;
  destination: { name: string; address: string } | string;
  fare: number;
  status: string;
  ride_pin?: string;
}

export default function DriverHomeScreen() {
  const { driverProfile, user, updateDriverProfile } = useDriverAuth();
  const insets = useSafeAreaInsets();
  const [isOnline, setIsOnline] = useState(driverProfile?.is_online || false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [countdown, setCountdown] = useState(20);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for online indicator
  useEffect(() => {
    if (isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOnline]);

  // Listen for incoming ride requests when online
  useEffect(() => {
    if (!isOnline || !user) return;
    const unsubscribe = firestoreDB.subscribe(
      COLLECTIONS.RIDES,
      { status: 'searching' },
      (rides) => {
        const pending = rides.find((r: any) => !r.driver_id && r.status === 'searching');
        if (pending && !activeTrip) {
          setIncomingRequest(pending as RideRequest);
          setCountdown(20);
        }
      }
    );
    return unsubscribe;
  }, [isOnline, user, activeTrip]);

  // Countdown timer for ride request
  useEffect(() => {
    if (!incomingRequest) { if (countdownRef.current) clearInterval(countdownRef.current); return; }
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setIncomingRequest(null);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [incomingRequest]);

  // Load today's earnings
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    firestoreDB.list(COLLECTIONS.RIDES, { driver_id: user.uid, status: 'completed' }).then((rides: any[]) => {
      const todayRides = rides.filter(r => r.created_date?.startsWith(today));
      setTodayTrips(todayRides.length);
      setTodayEarnings(todayRides.reduce((sum: number, r: any) => sum + (r.fare || 0), 0));
    }).catch(() => {});
  }, [user, activeTrip]);

  const handleToggleOnline = async () => {
    if (!driverProfile) {
      Alert.alert('Profile Incomplete', 'Your driver profile is not set up yet. Please complete registration.');
      return;
    }
    if (driverProfile.approval_status !== 'approved') {
      Alert.alert(
        'Application Pending',
        driverProfile.approval_status === 'rejected'
          ? 'Your application was rejected. Please contact support at hello@ridehy3n.com'
          : 'Your driver application is under review. You\'ll be notified once approved.',
        [{ text: 'OK' }]
      );
      return;
    }
    setTogglingOnline(true);
    try {
      const newStatus = !isOnline;
      await updateDriverProfile({ is_online: newStatus, is_available: newStatus });
      setIsOnline(newStatus);
      if (!newStatus) setIncomingRequest(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleAcceptRide = async () => {
    if (!incomingRequest || !user) return;
    try {
      await firestoreDB.update(COLLECTIONS.RIDES, incomingRequest.id, {
        driver_id: user.uid,
        driver_name: driverProfile?.full_name || 'Driver',
        driver_phone: driverProfile?.phone || '',
        driver_vehicle: driverProfile?.vehicle_make && driverProfile?.vehicle_model
          ? `${driverProfile.vehicle_make} ${driverProfile.vehicle_model}`
          : '',
        driver_plate: driverProfile?.vehicle_plate || '',
        status: 'driver_arriving',
        matched_at: new Date().toISOString(),
      });
      setActiveTrip({ ...incomingRequest, status: 'driver_arriving' });
      setIncomingRequest(null);
    } catch (err) {
      Alert.alert('Error', 'Could not accept ride. Please try again.');
    }
  };

  const handleDeclineRide = () => {
    setIncomingRequest(null);
  };

  const getLocationName = (loc: { name: string; address: string } | string): string => {
    if (typeof loc === 'string') return loc;
    return loc.name || loc.address || 'Unknown';
  };

  const handleTripAction = async (action: 'pickup' | 'start' | 'complete') => {
    if (!activeTrip) return;
    const statusMap = { pickup: 'driver_arrived', start: 'in_progress', complete: 'completed' };
    try {
      await firestoreDB.update(COLLECTIONS.RIDES, activeTrip.id, { status: statusMap[action] });
      if (action === 'complete') {
        setTodayEarnings(prev => prev + activeTrip.fare);
        setTodayTrips(prev => prev + 1);
        setActiveTrip(null);
        Alert.alert('Trip Complete! 🎉', `You earned GH₵${activeTrip.fare.toFixed(2)} on this trip.`);
      } else {
        const timeField = action === 'start' ? { started_at: new Date().toISOString() } : {};
        await firestoreDB.update(COLLECTIONS.RIDES, activeTrip.id, { ...timeField });
        setActiveTrip(prev => prev ? { ...prev, status: statusMap[action] } : null);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update trip status.');
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Maakye 🌅';
    if (h < 17) return 'Maaha ☀️';
    return 'Maadwo 🌙';
  };

  const firstName = driverProfile?.full_name?.split(' ')[0] || 'Driver';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}! 👋</Text>
            <Text style={styles.subGreeting}>Wo ho te sɛn?</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <MaterialIcons name="notifications-none" size={24} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Online/Offline Toggle */}
        <View style={styles.onlineCard}>
          <View style={styles.onlineLeft}>
            <Animated.View style={[styles.onlineDot, { backgroundColor: isOnline ? GREEN : MUTED, transform: [{ scale: isOnline ? pulseAnim : 1 }] }]} />
            <View>
              <Text style={styles.onlineStatus}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
              <Text style={styles.onlineSubtext}>{isOnline ? 'Accepting ride requests' : 'Tap to start accepting rides'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, { backgroundColor: isOnline ? RED : GREEN }, togglingOnline && { opacity: 0.7 }]}
            onPress={handleToggleOnline}
            disabled={togglingOnline}
            activeOpacity={0.85}
          >
            {togglingOnline ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.toggleBtnText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Approval Status Banner */}
        {driverProfile && driverProfile.approval_status !== 'approved' && (
          <View style={[styles.statusBanner, { backgroundColor: driverProfile.approval_status === 'rejected' ? '#3B0000' : '#1A1200' }]}>
            <MaterialIcons name={driverProfile.approval_status === 'rejected' ? 'cancel' : 'hourglass-empty'} size={20} color={driverProfile.approval_status === 'rejected' ? RED : GOLD} />
            <Text style={[styles.statusBannerText, { color: driverProfile.approval_status === 'rejected' ? RED : GOLD }]}>
              {driverProfile.approval_status === 'rejected'
                ? 'Application rejected. Contact hello@ridehy3n.com'
                : 'Application under review — you\'ll be notified once approved'}
            </Text>
          </View>
        )}

        {/* Active Trip */}
        {activeTrip && (
          <View style={styles.activeTripCard}>
            <View style={styles.activeTripHeader}>
              <MaterialIcons name="directions-car" size={20} color={GOLD} />
              <Text style={styles.activeTripTitle}>Active Trip</Text>
              <View style={[styles.tripStatusBadge, { backgroundColor: activeTrip.status === 'in_progress' ? '#1A3300' : '#1A2600' }]}>
                <Text style={[styles.tripStatusText, { color: activeTrip.status === 'in_progress' ? GREEN : GOLD }]}>
                  {activeTrip.status === 'matched' ? 'Heading to Pickup' : activeTrip.status === 'driver_arrived' ? 'At Pickup' : 'In Progress'}
                </Text>
              </View>
            </View>
            <View style={styles.tripRoute}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: GREEN }]} />
              <Text style={styles.routeText} numberOfLines={1}>{getLocationName(activeTrip.pickup)}</Text>
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: RED }]} />
              <Text style={styles.routeText} numberOfLines={1}>{getLocationName(activeTrip.destination)}</Text>
            </View>
            </View>
            <View style={styles.tripFareRow}>
              <Text style={styles.tripFare}>GH₵{activeTrip.fare.toFixed(2)}</Text>
              {activeTrip.rider_phone && (
                <TouchableOpacity style={styles.callBtn}>
                  <MaterialIcons name="phone" size={18} color={GOLD} />
                  <Text style={styles.callBtnText}>Call Rider</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Ride PIN — only shown at pickup in high-traffic zones or when ride_pin exists */}
            {activeTrip.status === 'driver_arrived' && activeTrip.ride_pin && (
              <View style={styles.pinContainer}>
                <MaterialIcons name="pin" size={16} color={GOLD} />
                <Text style={styles.pinLabel}>Ask rider for PIN</Text>
                <View style={styles.pinBoxRow}>
                  {activeTrip.ride_pin.split('').map((digit, i) => (
                    <View key={i} style={styles.pinBox}>
                      <Text style={styles.pinDigit}>{digit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.tripActions}>
              {(activeTrip.status === 'matched' || activeTrip.status === 'driver_arriving') && (
                <TouchableOpacity style={styles.tripActionBtn} onPress={() => handleTripAction('pickup')} activeOpacity={0.85}>
                  <Text style={styles.tripActionText}>Arrived at Pickup</Text>
                </TouchableOpacity>
              )}
              {activeTrip.status === 'driver_arrived' && (
                <TouchableOpacity style={styles.tripActionBtn} onPress={() => handleTripAction('start')} activeOpacity={0.85}>
                  <Text style={styles.tripActionText}>Start Trip</Text>
                </TouchableOpacity>
              )}
              {activeTrip.status === 'in_progress' && (
                <TouchableOpacity style={[styles.tripActionBtn, { backgroundColor: GREEN }]} onPress={() => handleTripAction('complete')} activeOpacity={0.85}>
                  <Text style={styles.tripActionText}>Complete Trip</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Incoming Ride Request */}
        {incomingRequest && !activeTrip && (
          <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTitle}>New Ride Request</Text>
              <View style={styles.countdownBadge}>
                <Text style={[styles.countdownText, { color: countdown <= 5 ? RED : GOLD }]}>{countdown}s</Text>
              </View>
            </View>
            <View style={styles.tripRoute}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: GREEN }]} />
              <Text style={styles.routeText} numberOfLines={1}>{getLocationName(incomingRequest.pickup)}</Text>
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: RED }]} />
              <Text style={styles.routeText} numberOfLines={1}>{getLocationName(incomingRequest.destination)}</Text>
            </View>
            </View>
            <View style={styles.requestMeta}>
              {incomingRequest.distance && <Text style={styles.requestMetaText}>{incomingRequest.distance.toFixed(1)} km</Text>}
              {incomingRequest.eta && <Text style={styles.requestMetaText}>{incomingRequest.eta} min ETA</Text>}
              <Text style={styles.requestFare}>GH₵{incomingRequest.fare.toFixed(2)}</Text>
            </View>
            <View style={styles.requestActions}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineRide} activeOpacity={0.85}>
                <MaterialIcons name="close" size={22} color={RED} />
                <Text style={[styles.requestActionText, { color: RED }]}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptRide} activeOpacity={0.85}>
                <MaterialIcons name="check" size={22} color="#000" />
                <Text style={[styles.requestActionText, { color: '#000' }]}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Today's Earnings Snapshot */}
        <View style={styles.earningsRow}>
          <View style={styles.earningsCard}>
            <MaterialIcons name="account-balance-wallet" size={22} color={GOLD} />
            <Text style={styles.earningsAmount}>GH₵{todayEarnings.toFixed(2)}</Text>
            <Text style={styles.earningsLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.earningsCard}>
            <MaterialIcons name="directions-car" size={22} color={GOLD} />
            <Text style={styles.earningsAmount}>{todayTrips}</Text>
            <Text style={styles.earningsLabel}>Trips Today</Text>
          </View>
          <View style={styles.earningsCard}>
            <MaterialIcons name="star" size={22} color={GOLD} />
            <Text style={styles.earningsAmount}>{driverProfile?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.earningsLabel}>Rating</Text>
          </View>
        </View>

        {/* Driver Info Card */}
        <View style={styles.driverInfoCard}>
          <View style={styles.driverInfoRow}>
            <View style={styles.driverAvatar}>
              <MaterialIcons name="person" size={28} color={GOLD} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driverProfile?.full_name || 'Driver'}</Text>
              <Text style={styles.driverVehicle}>
                {driverProfile?.vehicle_make && driverProfile?.vehicle_model
                  ? `${driverProfile.vehicle_make} ${driverProfile.vehicle_model} · ${driverProfile.vehicle_plate || ''}`
                  : 'Vehicle not set up'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/driver/(tabs)/profile' as any)}>
              <MaterialIcons name="chevron-right" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline message */}
        {!isOnline && !activeTrip && (
          <View style={styles.offlineMsg}>
            <MaterialIcons name="power-settings-new" size={40} color={MUTED} />
            <Text style={styles.offlineMsgTitle}>You're offline</Text>
            <Text style={styles.offlineMsgText}>Go online to start receiving ride requests</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  greeting: { fontSize: 15, fontWeight: '700', color: TEXT },
  subGreeting: { fontSize: 12, color: MUTED },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  onlineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 16, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  onlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  onlineDot: { width: 12, height: 12, borderRadius: 6 },
  onlineStatus: { fontSize: 15, fontWeight: '700', color: TEXT },
  onlineSubtext: { fontSize: 12, color: MUTED, marginTop: 2 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  toggleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12 },
  statusBannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  activeTripCard: { margin: 16, backgroundColor: '#0D1A0D', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1A3300' },
  activeTripHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  activeTripTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT },
  tripStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tripStatusText: { fontSize: 12, fontWeight: '600' },
  tripRoute: { gap: 4, marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { flex: 1, color: TEXT, fontSize: 14 },
  routeConnector: { width: 1, height: 12, backgroundColor: BORDER, marginLeft: 4 },
  tripFareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tripFare: { fontSize: 22, fontWeight: '800', color: GOLD },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1A1200', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  callBtnText: { color: GOLD, fontSize: 13, fontWeight: '600' },
  tripActions: { gap: 8 },
  tripActionBtn: { backgroundColor: GOLD, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  tripActionText: { color: '#000', fontSize: 15, fontWeight: '800' },
  requestCard: { margin: 16, backgroundColor: '#1A1200', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: GOLD + '40' },
  requestHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  requestTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  countdownBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2000', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: GOLD },
  countdownText: { fontSize: 14, fontWeight: '800' },
  requestMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  requestMetaText: { color: MUTED, fontSize: 13 },
  requestFare: { marginLeft: 'auto', fontSize: 18, fontWeight: '800', color: GOLD },
  requestActions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2A0000', borderRadius: 12, height: 48 },
  acceptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: GOLD, borderRadius: 12, height: 48 },
  requestActionText: { fontSize: 15, fontWeight: '800' },
  earningsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 16 },
  earningsCard: { flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: BORDER },
  earningsAmount: { fontSize: 18, fontWeight: '800', color: TEXT },
  earningsLabel: { fontSize: 11, color: MUTED, textAlign: 'center' },
  driverInfoCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  driverInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1A1200', alignItems: 'center', justifyContent: 'center' },
  driverName: { fontSize: 15, fontWeight: '700', color: TEXT },
  driverVehicle: { fontSize: 12, color: MUTED, marginTop: 2 },
  offlineMsg: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  offlineMsgTitle: { fontSize: 18, fontWeight: '700', color: MUTED },
  offlineMsgText: { fontSize: 14, color: MUTED, textAlign: 'center', paddingHorizontal: 32 },
  pinContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 4, backgroundColor: '#1A1400', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#3A2E00' },
  pinLabel: { fontSize: 12, color: GOLD, fontWeight: '600', flex: 1 },
  pinBoxRow: { flexDirection: 'row', gap: 6 },
  pinBox: { width: 28, height: 32, borderRadius: 6, backgroundColor: '#2A2200', borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  pinDigit: { fontSize: 16, fontWeight: '800', color: GOLD, letterSpacing: 1 },
});
