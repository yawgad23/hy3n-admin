import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useDriverAuth } from '@/lib/driver-auth-context';
import { firestoreDB, COLLECTIONS } from '@/lib/firebase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const GOLD = '#D4AF37';
const BG = '#0A0A0A';
const CARD = '#1A1A1A';
const BORDER = '#2A2A2A';
const TEXT = '#FAFAFA';
const MUTED = '#9CA3AF';

export default function DriverRegisterScreen() {
  const { signUp, signInWithGoogle, user } = useDriverAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const createDriverApplication = async (uid: string, name: string, emailAddr: string, phoneNum: string) => {
    await firestoreDB.create(COLLECTIONS.DRIVER_PROFILES, {
      user_id: uid,
      full_name: name,
      email: emailAddr,
      phone: phoneNum,
      approval_status: 'pending',
      is_online: false,
      is_available: false,
      rating: 5.0,
      total_trips: 0,
    });
  };

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      // After sign up, user is set in context — create driver profile
      const { auth } = require('@/lib/firebase');
      const uid = auth.currentUser?.uid || '';
      await createDriverApplication(uid, fullName.trim(), email.trim(), phone.trim());
      Alert.alert(
        'Application Submitted! 🎉',
        'Your driver application has been submitted. Our team will review it and get back to you within 24-48 hours.',
        [{ text: 'OK', onPress: () => router.replace('/driver/(tabs)' as any) }]
      );
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        Alert.alert('Email Already Registered', 'This email is already in use. Please log in instead.');
      } else {
        Alert.alert('Registration Failed', err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      const { auth } = require('@/lib/firebase');
      const uid = auth.currentUser?.uid || '';
      const name = auth.currentUser?.displayName || '';
      const emailAddr = auth.currentUser?.email || '';
      await createDriverApplication(uid, name, emailAddr, '');
      router.replace('/driver/(tabs)' as any);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        Alert.alert('Google Sign-Up Failed', err.message || 'Could not sign up with Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoRow}>
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Apply to Drive 🚗</Text>
        <Text style={styles.subtitle}>Join the HY3N driver fleet in Ghana</Text>

        <View style={styles.card}>
          {/* Google */}
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleRegister} disabled={googleLoading} activeOpacity={0.8}>
            {googleLoading ? <ActivityIndicator size="small" color={TEXT} /> : (
              <>
                <View style={styles.googleIconWrap}><Text style={{ color: '#4285F4', fontWeight: '700', fontSize: 14 }}>G</Text></View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or fill in details</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="person" size={18} color={MUTED} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Kwame Mensah" placeholderTextColor={MUTED} value={fullName} onChangeText={setFullName} autoCapitalize="words" returnKeyType="next" />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="email" size={18} color={MUTED} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={MUTED} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
          </View>

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrap}>
            <Text style={[styles.inputIcon, { color: MUTED, fontSize: 14 }]}>+233</Text>
            <TextInput style={styles.input} placeholder="241234567" placeholderTextColor={MUTED} value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="next" />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <MaterialIcons name="lock" size={18} color={MUTED} style={styles.inputIcon} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min. 6 characters" placeholderTextColor={MUTED} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleRegister} />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
              <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already a driver?  </Text>
            <TouchableOpacity onPress={() => router.push('/driver/login' as any)}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>
          By applying, you agree to HY3N's{' '}
          <Text style={{ color: GOLD }}>Driver Terms</Text> and{' '}
          <Text style={{ color: GOLD }}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 },
  backBtn: { marginBottom: 16 },
  logoRow: { alignItems: 'center', marginBottom: 8 },
  logo: { width: 64, height: 64, borderRadius: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#FAFAFA', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: MUTED, textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: BORDER, borderRadius: 12, height: 48, gap: 10, marginBottom: 16 },
  googleIconWrap: { width: 24, height: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  googleText: { color: '#FAFAFA', fontSize: 15, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { color: MUTED, fontSize: 12 },
  label: { color: MUTED, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 14 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#FAFAFA', fontSize: 15 },
  eyeBtn: { padding: 4 },
  submitBtn: { backgroundColor: GOLD, borderRadius: 12, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 16 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: MUTED, fontSize: 14 },
  loginLink: { color: GOLD, fontSize: 14, fontWeight: '700' },
  footer: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
