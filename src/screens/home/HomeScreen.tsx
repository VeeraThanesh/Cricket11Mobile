import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, StatusBar, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { useAuth } from '../../context/AuthContext';
import { getMatches } from '../../api/matchApi';
import { Colors, GlobalStyles } from '../../theme/styles';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    try {
      const res = await getMatches({ limit: 3 });
      setRecentMatches(res.data?.data || []);
    } catch (_) {}
  };

  const statusColor = (status: string) => {
    if (status === 'live') return Colors.success;
    if (status === 'completed') return Colors.textMuted;
    return Colors.warning;
  };

  return (
    <SafeAreaView style={[GlobalStyles.screen, styles.safeArea]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>Welcome,</Text>
            <Text style={styles.userName}>{user?.userName} 👋</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={GlobalStyles.sectionHeader}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('MatchSetup', {})}>
            <Text style={styles.quickIcon}>🏏</Text>
            <Text style={styles.quickLabel}>New Match</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('AddPlayer', {})}>
            <Text style={styles.quickIcon}>👤</Text>
            <Text style={styles.quickLabel}>Add Player</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('CreateTeam', {})}>
            <Text style={styles.quickIcon}>🏟️</Text>
            <Text style={styles.quickLabel}>Create Team</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => (navigation as any).navigate('Matches')}>
            <Text style={styles.quickIcon}>📊</Text>
            <Text style={styles.quickLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Matches */}
        <Text style={GlobalStyles.sectionHeader}>Recent Matches</Text>
        {recentMatches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No matches yet. Start a new match!</Text>
          </View>
        ) : (
          recentMatches.map((m) => (
            <TouchableOpacity
              key={m._id}
              style={GlobalStyles.card}
              onPress={() =>
                (m.status === 'live' || m.status === 'interrupted')
                  ? navigation.navigate('LiveScoring', { matchId: m._id })
                  : navigation.navigate('Scorecard', { matchId: m._id })
              }>
              <View style={GlobalStyles.spaceBetween}>
                <Text style={styles.matchName}>{m.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(m.status) + '33', borderColor: statusColor(m.status) }]}>
                  <Text style={[styles.statusText, { color: statusColor(m.status) }]}>{m.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.matchTeams}>
                {m.team1Id?.name} vs {m.team2Id?.name}
              </Text>
              <Text style={styles.matchMeta}>{m.matchType} • {m.overs} overs</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: Colors.primaryDark,
  },
  greet: { color: Colors.textSecondary, fontSize: 13 },
  userName: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  logoutBtn: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: Colors.error, fontWeight: '600', fontSize: 13 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  quickCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  quickIcon: { fontSize: 32, marginBottom: 8 },
  quickLabel: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  emptyBox: { margin: 16, padding: 24, backgroundColor: Colors.surface, borderRadius: 12, alignItems: 'center', borderColor: Colors.border, borderWidth: 1 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  matchName: { color: Colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  matchTeams: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  matchMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
