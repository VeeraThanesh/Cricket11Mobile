import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { getMatches } from '../../api/matchApi';
import { Colors, GlobalStyles } from '../../theme/styles';

const STATUS_COLOR: Record<string, string> = {
  live: Colors.success,
  completed: Colors.textMuted,
  toss: Colors.warning,
  setup: Colors.textMuted,
};

export default function MatchListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getMatches()
        .then((res) => setMatches(res.data?.data || []))
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) return <View style={GlobalStyles.centered}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <FlatList
        data={matches}
        keyExtractor={(m) => m._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={<Text style={GlobalStyles.sectionHeader}>Match History ({matches.length})</Text>}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No matches yet. Create one!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLOR[item.status] || Colors.textMuted;
          return (
            <TouchableOpacity
              style={GlobalStyles.card}
              onPress={() => {
                if (item.status === 'completed') navigation.navigate('Scorecard', { matchId: item._id });
                else if (item.status === 'toss') navigation.navigate('Toss', { matchId: item._id });
                // live → would navigate to LiveScoring but we'd need inningsId
              }}>
              <View style={GlobalStyles.spaceBetween}>
                <Text style={styles.matchName}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.teams}>{item.team1Id?.name} vs {item.team2Id?.name}</Text>
              <Text style={styles.meta}>
                {item.matchType} • {item.overs} overs
                {item.venue ? ` • ${item.venue}` : ''}
              </Text>
              {item.result?.type && (
                <Text style={styles.resultText}>
                  {item.result.type === 'tie' ? 'Match Tied' :
                   `${item.result.type === 'runs' ? 'Won by ' + item.result.margin + ' runs' : 'Won by ' + item.result.margin + ' wickets'}`}
                </Text>
              )}
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MatchSetup')}>
        <Text style={styles.fabText}>+ New Match</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  matchName: { color: Colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  teams: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  meta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  resultText: { color: Colors.accent, fontSize: 13, fontWeight: '600', marginTop: 4 },
  date: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  fab: { position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  fabText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
});
