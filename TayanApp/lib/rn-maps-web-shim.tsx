import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  children?: React.ReactNode;
};

type MarkerProps = {
  title?: string;
  pinColor?: string;
  children?: React.ReactNode;
};

type PolylineProps = {
  children?: React.ReactNode;
};

const MapView = forwardRef<any, MapViewProps>(function MapView({ style, children }, ref) {
  useImperativeHandle(ref, () => ({
    fitToCoordinates: () => {},
    animateToRegion: () => {},
  }));

  return (
    <View style={[styles.map, style]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Map preview on web</Text>
      </View>
      {children}
    </View>
  );
});

function Marker({ title, pinColor, children }: MarkerProps) {
  return (
    <View style={[styles.marker, pinColor ? { borderColor: pinColor } : null]}>
      <Text style={styles.markerText}>📍{title ? ` ${title}` : ''}</Text>
      {children}
    </View>
  );
}

function Polyline(_props: PolylineProps) {
  return null;
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9edf3',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
    gap: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2C2D5F',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  marker: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2C2D5F',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markerText: {
    color: '#2C2D5F',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MapView;
export { Marker, Polyline };
