/**
 * MapScreen — Mobile Road Damage Live Map
 *
 * Now uses pre-computed road polylines from backend (/api/roads).
 * No more Google Roads API calls from the frontend.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import MapView, { Marker, Callout, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../api';

const SOLAPUR_REGION = {
  latitude: 17.6599,
  longitude: 75.9064,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const SEVERITY_WIDTHS = {
  critical: 7,
  high: 5,
  medium: 4,
  low: 3,
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: '🔴 Critical' },
  { key: 'high', label: '🟠 High' },
  { key: 'medium', label: '🟡 Medium' },
  { key: 'low', label: '🟢 Low' },
];

export default function MapScreen() {
  const [roads, setRoads] = useState([]);
  const [userRegion, setUserRegion] = useState(SOLAPUR_REGION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilter, setFilter] = useState('all');
  const [selectedRoad, setSelectedRoad] = useState(null);
  const mapRef = useRef(null);

  /* ── User location ── */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({});
        setUserRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      } catch (e) {
        console.log('Location error:', e);
      }
    })();
  }, []);

  /* ── Fetch pre-computed road segments from backend ── */
  const fetchRoads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/roads');
      setRoads(data || []);
    } catch (e) {
      console.error('Failed to fetch roads:', e);
      setError('Could not load road data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoads(); }, [fetchRoads]);

  /* ── Filter ── */
  const filtered = selectedFilter === 'all'
    ? roads
    : roads.filter(r => r.severity === selectedFilter);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Live Road Conditions</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Loading…' : `${filtered.length} road segment${filtered.length !== 1 ? 's' : ''} shown`}
        </Text>
      </View>

      {/* Severity filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, selectedFilter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, selectedFilter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading / error overlay */}
      {loading && (
        <View style={styles.banner}>
          <ActivityIndicator size="small" color="#f1f5f9" />
          <Text style={styles.bannerText}>Fetching precomputed road data from server…</Text>
        </View>
      )}
      {error && (
        <View style={[styles.banner, { backgroundColor: '#7f1d1d' }]}>
          <Text style={styles.bannerText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={fetchRoads}>
            <Text style={{ color: '#fca5a5', fontWeight: '700', fontSize: 12, marginLeft: 8 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Severity legend */}
      <View style={styles.legend}>
        {Object.entries(SEVERITY_COLORS).map(([k, v]) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: v }]} />
            <Text style={styles.legendText}>{k}</Text>
          </View>
        ))}
      </View>

      {/* Map */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={userRegion}
          showsUserLocation={true}
          customMapStyle={darkMapStyle}
          onPress={() => setSelectedRoad(null)}
        >
          {/* Render all polylines first */}
          {filtered.map(seg => {
            if (!seg.polyline || seg.polyline.length < 2) return null;
            const color = SEVERITY_COLORS[seg.severity] || '#94a3b8';
            const width = SEVERITY_WIDTHS[seg.severity] || 4;
            const isSelected = selectedRoad?.id === seg.id;
            const coords = seg.polyline.map(p => ({ latitude: p.lat, longitude: p.lng }));

            return (
              <Polyline
                key={`p-${seg.id}`}
                coordinates={coords}
                strokeColor={isSelected ? '#ffffff' : color}
                strokeWidth={isSelected ? width + 3 : width}
                lineCap="round"
                lineJoin="round"
                zIndex={isSelected ? 100 : (seg.severity === 'critical' ? 80 : 50)}
                tappable
                onPress={() => setSelectedRoad(seg)}
              />
            );
          })}

          {/* Render markers on top */}
          {filtered.map(seg => {
            if (!seg.polyline || seg.polyline.length < 2) return null;
            const color = SEVERITY_COLORS[seg.severity] || '#94a3b8';
            const isSelected = selectedRoad?.id === seg.id;
            const centerCoord = { latitude: seg.center_lat, longitude: seg.center_lng };

            return (
              <Marker
                key={`m-${seg.id}`}
                coordinate={centerCoord}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={isSelected ? 101 : 51}
                onPress={() => setSelectedRoad(seg)}
              >
                <View style={[styles.dot, { backgroundColor: color, width: isSelected ? 16 : 11, height: isSelected ? 16 : 11, borderRadius: 10 }]} />
                <Callout tooltip onPress={() => setSelectedRoad(seg)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{seg.severity?.toUpperCase()} severity</Text>
                    <Text style={styles.calloutText}>📊 {seg.report_count} report{seg.report_count !== 1 ? 's' : ''}</Text>
                    <Text style={styles.calloutText}>🎯 Priority: {seg.priority_score?.toFixed(1)}</Text>
                    {seg.statuses?.length > 0 && (
                      <Text style={styles.calloutText}>📋 {[...new Set(seg.statuses)].join(', ')}</Text>
                    )}
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      </View>

      {/* Bottom info card on road select */}
      {selectedRoad && (
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoSeverity, { color: SEVERITY_COLORS[selectedRoad.severity] || '#94a3b8' }]}>
                {selectedRoad.severity?.toUpperCase()} ROAD SEGMENT
              </Text>
              <Text style={styles.infoStat}>📊 {selectedRoad.report_count} report{selectedRoad.report_count !== 1 ? 's' : ''}</Text>
              <Text style={styles.infoStat}>🎯 Priority score: {selectedRoad.priority_score?.toFixed(1)}</Text>
              {selectedRoad.statuses?.length > 0 && (
                <Text style={styles.infoStat}>📋 Status: {[...new Set(selectedRoad.statuses)].join(', ')}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedRoad(null)} style={styles.closeBtn}>
              <Text style={{ color: '#94a3b8', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 16, paddingBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  filterRow: { maxHeight: 42, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: '#6366f1' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  chipTextActive: { color: '#a5b4fc' },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1d4ed8', paddingVertical: 7, marginHorizontal: 12, borderRadius: 8, marginBottom: 4, gap: 8 },
  bannerText: { color: '#f1f5f9', fontSize: 12, fontWeight: '600' },
  legend: { flexDirection: 'row', paddingHorizontal: 14, gap: 14, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 18, height: 4, borderRadius: 2 },
  legendText: { color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' },
  mapWrapper: { flex: 1, borderRadius: 14, overflow: 'hidden', margin: 10, marginTop: 0, borderWidth: 1, borderColor: '#334155' },
  map: { flex: 1 },
  dot: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 3 },
  callout: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, minWidth: 190, borderWidth: 1, borderColor: '#334155' },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  calloutText: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  infoCard: {
    position: 'absolute', bottom: 20, left: 14, right: 14,
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#334155',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    elevation: 10,
  },
  infoSeverity: { fontSize: 13, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 },
  infoStat: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  closeBtn: { padding: 4 },
});
