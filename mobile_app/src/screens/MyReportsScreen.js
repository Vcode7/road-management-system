import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Modal, ScrollView } from 'react-native';
import api from '../api';

const STATUS_COLORS = {
  submitted: '#6366f1', verified: '#06b6d4', scheduled: '#f59e0b',
  repairing: '#10b981', completed: '#22c55e', rejected: '#ef4444', duplicate: '#64748b',
};

const STATUS_LABELS = {
  submitted: '⏳ Waiting for AI Analysis',
  verified: '✅ Report Accepted',
  scheduled: '📅 Repair Scheduled',
  repairing: '🔧 Repair In Progress',
  completed: '✅ Repair Complete',
  rejected: '❌ Report Rejected',
  duplicate: '🔄 Marked as Duplicate',
};

const FLOW_STAGES = ['submitted', 'verified', 'scheduled', 'repairing', 'completed'];

export default function MyReportsScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      const data = await api.get('/reports?limit=50');
      setReports(data);
    } catch (e) { console.log(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, []);

  const getStageIndex = (status) => {
    const idx = FLOW_STAGES.indexOf(status);
    return idx >= 0 ? idx : (status === 'rejected' ? -1 : 0);
  };

  const renderItem = ({ item: r }) => {
    const isRejected = r.status === 'rejected' || r.status === 'duplicate';
    const isAccepted = getStageIndex(r.status) >= 1;
    const hasAI = r.ai_detection_result?.success;
    const detections = r.ai_detection_result?.detections || r.damages || [];

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(r)} activeOpacity={0.7}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, {backgroundColor: isRejected ? 'rgba(239,68,68,0.12)' : isAccepted ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)'}]}>
          <Text style={[styles.statusLabel, {color: isRejected ? '#f87171' : isAccepted ? '#10b981' : '#a5b4fc'}]}>
            {STATUS_LABELS[r.status] || r.status}
          </Text>
        </View>

        {/* Damage Info */}
        <View style={styles.cardBody}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.damageType}>{r.damage_type?.replace('_', ' ')}</Text>
            <Text style={[styles.severityBadge, {color: r.severity === 'critical' ? '#ef4444' : r.severity === 'high' ? '#fbbf24' : '#a5b4fc'}]}>
              {r.severity?.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.location}>📍 {r.road_name || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}</Text>

          {/* AI Detection Summary */}
          {hasAI && (
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>🤖 AI: {detections.length} detection(s) • {r.ai_detection_result?.overall_severity}</Text>
            </View>
          )}
          {!hasAI && r.status === 'submitted' && (
            <View style={[styles.aiTag, {backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)'}]}>
              <Text style={[styles.aiTagText, {color: '#fbbf24'}]}>⏳ AI analysis pending...</Text>
            </View>
          )}

          {/* Progress Timeline (only if accepted) */}
          {!isRejected && (
            <View style={styles.timeline}>
              {FLOW_STAGES.map((s, i) => {
                const active = getStageIndex(r.status) >= i;
                return (
                  <View key={s} style={styles.timelineStep}>
                    <View style={[styles.dot, active && {backgroundColor: STATUS_COLORS[s] || '#10b981'}]} />
                    {i < FLOW_STAGES.length - 1 && <View style={[styles.line, active && {backgroundColor: STATUS_COLORS[s] || '#10b981'}]} />}
                  </View>
                );
              })}
            </View>
          )}
          <View style={styles.timelineLabels}>
            {['Submit', 'Verified', 'Planned', 'Repair', 'Done'].map((s, i) => <Text key={i} style={styles.tLabel}>{s}</Text>)}
          </View>
        </View>

        <Text style={styles.dateText}>{new Date(r.created_at).toLocaleDateString()} • Tap for details</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); fetchReports(); }} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyIcon}>📋</Text><Text style={styles.emptyText}>No reports yet. Submit one!</Text></View>
        }
        contentContainerStyle={{padding: 16, paddingBottom: 40}}
      />

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selected && (
                <>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <Text style={styles.modalTitle}>Report Details</Text>
                    <TouchableOpacity onPress={() => setSelected(null)}><Text style={{color: '#f87171', fontSize: 18, fontWeight: '700'}}>✕</Text></TouchableOpacity>
                  </View>

                  <View style={[styles.statusBanner, {backgroundColor: selected.status === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', marginBottom: 16}]}>
                    <Text style={[styles.statusLabel, {color: selected.status === 'rejected' ? '#f87171' : '#10b981', fontSize: 16}]}>
                      {STATUS_LABELS[selected.status]}
                    </Text>
                  </View>

                  <View style={styles.detailRow}><Text style={styles.detailKey}>Report ID</Text><Text style={styles.detailVal}>{selected.id?.slice(0,8)}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailKey}>Type</Text><Text style={styles.detailVal}>{selected.damage_type?.replace('_',' ')}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailKey}>Severity</Text><Text style={[styles.detailVal, {color: '#f59e0b'}]}>{selected.severity?.toUpperCase()}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailKey}>Priority</Text><Text style={[styles.detailVal, {color: '#ef4444'}]}>{selected.priority_score?.toFixed(1)}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailKey}>Location</Text><Text style={styles.detailVal}>{selected.road_name || `${selected.latitude?.toFixed(4)}, ${selected.longitude?.toFixed(4)}`}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailKey}>Road Type</Text><Text style={styles.detailVal}>{selected.road_type}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailKey}>Submitted</Text><Text style={styles.detailVal}>{new Date(selected.created_at).toLocaleString()}</Text></View>
                  {selected.description && <View style={styles.detailRow}><Text style={styles.detailKey}>Description</Text><Text style={styles.detailVal}>{selected.description}</Text></View>}

                  {/* AI Results */}
                  {selected.ai_detection_result?.success && (
                    <View style={{marginTop: 16}}>
                      <Text style={styles.sectionTitle}>🤖 AI Analysis</Text>
                      {(selected.ai_detection_result?.detections || []).map((d, i) => (
                        <View key={i} style={styles.detectionCard}>
                          <Text style={styles.detectionType}>{d.damage_type?.replace('_',' ')}</Text>
                          <Text style={styles.detectionMeta}>Confidence: {(d.confidence * 100).toFixed(0)}% • {d.severity}</Text>
                          {d.width_cm && <Text style={styles.detectionMeta}>Size: {d.width_cm}cm × Area: {d.area_cm2}cm²</Text>}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Damage Records */}
                  {selected.damages?.length > 0 && (
                    <View style={{marginTop: 16}}>
                      <Text style={styles.sectionTitle}>📊 Damage Records</Text>
                      {selected.damages.map((d, i) => (
                        <View key={i} style={styles.detectionCard}>
                          <Text style={styles.detectionType}>{d.damage_type?.replace('_',' ')}</Text>
                          <Text style={styles.detectionMeta}>Confidence: {(d.confidence * 100).toFixed(0)}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  statusBanner: { padding: 12, alignItems: 'center' },
  statusLabel: { fontSize: 13, fontWeight: '700' },
  cardBody: { padding: 16 },
  damageType: { fontSize: 17, fontWeight: '700', color: '#f1f5f9', textTransform: 'capitalize' },
  severityBadge: { fontSize: 11, fontWeight: '800' },
  location: { color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 10 },
  aiTag: { backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  aiTagText: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },
  timeline: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#334155' },
  line: { flex: 1, height: 2, backgroundColor: '#334155' },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tLabel: { fontSize: 9, color: '#64748b', flex: 1, textAlign: 'center' },
  dateText: { color: '#64748b', fontSize: 11, paddingHorizontal: 16, paddingBottom: 12 },
  empty: { alignItems: 'center', padding: 60 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  detailKey: { color: '#64748b', fontSize: 13, flex: 1 },
  detailVal: { color: '#f1f5f9', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 10 },
  detectionCard: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 8 },
  detectionType: { color: '#f1f5f9', fontWeight: '600', textTransform: 'capitalize', fontSize: 14 },
  detectionMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
});
