import React from 'react';
import { Stack } from 'expo-router';
import { DriverAuthProvider } from '@/lib/driver-auth-context';

export default function DriverLayout() {
  return (
    <DriverAuthProvider>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reupload-docs" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </DriverAuthProvider>
  );
}
