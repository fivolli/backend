import * as Location from 'expo-location';

export type GeoPoint = { lat: number; lng: number };

export async function getGeoOrNull(): Promise<GeoPoint | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const lat = pos?.coords?.latitude;
  const lng = pos?.coords?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  return { lat, lng };
}
