import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import api from '../api';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const reports = await api.get('/reports/public/recent');
      setStats({ recent: reports.length, reports });
    } catch (e) { console.log(e.message); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back 👋</Text>
        <Text style={styles.tagline}>Help improve your city's roads</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={[styles.actionCard, {backgroundColor:'rgba(99,102,241,0.15)'}]} onPress={() => navigation.navigate('Report')}>
          <Text style={styles.actionIcon}>📸</Text>
          <Text style={styles.actionTitle}>Report Damage</Text>
          <Text style={styles.actionSub}>Take a photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, {backgroundColor:'rgba(16,185,129,0.15)'}]} onPress={() => navigation.navigate('MyReports')}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionTitle}>My Reports</Text>
          <Text style={styles.actionSub}>Track status</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, {backgroundColor:'rgba(245,158,11,0.15)'}]} onPress={() => navigation.navigate('Map')}>
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionTitle}>Damage Map</Text>
          <Text style={styles.actionSub}>View nearby</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Reports */}
      <Text style={styles.sectionTitle}>Recent Reports</Text>
      {stats?.reports?.map((r) => (
        <View key={r.id} style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={[styles.badge, r.severity === 'critical' ? styles.critical : r.severity === 'high' ? styles.high : styles.medium]}>
              {r.severity?.toUpperCase()}
            </Text>
            <Text style={styles.reportDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.reportType}>{r.damage_type?.replace('_', ' ')}</Text>
          <Text style={styles.reportLocation}>📍 {r.road_name || 'Unknown road'}</Text>
          <View style={[styles.statusBar, { backgroundColor: r.status === 'completed' ? '#10b981' : r.status === 'repairing' ? '#f59e0b' : '#6366f1' }]}>
            <Text style={styles.statusText}>{r.status?.toUpperCase()}</Text>
          </View>
        </View>
      ))}

      {(!stats?.reports || stats.reports.length === 0) && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛣️</Text>
          <Text style={styles.emptyText}>No reports yet. Start by reporting road damage!</Text>
        </View>
      )}
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 24, paddingTop: 12 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#f1f5f9' },
  tagline: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  actionsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  actionCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#f1f5f9' },
  actionSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', paddingHorizontal: 24, marginBottom: 12 },
  reportCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, fontSize: 10, fontWeight: '700', overflow: 'hidden' },
  critical: { backgroundColor: 'rgba(239,68,68,0.2)', color: '#f87171' },
  high: { backgroundColor: 'rgba(245,158,11,0.2)', color: '#fbbf24' },
  medium: { backgroundColor: 'rgba(99,102,241,0.2)', color: '#a5b4fc' },
  reportDate: { fontSize: 12, color: '#64748b' },
  reportType: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', textTransform: 'capitalize', marginBottom: 4 },
  reportLocation: { fontSize: 13, color: '#94a3b8', marginBottom: 10 },
  statusBar: { borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});
