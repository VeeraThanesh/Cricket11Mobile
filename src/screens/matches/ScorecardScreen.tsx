import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getScorecard, getMatch } from '../../api/matchApi';
import { Colors, GlobalStyles } from '../../theme/styles';

export default function ScorecardScreen() {
  const route = useRoute<any>();
  const { matchId } = route.params;
  const [data, setData] = useState<any[]>([]);
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getScorecard(matchId),
      getMatch(matchId)
    ])
      .then(([scorecardRes, matchRes]) => {
        setData(scorecardRes.data?.data || []);
        setMatchData(matchRes.data?.data?.match);
      })
      .catch(() => Alert.alert('Error', 'Could not load scorecard'))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) return <View style={GlobalStyles.centered}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  const result = matchData?.result;
  const winner = matchData?.team1Id?._id === result?.winnerId ? matchData?.team1Id : matchData?.team2Id;
  const isTie = result?.type === 'tie';
  const isOther = result?.type && !['runs', 'wickets', 'tie'].includes(result.type);

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <ScrollView>
        {result && (
          <View style={styles.resultBanner}>
            <Text style={styles.resultBannerText}>
              {isTie 
                ? 'Match Tied' 
                : isOther
                  ? `Match Ended: ${result.note ? result.note : (result.type === 'incomplete' ? 'Incomplete' : String(result.type || '').charAt(0).toUpperCase() + String(result.type || '').slice(1))}`
                  : `${winner?.name || 'Team'} won by ${result.margin} ${result.type}`}
            </Text>
          </View>
        )}
        {data.map((inn, idx) => (
          <View key={inn.innings._id}>
            <View style={styles.inningsHeader}>
              <Text style={styles.inningsTitle}>
                {inn.innings.battingTeamId?.name} — {idx + 1 === 1 ? '1st' : '2nd'} Innings
              </Text>
              <Text style={styles.inningsScore}>
                {inn.innings.totalRuns}/{inn.innings.totalWickets} ({Math.floor(inn.innings.totalLegalBalls / 6)}.{inn.innings.totalLegalBalls % 6} ov)
              </Text>
            </View>

            {/* Batting */}
            <Text style={GlobalStyles.sectionHeader}>BATTING</Text>
            <View style={[GlobalStyles.card, { paddingHorizontal: 0 }]}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.headerText]}>Batter</Text>
                <Text style={[styles.col2, styles.headerText]}>R</Text>
                <Text style={[styles.col2, styles.headerText]}>B</Text>
                <Text style={[styles.col2, styles.headerText]}>4s</Text>
                <Text style={[styles.col2, styles.headerText]}>6s</Text>
                <Text style={[styles.col2, styles.headerText]}>SR</Text>
              </View>
              {inn.batting.map((b: any) => (
                <View key={b.player._id} style={styles.tableRow}>
                  <View style={styles.col1}>
                    <Text style={styles.playerCell}>{b.player.name}</Text>
                    <Text style={styles.dismissalCell}>
                      {b.isOut ? (
                        b.wicketInfo?.type === 'caught' ? `c ${b.wicketInfo?.fielderId?.name || ''} b ${b.bowler?.name || ''}`.trim() :
                        b.wicketInfo?.type === 'runOut' ? `run out ${b.wicketInfo?.fielderId ? '(' + b.wicketInfo.fielderId.name + ')' : ''}` :
                        b.wicketInfo?.type === 'stumped' ? `st ${b.wicketInfo?.fielderId?.name || ''} b ${b.bowler?.name || ''}`.trim() :
                        b.wicketInfo?.type === 'bowled' ? `b ${b.bowler?.name || ''}`.trim() :
                        b.wicketInfo?.type === 'lbw' ? `lbw b ${b.bowler?.name || ''}`.trim() :
                        (b.wicketInfo?.type || 'out')
                      ) : 'not out'}
                    </Text>
                  </View>
                  <Text style={[styles.col2, styles.numCell]}>{b.runs}</Text>
                  <Text style={[styles.col2, styles.numCell]}>{b.balls}</Text>
                  <Text style={[styles.col2, styles.numCell]}>{b.fours}</Text>
                  <Text style={[styles.col2, styles.numCell]}>{b.sixes}</Text>
                  <Text style={[styles.col2, styles.numCell]}>{b.strikeRate}</Text>
                </View>
              ))}
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel}>Extras</Text>
                <Text style={styles.extraValue}>
                  {inn.innings.extras?.total || 0} (w {inn.innings.extras?.wide || 0}, nb {inn.innings.extras?.noBall || 0}, b {inn.innings.extras?.bye || 0}, lb {inn.innings.extras?.legBye || 0})
                </Text>
              </View>
            </View>

            {/* Bowling */}
            <Text style={GlobalStyles.sectionHeader}>BOWLING</Text>
            <View style={[GlobalStyles.card, { paddingHorizontal: 0 }]}>
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.headerText]}>Bowler</Text>
                <Text style={[styles.col2, styles.headerText]}>O</Text>
                <Text style={[styles.col2, styles.headerText]}>R</Text>
                <Text style={[styles.col2, styles.headerText]}>W</Text>
                <Text style={[styles.col2, styles.headerText]}>Eco</Text>
              </View>
              {inn.bowling.map((b: any) => (
                <View key={b.player._id} style={styles.tableRow}>
                  <Text style={[styles.col1, styles.playerCell]}>{b.player.name}</Text>
                  <Text style={[styles.col2, styles.numCell]}>{b.overs}</Text>
                  <Text style={[styles.col2, styles.numCell]}>{b.runs}</Text>
                  <Text style={[styles.col2, styles.numCell, b.wickets > 0 && { color: Colors.accent }]}>{b.wickets}</Text>
                  <Text style={[styles.col2, styles.numCell]}>{b.economy}</Text>
                </View>
              ))}
            </View>

            {inn.innings.playerChangeReasons && inn.innings.playerChangeReasons.length > 0 && (
              <>
                <Text style={GlobalStyles.sectionHeader}>PLAYER CHANGES</Text>
                <View style={GlobalStyles.card}>
                  {inn.innings.playerChangeReasons.map((pcr: any, i: number) => (
                    <View key={i} style={{ marginBottom: i < inn.innings.playerChangeReasons.length - 1 ? 12 : 0 }}>
                      <Text style={{ color: Colors.text, fontWeight: '700', fontSize: 13 }}>
                        {pcr.playerId?.name || 'Unknown'} 
                        <Text style={{ fontWeight: '400', color: Colors.textSecondary }}>
                          {' '}({pcr.role === 'striker' ? 'Batter' : pcr.role === 'nonStriker' ? 'Batter' : 'Bowler'})
                        </Text>
                      </Text>
                      <Text style={{ color: pcr.reason === 'injury' ? Colors.error : Colors.warning, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                        {pcr.reason.toUpperCase()}: <Text style={{ color: Colors.textMuted, fontWeight: '400' }}>{pcr.description}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}
        {data.length === 0 && (
          <View style={GlobalStyles.centered}>
            <Text style={{ color: Colors.textMuted, marginTop: 60 }}>No scorecard data yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  resultBanner: {
    backgroundColor: Colors.surface,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultBannerText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  inningsHeader: { backgroundColor: Colors.primaryDark, padding: 16 },
  inningsTitle: { color: Colors.textSecondary, fontSize: 13 },
  inningsScore: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  tableHeader: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + '44', alignItems: 'center' },
  col1: { flex: 2 },
  col2: { flex: 1, textAlign: 'right' },
  headerText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  playerCell: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  dismissalCell: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  numCell: { color: Colors.text, fontSize: 13 },
  extraRow: { flexDirection: 'row', padding: 10, justifyContent: 'space-between' },
  extraLabel: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  extraValue: { color: Colors.textSecondary, fontSize: 12 },
});
