import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TouchableOpacity, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import { getMatch, completeMatch } from '../../api/matchApi';
import { Colors } from '../../theme/styles';

export default function MatchResultScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { matchId } = route.params;

  const [matchData, setMatchData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    handleComplete();
  }, []);

  const handleComplete = async () => {
    try {
      const res = await completeMatch(matchId);
      setResult(res.data?.data?.result);
      const matchRes = await getMatch(matchId);
      setMatchData(matchRes.data?.data?.match);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not finalize match');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  const winner = matchData?.team1Id?._id === result?.winnerId ? matchData?.team1Id : matchData?.team2Id;
  const isTie = result?.type === 'tie';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primaryDark }}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.container}>
        <Text style={styles.trophy}>{isTie ? '🤝' : '🏆'}</Text>

        {isTie ? (
          <>
            <Text style={styles.resultTitle}>Match Tied!</Text>
            <Text style={styles.matchName}>{matchData?.name}</Text>
          </>
        ) : (
          <>
            <Text style={styles.winnerName}>{winner?.name}</Text>
            <Text style={styles.resultTitle}>
              {result?.type === 'runs' ? `Won by ${result?.margin} runs` : `Won by ${result?.margin} wickets`}
            </Text>
            <Text style={styles.matchName}>{matchData?.name}</Text>
          </>
        )}

        <View style={styles.teamsRow}>
          <View style={styles.teamBox}>
            <Text style={styles.teamName}>{matchData?.team1Id?.name}</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.teamBox}>
            <Text style={styles.teamName}>{matchData?.team2Id?.name}</Text>
          </View>
        </View>

        <View style={styles.btnGroup}>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Scorecard', { matchId })}>
            <Text style={styles.btnText}>📋 Full Scorecard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] }))}>
            <Text style={[styles.btnText, { color: Colors.textSecondary }]}>🏠 Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  trophy: { fontSize: 80, marginBottom: 16 },
  winnerName: { fontSize: 28, fontWeight: '900', color: Colors.accent, textAlign: 'center' },
  resultTitle: { fontSize: 18, color: Colors.text, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  matchName: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, gap: 12 },
  teamBox: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  teamName: { color: Colors.text, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  vs: { color: Colors.textMuted, fontWeight: '800', fontSize: 16 },
  btnGroup: { width: '100%', marginTop: 40, gap: 12 },
  btn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  btnText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
});
