import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoord {
  latitude: number;
  longitude: number;
}

export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  polyline: string; // encoded polyline
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export class MapsService {
  private static instance: MapsService;
  private locationSubscription: Location.LocationSubscription | null = null;

  static getInstance(): MapsService {
    if (!MapsService.instance) {
      MapsService.instance = new MapsService();
    }
    return MapsService.instance;
  }

  /**
   * Request location permission and get current location
   */
  async getCurrentLocation(): Promise<LocationCoord | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (err) {
      console.error('Error getting location:', err);
      return null;
    }
  }

  /**
   * Start listening to location updates (for live GPS tracking)
   */
  startLocationTracking(
    onLocationUpdate: (location: LocationCoord) => void,
    onError?: (error: Error) => void
  ): () => void {
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          onError?.(new Error('Location permission denied'));
          return;
        }

        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 10, // Or every 10 meters
          },
          (location) => {
            onLocationUpdate({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        );
      } catch (err) {
        onError?.(err as Error);
      }
    };

    startTracking();

    // Return cleanup function
    return () => {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }
    };
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(from: LocationCoord, to: LocationCoord): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.latitude * Math.PI) / 180) *
        Math.cos((to.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  /**
   * Calculate ETA in minutes
   */
  calculateETA(distance: number, speedKmh: number = 40): number {
    return Math.round((distance / speedKmh) * 60); // Return minutes
  }

  /**
   * Generate Google Maps URL for opening navigation
   */
  getGoogleMapsUrl(from: LocationCoord, to: LocationCoord): string {
    const origin = `${from.latitude},${from.longitude}`;
    const destination = `${to.latitude},${to.longitude}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }

  /**
   * Generate Apple Maps URL for opening navigation (iOS only)
   */
  getAppleMapsUrl(from: LocationCoord, to: LocationCoord): string {
    const origin = `${from.latitude},${from.longitude}`;
    const destination = `${to.latitude},${to.longitude}`;
    return `maps://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
  }

  /**
   * Get appropriate maps URL based on platform
   */
  getMapsUrl(from: LocationCoord, to: LocationCoord): string {
    if (Platform.OS === 'ios') {
      return this.getAppleMapsUrl(from, to);
    }
    return this.getGoogleMapsUrl(from, to);
  }
}

export default MapsService.getInstance();
