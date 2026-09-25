import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Animated,
  Alert,
  ActivityIndicator
} from 'react-native';
import { io } from 'socket.io-client';

export default function App() {
  // Default server URL - Users can change this in-app to their ngrok or local network IP
  const [serverUrl, setServerUrl] = useState('http://localhost:5000');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [inputUrl, setInputUrl] = useState('http://localhost:5000');

  // Socket and Lead State
  const [isConnected, setIsConnected] = useState(false);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [lastReceivedTime, setLastReceivedTime] = useState(null);

  const socketRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const leadCounterRef = useRef(0);

  // Connection Handler
  const connectSocket = (url) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log(`🔌 Connecting to socket server at: ${url}`);
    
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server!');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Connection error:', err.message);
      setIsConnected(false);
    });

    // Handle initial leads list sent on connection
    socket.on('initial_leads', (initialLeads) => {
      if (Array.isArray(initialLeads)) {
        const tagged = initialLeads.map((lead, i) => ({
          ...lead,
          _uniqueKey: `init_${Date.now()}_${i}`
        }));
        setLeads(tagged);
      }
    });

    // Handle NEW LEAD live broadcast from Meta Webhook!
    socket.on('new_lead', (newLead) => {
      console.log('⚡ REALTIME LEAD RECEIVED:', newLead.fullName);
      leadCounterRef.current += 1;
      const taggedLead = { ...newLead, _uniqueKey: `lead_${Date.now()}_${leadCounterRef.current}` };
      setLeads((prevLeads) => [taggedLead, ...prevLeads]);
      setLastReceivedTime(new Date().toLocaleTimeString());

      // Pulse animation trigger
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true })
      ]).start();
    });

    socketRef.current = socket;
  };

  useEffect(() => {
    connectSocket(serverUrl);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  // Handle URL change submit
  const handleSaveUrl = () => {
    let formatted = inputUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    setServerUrl(formatted);
    setIsEditingUrl(false);
  };

  const getInitials = (name) => {
    if (!name || name === 'N/A') return 'ML';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderLeadItem = ({ item, index }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.leadCard}
      onPress={() => setSelectedLead(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName}>{item.fullName}</Text>
            {index === 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.leadTime}>{item.createdTime || item.receivedAt}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.detailsList}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>✉️ Email:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>{item.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📞 Phone:</Text>
          <Text style={styles.detailValue}>{item.phoneNumber}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>Meta Lead Ad Live</Text>
        </View>
        <Text style={styles.formIdText}>Form #{item.formId || 'Default'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Main Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>Meta Lead Stream</Text>
            <Text style={styles.headerSubtitle}>Real-time Webhook Feed</Text>
          </View>

          {/* Live Status Badge */}
          <View style={[styles.statusBadge, isConnected ? styles.statusConnected : styles.statusDisconnected]}>
            <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
            <Text style={styles.statusText}>{isConnected ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        {/* Server URL Bar */}
        <View style={styles.urlBarContainer}>
          {isEditingUrl ? (
            <View style={styles.urlInputRow}>
              <TextInput
                style={styles.urlInput}
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="http://192.168.x.x:5000 or ngrok URL"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveUrl}>
                <Text style={styles.saveUrlBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.urlDisplayRow} onPress={() => setIsEditingUrl(true)}>
              <Text style={styles.urlLabel}>Server:</Text>
              <Text style={styles.urlValue} numberOfLines={1}>{serverUrl}</Text>
              <Text style={styles.urlEditHint}>✏️ Change</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Controls & Metrics Header */}
      <View style={styles.metricsBar}>
        <Animated.View style={[styles.metricBox, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.metricNumber}>{leads.length}</Text>
          <Text style={styles.metricLabel}>Total Leads</Text>
        </Animated.View>
      </View>

      {/* Leads Feed List */}
      {leads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📥</Text>
          <Text style={styles.emptyTitle}>Waiting for Incoming Live Leads</Text>
          <Text style={styles.emptyDescription}>
            Submit a lead via Meta's Lead Testing Tool or your live Meta Lead Ad campaign.
          </Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item, index) => item._uniqueKey || `${item.id}_${index}`}
          renderItem={renderLeadItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Lead Detail Modal */}
      <Modal
        visible={!!selectedLead}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedLead(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lead Details</Text>
              <TouchableOpacity onPress={() => setSelectedLead(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedLead && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalHero}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>{getInitials(selectedLead.fullName)}</Text>
                  </View>
                  <Text style={styles.modalLeadName}>{selectedLead.fullName}</Text>
                  <Text style={styles.modalLeadTime}>Received: {selectedLead.createdTime}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{selectedLead.email}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Phone Number</Text>
                    <Text style={styles.infoValue}>{selectedLead.phoneNumber}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>META ADS METADATA</Text>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Leadgen ID</Text>
                    <Text style={styles.infoValue}>{selectedLead.id}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Page ID</Text>
                    <Text style={styles.infoValue}>{selectedLead.pageId}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Form ID</Text>
                    <Text style={styles.infoValue}>{selectedLead.formId}</Text>
                  </View>
                </View>

                {selectedLead.customFields && selectedLead.customFields.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>CUSTOM FORM FIELDS</Text>
                    {selectedLead.customFields.map((cf, idx) => (
                      <View key={idx} style={styles.infoBox}>
                        <Text style={styles.infoLabel}>{cf.label}</Text>
                        <Text style={styles.infoValue}>{cf.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16'
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.3
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)'
  },
  statusDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  dotConnected: {
    backgroundColor: '#22C55E'
  },
  dotDisconnected: {
    backgroundColor: '#EF4444'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  urlBarContainer: {
    marginTop: 14,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  urlDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6
  },
  urlValue: {
    flex: 1,
    fontSize: 13,
    color: '#38BDF8',
    fontFamily: 'Platform'
  },
  urlEditHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  urlInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 2
  },
  saveUrlBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8
  },
  saveUrlBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  metricBox: {
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#38BDF8',
    marginRight: 8
  },
  metricLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500'
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8
  },
  testBtnDisabled: {
    opacity: 0.6
  },
  testBtnIcon: {
    marginRight: 6,
    fontSize: 14
  },
  testBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  listContent: {
    padding: 16
  },
  leadCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16
  },
  cardHeaderInfo: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fullName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    flex: 1
  },
  newBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6
  },
  newBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900'
  },
  leadTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12
  },
  detailsList: {
    marginBottom: 10
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  detailLabel: {
    width: 75,
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600'
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  sourceBadge: {
    backgroundColor: 'rgba(24, 119, 242, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(24, 119, 242, 0.4)'
  },
  sourceBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700'
  },
  formIdText: {
    fontSize: 11,
    color: '#64748B'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyIcon: {
    fontSize: 54,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
    borderTopWidth: 1,
    borderColor: '#334155'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC'
  },
  closeBtn: {
    fontSize: 20,
    color: '#94A3B8',
    padding: 4
  },
  modalBody: {
    marginBottom: 20
  },
  modalHero: {
    alignItems: 'center',
    marginBottom: 20
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800'
  },
  modalLeadName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC'
  },
  modalLeadTime: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4
  },
  modalSection: {
    marginBottom: 18
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 1,
    marginBottom: 8
  },
  infoBox: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600'
  },
  infoValue: {
    fontSize: 14,
    color: '#F8FAFC',
    fontWeight: '600',
    marginTop: 2
  }
});
