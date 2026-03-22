import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../api';

// Must match mobile_app api.js BASE_URL
const BASE_URL = 'https://03f9-2409-40f2-156-c562-540c-6465-8676-89f1.ngrok-free.app';

const SEV_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

/* ─── Extracted result screen (shown after submission) ──────────────────── */
function AIResultScreen({ image, annotatedUrl, hasAI, detections, severity, status, aiResult, onReset, navigation }) {
  const [imageTab, setImageTab] = useState('original'); // 'original' | 'ai'
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const activeUri = imageTab === 'original' ? image : annotatedUrl;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.resultContainer}>

        {/* Status Header */}
        <View style={[styles.statusCard, { backgroundColor: hasAI ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }]}>
          <Text style={styles.statusIcon}>{hasAI ? '✅' : '⏳'}</Text>
          <Text style={[styles.statusTitle, { color: hasAI ? '#10b981' : '#f59e0b' }]}>
            {hasAI ? 'AI Analysis Complete' : 'Waiting for AI Analysis'}
          </Text>
          <Text style={styles.statusSub}>
            {hasAI
              ? `${detections.length} damage(s) detected • ${severity?.toUpperCase()} severity`
              : 'Your report has been submitted and is being analyzed'}
          </Text>
        </View>

        {/* ── Image comparison card ──────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>📸 Image Viewer</Text>

          {/* Tab buttons */}
          <View style={styles.tabRow}>
            {['original', 'ai'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, imageTab === tab && styles.tabActive]}
                onPress={() => { setImageTab(tab); setImgError(false); setImgLoading(tab === 'ai'); }}
              >
                <Text style={[styles.tabText, imageTab === tab && styles.tabTextActive]}>
                  {tab === 'original' ? '📷 Original' : '🤖 AI Detection'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Image display */}
          <View style={styles.imageBox}>
            {imageTab === 'ai' && !annotatedUrl ? (
              <View style={styles.imgPlaceholder}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>No annotated image available</Text>
              </View>
            ) : activeUri ? (
              <>
                {imgLoading && (
                  <View style={[styles.imgPlaceholder, { position: 'absolute', zIndex: 10 }]}>
                    <ActivityIndicator color="#6366f1" />
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>Loading AI image…</Text>
                  </View>
                )}
                {console.log("Active URI:", activeUri)}
                <Image
                  source={{ uri: activeUri }}
                  style={styles.resultImage}
                  resizeMode="contain"
                  onLoadStart={() => setImgLoading(true)}
                  onLoadEnd={() => setImgLoading(false)}
                  onError={(e) => { 
                    console.error("Image load error:", e?.nativeEvent?.error);
                    setImgLoading(false); 
                    setImgError(true); 
                  }}
                />
                {imgError && (
                  <View style={styles.imgPlaceholder}>
                    <Text style={{ fontSize: 28 }}>⚠️</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                      Image not reachable — is the server running?
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.imgPlaceholder}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>No image</Text>
              </View>
            )}
          </View>

          {/* AI label */}
          {imageTab === 'ai' && annotatedUrl && (
            <Text style={styles.aiLabel}>🧠 AI Verified Damage Detection</Text>
          )}
        </View>

        {/* Report status badge */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Report Status</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: status === 'submitted' ? '#6366f1' : status === 'duplicate' ? '#64748b' : '#10b981'
          }]}>
            <Text style={styles.statusBadgeText}>{status?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Detection list */}
        {hasAI && detections.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>AI Detection Results</Text>
            {detections.map((d, i) => (
              <View key={i} style={styles.detectionRow}>
                <View style={[styles.detectionDot, { backgroundColor: SEV_COLORS[d.severity] || '#ef4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detectionType}>{d.damage_type?.replace('_', ' ')}</Text>
                  <Text style={styles.detectionMeta}>
                    Confidence: {(d.confidence * 100).toFixed(0)}% • Severity: {d.severity}
                  </Text>
                  {d.width_cm && (
                    <Text style={styles.detectionMeta}>Width: {d.width_cm}cm • Area: {d.area_cm2}cm²</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Details */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Report Details</Text>
          <View style={styles.detailRow}><Text style={styles.detailKey}>ID</Text><Text style={styles.detailVal}>{aiResult.id?.slice(0, 8)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailKey}>Location</Text><Text style={styles.detailVal}>{aiResult.latitude?.toFixed(4)}, {aiResult.longitude?.toFixed(4)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailKey}>Priority</Text><Text style={[styles.detailVal, { color: '#f59e0b', fontWeight: '700' }]}>{aiResult.priority_score?.toFixed(1)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailKey}>Severity</Text><Text style={[styles.detailVal, { color: SEV_COLORS[severity] || '#94a3b8' }]}>{severity?.toUpperCase()}</Text></View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.newReportBtn} onPress={onReset}>
          <Text style={styles.newReportText}>📸 Submit Another Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('MyReports')}>
          <Text style={styles.viewAllText}>📋 View All My Reports</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ─── Main capture screen ───────────────────────────────────────────────── */
export default function ReportScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    })();
  }, []);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    console.log("Camera result:", result);
    if (!result.canceled && result.assets) setImage(result.assets[0].uri);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) setImage(result.assets[0].uri);
  };

  const submitReport = async () => {
    if (!image) { Alert.alert('Please capture or select an image first'); return; }
    if (!location) { Alert.alert('Waiting for GPS location...'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      formData.append('damage_type', 'unknown');
      formData.append('description', 'Reported via mobile app');
      formData.append('road_type', 'local');
      formData.append('traffic_density', '2.0');
      formData.append('images', { uri: image, name: 'report.jpg', type: 'image/jpeg' });

      const result = await api.postForm('/reports', formData);
      setAiResult(result);
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setImage(null); setSubmitted(false); setAiResult(null); };

  // ── After submission ────────────────────────────────────────────────────
  if (submitted && aiResult) {
    const hasAI      = aiResult.ai_detection_result?.success;
    const detections = aiResult.ai_detection_result?.detections || [];
    const severity   = aiResult.severity || aiResult.ai_detection_result?.overall_severity;
    const status     = aiResult.status;

    // Build the annotated image URL from the backend file path
    const rawPath = (aiResult.processed_image_urls || [])[0] || null;
    const annotatedUrl = rawPath
      ? `${BASE_URL}/uploads/processed/${rawPath.replace(/\\/g, '/').split('/processed/').pop()}`
      : null;

    return (
      <AIResultScreen
        image={image}
        annotatedUrl={annotatedUrl}
        hasAI={hasAI}
        detections={detections}
        severity={severity}
        status={status}
        aiResult={aiResult}
        onReset={reset}
        navigation={navigation}
      />
    );
  }

  // ── Capture screen ──────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Report Road Damage</Text>
      <Text style={styles.subtitle}>Take a photo or pick from gallery, then submit</Text>

      {/* Capture Buttons */}
      <View style={styles.captureRow}>
        <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
          <Text style={styles.captureIcon}>📷</Text>
          <Text style={styles.captureLabel}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.captureBtn, { backgroundColor: 'rgba(6,182,212,0.12)' }]} onPress={pickImage}>
          <Text style={styles.captureIcon}>🖼️</Text>
          <Text style={[styles.captureLabel, { color: '#67e8f9' }]}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      {image ? (
        <View style={styles.placeholder}>
          <Image source={{ uri: image }} width={200} height={100} resizeMode="cover" />
          <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
            <Text style={styles.removeBtnText}>✕ Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📸</Text>
          <Text style={styles.placeholderText}>No image selected</Text>
        </View>
      )}

      {/* GPS Status */}
      <View style={styles.gpsRow}>
        <Text style={styles.gpsLabel}>📍 GPS Location</Text>
        <Text style={[styles.gpsValue, { color: location ? '#10b981' : '#f59e0b' }]}>
          {location
            ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
            : 'Getting location...'}
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, (!image || submitting) && { opacity: 0.5 }]}
        onPress={submitReport}
        disabled={!image || submitting}
      >
        {submitting ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.submitText}>Submitting & Running AI Analysis...</Text>
          </View>
        ) : (
          <Text style={styles.submitText}>🚀 Submit Report</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.hint}>AI will automatically analyze the image for damage detection</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0f172a' },
  title:            { fontSize: 24, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  subtitle:         { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  captureRow:       { flexDirection: 'row', gap: 12, marginBottom: 20 },
  captureBtn:       { flex: 1, backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  captureIcon:      { fontSize: 32, marginBottom: 8 },
  captureLabel:     { fontSize: 15, fontWeight: '700', color: '#a5b4fc' },
  previewBox:       { borderRadius: 16, overflow: 'hidden', marginBottom: 20, backgroundColor: '#1e293b' },
  preview:          { width: '90vw', height: 250, borderRadius: 16 },
  removeBtn:        { padding: 12, alignItems: 'center' },
  removeBtnText:    { color: '#f87171', fontWeight: '600', fontSize: 14 },
  placeholder:      { height: 180, backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  placeholderIcon:  { fontSize: 40, marginBottom: 8 },
  placeholderText:  { color: '#64748b', fontSize: 14 },
  gpsRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  gpsLabel:         { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  gpsValue:         { fontSize: 13, fontWeight: '600' },
  submitBtn:        { backgroundColor: '#6366f1', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 },
  submitText:       { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint:             { color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 40 },
  // Result screen
  resultContainer:  { padding: 20 },
  statusCard:       { borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  statusIcon:       { fontSize: 48, marginBottom: 12 },
  statusTitle:      { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  statusSub:        { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  infoCard:         { backgroundColor: '#1e293b', borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  infoLabel:        { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginBottom: 12 },
  // Image tabs
  tabRow:           { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab:              { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0f172a', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  tabActive:        { backgroundColor: 'rgba(99,102,241,0.18)', borderColor: '#6366f1' },
  tabText:          { fontSize: 13, color: '#64748b', fontWeight: '600' },
  tabTextActive:    { color: '#a5b4fc' },
  imageBox:         { width: '100%', height: 240, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  resultImage:      { width: '100%', height: '100%', flex: 1 },
  imgPlaceholder:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  aiLabel:          { fontSize: 11, color: '#6366f1', fontWeight: '700', textAlign: 'center', marginTop: 8, letterSpacing: 0.5 },
  // Detection / details
  statusBadge:      { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  detectionRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  detectionDot:     { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  detectionType:    { color: '#f1f5f9', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  detectionMeta:    { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  detailRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  detailKey:        { color: '#64748b', fontSize: 13 },
  detailVal:        { color: '#f1f5f9', fontSize: 13, fontWeight: '500' },
  newReportBtn:     { backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  newReportText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  viewAllBtn:       { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 40 },
  viewAllText:      { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
});
