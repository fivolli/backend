import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

declare global {
  interface Window {
    mapkit?: any;
    L?: any;
  }
}

type Coordinate = { latitude: number; longitude: number };
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

type MarkerProps = {
  coordinate?: Coordinate;
  title?: string;
  description?: string;
  pinColor?: string;
  children?: React.ReactNode;
};

type PolylineProps = {
  coordinates?: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
  children?: React.ReactNode;
};

type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  children?: React.ReactNode;
};

type ParsedMarker = {
  coordinate: Coordinate;
  title?: string;
  pinColor?: string;
};

type ParsedPolyline = {
  coordinates: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
};

const FALLBACK_REGION: Region = {
  latitude: 42.8746,
  longitude: 74.5698,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeRegion(input?: Region | null): Region {
  const lat = Number(input?.latitude);
  const lng = Number(input?.longitude);
  const latD = Math.max(0.002, Number(input?.latitudeDelta || FALLBACK_REGION.latitudeDelta || 0.12));
  const lngD = Math.max(0.002, Number(input?.longitudeDelta || FALLBACK_REGION.longitudeDelta || 0.12));
  return {
    latitude: Number.isFinite(lat) ? lat : FALLBACK_REGION.latitude,
    longitude: Number.isFinite(lng) ? lng : FALLBACK_REGION.longitude,
    latitudeDelta: latD,
    longitudeDelta: lngD,
  };
}

function buildBounds(region: Region) {
  const latDelta = Math.max(0.002, Number(region.latitudeDelta || 0.12));
  const lngDelta = Math.max(0.002, Number(region.longitudeDelta || 0.12));
  const north = region.latitude + latDelta / 2;
  const south = region.latitude - latDelta / 2;
  const east = region.longitude + lngDelta / 2;
  const west = region.longitude - lngDelta / 2;
  return { north, south, east, west };
}

function projectToPercent(coord: Coordinate, bounds: { north: number; south: number; east: number; west: number }) {
  const w = Math.max(0.000001, bounds.east - bounds.west);
  const h = Math.max(0.000001, bounds.north - bounds.south);
  const x = ((coord.longitude - bounds.west) / w) * 100;
  const y = ((bounds.north - coord.latitude) / h) * 100;
  return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
}

function flattenMapChildren(children: React.ReactNode, markers: ParsedMarker[], polylines: ParsedPolyline[]) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const t: any = child.type;
    const name = String((t && (t.displayName || t.name)) || '');
    const props: any = child.props || {};

    if (name === 'WebMapMarker') {
      const c = props.coordinate as Coordinate | undefined;
      if (c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
        markers.push({
          coordinate: c,
          title: props.title ? String(props.title) : undefined,
          pinColor: props.pinColor ? String(props.pinColor) : undefined,
        });
      }
    } else if (name === 'WebMapPolyline') {
      const coords = Array.isArray(props.coordinates) ? props.coordinates : [];
      const cleaned = coords.filter((c: any) => c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) as Coordinate[];
      if (cleaned.length >= 2) {
        polylines.push({
          coordinates: cleaned,
          strokeColor: props.strokeColor ? String(props.strokeColor) : undefined,
          strokeWidth: Number(props.strokeWidth || 4),
        });
      }
    }

    if (props.children) {
      flattenMapChildren(props.children, markers, polylines);
    }
  });
}

const MAPKIT_SCRIPT_URL = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
const LEAFLET_SCRIPT_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_STYLE_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const MapView = forwardRef<any, MapViewProps>(function MapView({ style, initialRegion, children }, ref) {
  const [region, setRegion] = useState<Region>(normalizeRegion(initialRegion));
  const [appleReady, setAppleReady] = useState(false);
  const [appleFailed, setAppleFailed] = useState(false);

  const appleToken = String((process.env.EXPO_PUBLIC_APPLE_MAPKIT_TOKEN as string) || '').trim();
  const wantApple = !!appleToken;

  const mapHostRef = useRef<any>(null);
  const appleMapRef = useRef<any>(null);
  const appleAnnotationsRef = useRef<any[]>([]);
  const appleOverlaysRef = useRef<any[]>([]);
  const [leafletReady, setLeafletReady] = useState(false);
  const [leafletFailed, setLeafletFailed] = useState(false);
  const leafletMapRef = useRef<any>(null);
  const leafletLayerGroupRef = useRef<any>(null);

  const parsed = useMemo(() => {
    const markers: ParsedMarker[] = [];
    const polylines: ParsedPolyline[] = [];
    flattenMapChildren(children, markers, polylines);
    return { markers, polylines };
  }, [children]);

  function applyAppleRegion(next: Region) {
    try {
      const mapkit = window.mapkit;
      const map = appleMapRef.current;
      if (!mapkit || !map) return;

      const center = new mapkit.Coordinate(next.latitude, next.longitude);
      const span = new mapkit.CoordinateSpan(
        Math.max(0.002, Number(next.latitudeDelta || 0.12)),
        Math.max(0.002, Number(next.longitudeDelta || 0.12))
      );
      map.region = new mapkit.CoordinateRegion(center, span);
    } catch {
      // ignore
    }
  }

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coords: Coordinate[]) => {
      if (!Array.isArray(coords) || coords.length === 0) return;
      const valid = coords.filter((c: any) => c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
      if (!valid.length) return;
      let minLat = valid[0].latitude;
      let maxLat = valid[0].latitude;
      let minLng = valid[0].longitude;
      let maxLng = valid[0].longitude;
      for (const c of valid) {
        minLat = Math.min(minLat, c.latitude);
        maxLat = Math.max(maxLat, c.latitude);
        minLng = Math.min(minLng, c.longitude);
        maxLng = Math.max(maxLng, c.longitude);
      }
      const latPad = Math.max(0.004, (maxLat - minLat) * 0.25);
      const lngPad = Math.max(0.004, (maxLng - minLng) * 0.25);
      setRegion(
        normalizeRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: maxLat - minLat + latPad,
          longitudeDelta: maxLng - minLng + lngPad,
        })
      );
    },
    animateToRegion: (nextRegion: Region) => {
      setRegion(normalizeRegion(nextRegion));
    },
  }));

  useEffect(() => {
    if (!wantApple) return;
    if (typeof window === 'undefined') return;

    const initMapKit = () => {
      try {
        const mapkit = window.mapkit;
        if (!mapkit) return;
        mapkit.init({
          authorizationCallback: (done: (token: string) => void) => done(appleToken),
          language: 'ru',
        });
        setAppleReady(true);
      } catch {
        setAppleFailed(true);
      }
    };

    if (window.mapkit) {
      initMapKit();
      return;
    }

    const existing = document.querySelector('script[data-apple-mapkit="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', initMapKit, { once: true });
      existing.addEventListener('error', () => setAppleFailed(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPKIT_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-apple-mapkit', '1');
    script.addEventListener('load', initMapKit, { once: true });
    script.addEventListener('error', () => setAppleFailed(true), { once: true });
    document.head.appendChild(script);
  }, [wantApple, appleToken]);

  useEffect(() => {
    if (wantApple) return;
    if (typeof window === 'undefined') return;

    const initLeaflet = () => {
      if (window.L) {
        setLeafletReady(true);
      } else {
        setLeafletFailed(true);
      }
    };

    const existingStyle = document.querySelector('link[data-leaflet-style="1"]');
    if (!existingStyle) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_STYLE_URL;
      link.setAttribute('data-leaflet-style', '1');
      document.head.appendChild(link);
    }

    if (window.L) {
      initLeaflet();
      return;
    }

    const existingScript = document.querySelector('script[data-leaflet-script="1"]') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', initLeaflet, { once: true });
      existingScript.addEventListener('error', () => setLeafletFailed(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-leaflet-script', '1');
    script.addEventListener('load', initLeaflet, { once: true });
    script.addEventListener('error', () => setLeafletFailed(true), { once: true });
    document.head.appendChild(script);
  }, [wantApple]);

  useEffect(() => {
    if (!wantApple || !appleReady || appleFailed) return;
    if (!mapHostRef.current) return;
    if (appleMapRef.current) return;

    try {
      const mapkit = window.mapkit;
      const map = new mapkit.Map(mapHostRef.current, {
        isRotationEnabled: false,
        showsCompass: mapkit.FeatureVisibility.Hidden,
        showsMapTypeControl: false,
      });
      appleMapRef.current = map;
      applyAppleRegion(region);
    } catch {
      setAppleFailed(true);
    }
  }, [wantApple, appleReady, appleFailed]);

  useEffect(() => {
    if (!wantApple || !appleReady || appleFailed) return;
    applyAppleRegion(region);
  }, [wantApple, appleReady, appleFailed, region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  useEffect(() => {
    if (!wantApple || !appleReady || appleFailed) return;
    const mapkit = window.mapkit;
    const map = appleMapRef.current;
    if (!mapkit || !map) return;

    try {
      if (appleAnnotationsRef.current.length) {
        map.removeAnnotations(appleAnnotationsRef.current);
        appleAnnotationsRef.current = [];
      }
      if (appleOverlaysRef.current.length) {
        map.removeOverlays(appleOverlaysRef.current);
        appleOverlaysRef.current = [];
      }

      const anns = parsed.markers.map((m) => {
        const coord = new mapkit.Coordinate(m.coordinate.latitude, m.coordinate.longitude);
        return new mapkit.MarkerAnnotation(coord, {
          title: m.title || '',
          color: m.pinColor || '#D32F2F',
        });
      });
      if (anns.length) {
        map.addAnnotations(anns);
        appleAnnotationsRef.current = anns;
      }

      if (mapkit.PolylineOverlay) {
        const overlays = parsed.polylines
          .map((pl) => {
            const coords = pl.coordinates.map((c) => new mapkit.Coordinate(c.latitude, c.longitude));
            if (coords.length < 2) return null;
            const line = new mapkit.PolylineOverlay(coords);
            if (line && line.style) {
              line.style.strokeColor = pl.strokeColor || '#2C2D5F';
              line.style.lineWidth = Math.max(2, Number(pl.strokeWidth || 4));
            }
            return line;
          })
          .filter(Boolean);
        if (overlays.length) {
          map.addOverlays(overlays);
          appleOverlaysRef.current = overlays;
        }
      }
    } catch {
      // fallback visuals below will still work
    }
  }, [wantApple, appleReady, appleFailed, parsed]);

  useEffect(() => {
    if (wantApple || leafletFailed || !leafletReady) return;
    if (!mapHostRef.current) return;
    if (leafletMapRef.current) return;

    try {
      const L = window.L;
      if (!L) return;
      const map = L.map(mapHostRef.current, {
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);
      leafletLayerGroupRef.current = L.layerGroup().addTo(map);
      leafletMapRef.current = map;

      const lat = region.latitude;
      const lng = region.longitude;
      const z = Math.max(3, Math.min(18, Math.round(11 - Math.log2(Math.max(region.latitudeDelta || 0.02, 0.002) / 0.02))));
      map.setView([lat, lng], z, { animate: false });
    } catch {
      setLeafletFailed(true);
    }
  }, [wantApple, leafletReady, leafletFailed, mapHostRef.current]);

  useEffect(() => {
    if (wantApple || leafletFailed || !leafletReady) return;
    const map = leafletMapRef.current;
    if (!map) return;
    try {
      const z = Math.max(3, Math.min(18, Math.round(11 - Math.log2(Math.max(region.latitudeDelta || 0.02, 0.002) / 0.02))));
      map.setView([region.latitude, region.longitude], z, { animate: false });
    } catch {
      // ignore
    }
  }, [wantApple, leafletReady, leafletFailed, region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);

  useEffect(() => {
    if (wantApple || leafletFailed || !leafletReady) return;
    const L = window.L;
    const group = leafletLayerGroupRef.current;
    if (!L || !group) return;
    try {
      group.clearLayers();

      for (const m of parsed.markers) {
        const marker = L.circleMarker([m.coordinate.latitude, m.coordinate.longitude], {
          radius: 7,
          weight: 2,
          color: '#ffffff',
          fillColor: m.pinColor || '#D32F2F',
          fillOpacity: 1,
        });
        if (m.title) marker.bindTooltip(m.title, { permanent: false, direction: 'top' });
        marker.addTo(group);
      }

      for (const pl of parsed.polylines) {
        const latlngs = pl.coordinates.map((c) => [c.latitude, c.longitude]);
        if (latlngs.length >= 2) {
          L.polyline(latlngs, {
            color: pl.strokeColor || '#2C2D5F',
            weight: Math.max(2, Number(pl.strokeWidth || 4)),
          }).addTo(group);
        }
      }
    } catch {
      // ignore
    }
  }, [wantApple, leafletReady, leafletFailed, parsed]);

  useEffect(() => {
    return () => {
      try {
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
      } catch {
        // ignore
      }
    };
  }, []);

  if (wantApple && appleReady && !appleFailed) {
    return (
      <View style={[styles.map, style]}>
        <View ref={mapHostRef} collapsable={false} style={styles.host} />
      </View>
    );
  }

  if (!wantApple && leafletReady && !leafletFailed) {
    return (
      <View style={[styles.map, style]}>
        <View ref={mapHostRef} collapsable={false} style={styles.host} />
      </View>
    );
  }

  const bounds = buildBounds(region);
  const osmSrc =
    `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
    )}&layer=mapnik`;

  return (
    <View style={[styles.map, style]}>
      <iframe title="map" src={osmSrc} style={styles.iframe as any} />
      <View style={styles.overlay} pointerEvents="none">
        {parsed.polylines.map((pl, idx) => {
          const points = pl.coordinates
            .map((c) => {
              const p = projectToPercent(c, bounds);
              return `${p.x},${p.y}`;
            })
            .join(' ');
          return (
            <svg key={`pl-${idx}`} style={styles.svg as any} viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={points}
                fill="none"
                stroke={pl.strokeColor || '#2C2D5F'}
                strokeWidth={Math.max(1.5, Number(pl.strokeWidth || 4) / 3)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        })}

        {parsed.markers.map((m, idx) => {
          const p = projectToPercent(m.coordinate, bounds);
          const color = m.pinColor || '#D32F2F';
          return (
            <View key={`mk-${idx}`} style={[styles.pinWrap, { left: `${p.x}%`, top: `${p.y}%` }]}>
              <View style={[styles.pinDot, { backgroundColor: color }]} />
              {m.title ? (
                <View style={styles.label}>
                  <Text style={styles.labelText} numberOfLines={1}>{m.title}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
});

function Marker(_props: MarkerProps) {
  return null;
}
Marker.displayName = 'WebMapMarker';

function Polyline(_props: PolylineProps) {
  return null;
}
Polyline.displayName = 'WebMapPolyline';

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e9edf3',
  },
  host: {
    width: '100%',
    height: '100%',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: '0',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  svg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  pinWrap: {
    position: 'absolute',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    alignItems: 'center',
    gap: 4,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  label: {
    backgroundColor: 'rgba(44,45,95,0.9)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    maxWidth: 180,
  },
  labelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MapView;
export { Marker, Polyline };
