import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, Modal, ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMatch } from '../../api/matchApi';
import { addBall, undoBall, updateCurrentPlayers, startSecondInnings } from '../../api/ballApi';
import { Colors } from '../../theme/styles';

// Types
type WicketType = 'bowled' | 'caught' | 'lbw' | 'runOut' | 'stumped' | 'hitWicket' | 'retiredHurt' | 'obstructingTheField';
type ExtraType = 'none' | 'wide' | 'noBall' | 'bye' | 'legBye';

const WICKET_TYPES: { key: WicketType; label: string }[] = [
  { key: 'bowled', label: 'Bowled' },
  { key: 'caught', label: 'Caught' },
  { key: 'lbw', label: 'LBW' },
  { key: 'runOut', label: 'Run Out' },
  { key: 'stumped', label: 'Stumped' },
  { key: 'hitWicket', label: 'Hit Wicket' },
  { key: 'retiredHurt', label: 'Retired Hurt' },
  { key: 'obstructingTheField', label: 'Obstructing Field' },
];

function formatOvers(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function calcRR(runs: number, legalBalls: number) {
  if (legalBalls === 0) return '0.00';
  return ((runs / legalBalls) * 6).toFixed(2);
}

function calcRRR(target: number | null, runs: number, legalBalls: number, maxOvers: number) {
  if (!target) return null;
  const ballsLeft = maxOvers * 6 - legalBalls;
  if (ballsLeft <= 0) return '∞';
  return (((target - runs) / ballsLeft) * 6).toFixed(2);
}

export default function LiveScoringScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { matchId, inningsId: initialInningsId } = route.params;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<any>(null);
  const [innings, setInnings] = useState<any>(null);
  const [inningsId, setInningsId] = useState(initialInningsId);
  const [battingTeamPlayers, setBattingTeamPlayers] = useState<any[]>([]);
  const [bowlingTeamPlayers, setBowlingTeamPlayers] = useState<any[]>([]);
  console.log(battingTeamPlayers, "battingTeamPlayers");
  console.log(bowlingTeamPlayers, "bowlingTeamPlayers");

  // Current players
  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');

  // UI state
  const [extraType, setExtraType] = useState<ExtraType>('none');
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState<'striker' | 'nonStriker' | 'bowler' | 'newBatsman' | null>(null);
  const [wicketType, setWicketType] = useState<WicketType | ''>('');
  const [fielderId, setFielderId] = useState('');
  const [dismissedBatsmanId, setDismissedBatsmanId] = useState('');
  const [saving, setSaving] = useState(false);

  // Ball history display
  const [lastBalls, setLastBalls] = useState<string[]>([]);

  useEffect(() => { loadMatch(); }, []);

  const loadMatch = async () => {
    try {
      const res = await getMatch(matchId);
      const m = res.data?.data?.match;
      const inns = res.data?.data?.innings;
      setMatch(m);

      const activeInnings = inns?.find((i: any) => !i.isCompleted) || inns?.[inns.length - 1];
      if (activeInnings) {
        setInnings(activeInnings);
        setInningsId(activeInnings._id);

        // Compare team IDs from the innings against the match teams to find full player data
        const battingTeamId = activeInnings.battingTeamId?._id?.toString()
          || activeInnings.battingTeamId?.toString();
        const bowlingTeamId = activeInnings.bowlingTeamId?._id?.toString()
          || activeInnings.bowlingTeamId?.toString();

        const team1Id = m.team1Id?._id?.toString();
        const team2Id = m.team2Id?._id?.toString();

        // Use the fully-populated playerIds from the match object
        const battingPlayers = battingTeamId === team1Id
          ? (m.team1Id?.playerIds || [])
          : (m.team2Id?.playerIds || []);
        const bowlingPlayers = bowlingTeamId === team2Id
          ? (m.team2Id?.playerIds || [])
          : (m.team1Id?.playerIds || []);

        setBattingTeamPlayers(battingPlayers);
        setBowlingTeamPlayers(bowlingPlayers);

        setStrikerId(activeInnings.currentStrikerId?._id || '');
        setNonStrikerId(activeInnings.currentNonStrikerId?._id || '');
        setBowlerId(activeInnings.currentBowlerId?._id || '');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load match');
    } finally {
      setLoading(false);
    }
  };

  const recordBall = async (batRuns: number, extras?: { type: ExtraType; value: number }) => {
    if (!strikerId || !nonStrikerId || !bowlerId) {
      return Alert.alert('Setup Required', 'Please select striker, non-striker and bowler first');
    }
    setSaving(true);
    try {
      const payload: any = {
        matchId, inningsId, batsmanId: strikerId,
        nonStrikerId, bowlerId, batRuns,
        extras: extras || { type: 'none', value: 0 },
      };

      const res = await addBall(payload);
      const updatedInnings = res.data?.data?.innings;
      if (updatedInnings) setInnings(updatedInnings);

      // Update last balls display
      const ballLabel = extras?.type === 'wide' ? 'WD' :
        extras?.type === 'noBall' ? 'NB' :
        batRuns === 4 ? '4' :
        batRuns === 6 ? '6' :
        batRuns === 0 ? '•' : batRuns.toString();
      setLastBalls((prev) => [...prev.slice(-11), ballLabel]);
      setExtraType('none');

      // Check if innings is over
      if (res.data?.data?.inningsOver) {
        handleInningsOver(updatedInnings);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to record ball');
    } finally {
      setSaving(false);
    }
  };

  const recordWicket = async (batRuns: number = 0) => {
    if (!wicketType) return Alert.alert('Error', 'Select wicket type');
    if (!dismissedBatsmanId) return Alert.alert('Error', 'Select dismissed batsman');
    setSaving(true);
    try {
      const payload: any = {
        matchId, inningsId, batsmanId: strikerId,
        nonStrikerId, bowlerId, batRuns,
        extras: { type: extraType !== 'none' ? extraType : 'none', value: 0 },
        isWicket: true,
        wicket: { type: wicketType, dismissedBatsmanId, fielderId: fielderId || null },
      };
      const res = await addBall(payload);
      const updatedInnings = res.data?.data?.innings;
      if (updatedInnings) setInnings(updatedInnings);
      setLastBalls((prev) => [...prev.slice(-11), 'W']);

      // Reset wicket state
      setShowWicketModal(false);
      setWicketType('');
      setFielderId('');
      setDismissedBatsmanId('');
      setExtraType('none');

      // Prompt for new batsman
      if (!res.data?.data?.inningsOver) {
        setShowPlayerModal('newBatsman');
      } else {
        handleInningsOver(updatedInnings);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to record wicket');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    Alert.alert('Undo', 'Remove last ball?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo', style: 'destructive', onPress: async () => {
          try {
            const res = await undoBall(matchId);
            const updatedInnings = res.data?.data?.innings;
            if (updatedInnings) setInnings(updatedInnings);
            setLastBalls((prev) => prev.slice(0, -1));
          } catch {
            Alert.alert('Error', 'Could not undo');
          }
        },
      },
    ]);
  };

  const handleInningsOver = async (updatedInnings: any) => {
    if (updatedInnings.inningsNo === 1) {
      Alert.alert(
        '1st Innings Complete',
        `${updatedInnings.battingTeamId?.name || 'Team'} scored ${updatedInnings.totalRuns}/${updatedInnings.totalWickets}\n\nStart 2nd Innings?`,
        [
          {
            text: 'Start 2nd Innings', onPress: async () => {
              try {
                const res = await startSecondInnings(matchId);
                const newInnings = res.data?.data?.innings;
                if (newInnings) {
                  setInnings(newInnings);
                  setInningsId(newInnings._id);
                  setLastBalls([]);
                  setStrikerId('');
                  setNonStrikerId('');
                  setBowlerId('');
                  // Teams swap roles for 2nd innings — capture snapshots first
                  const prevBatting = battingTeamPlayers;
                  const prevBowling = bowlingTeamPlayers;
                  setBattingTeamPlayers(prevBowling);
                  setBowlingTeamPlayers(prevBatting);
                }
              } catch {
                Alert.alert('Error', 'Could not start 2nd innings');
              }
            },
          },
        ]
      );
    } else {
      // 2nd innings done → result
      navigation.replace('MatchResult', { matchId });
    }
  };

  const selectPlayer = async (playerId: string) => {
    setShowPlayerModal(null);
    if (showPlayerModal === 'striker') {
      setStrikerId(playerId);
      await updateCurrentPlayers(inningsId, { currentStrikerId: playerId });
    } else if (showPlayerModal === 'nonStriker') {
      setNonStrikerId(playerId);
      await updateCurrentPlayers(inningsId, { currentNonStrikerId: playerId });
    } else if (showPlayerModal === 'bowler') {
      setBowlerId(playerId);
      await updateCurrentPlayers(inningsId, { currentBowlerId: playerId });
    } else if (showPlayerModal === 'newBatsman') {
      setStrikerId(playerId);
      await updateCurrentPlayers(inningsId, { currentStrikerId: playerId });
    }
  };

  const swapBatsmen = async () => {
    const tmp = strikerId;
    setStrikerId(nonStrikerId);
    setNonStrikerId(tmp);
    await updateCurrentPlayers(inningsId, { currentStrikerId: nonStrikerId, currentNonStrikerId: tmp });
  };

  const playerName = (id: string, list: any[]) =>
    list.find((p: any) => p._id === id)?.name || 'Select';

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  const legalBalls = innings?.totalLegalBalls || 0;
  const totalRuns = innings?.totalRuns || 0;
  const totalWickets = innings?.totalWickets || 0;
  const target = innings?.target;
  const maxOvers = match?.overs || 20;
  const needed = target ? target - totalRuns : null;
  const ballsLeft = maxOvers * 6 - legalBalls;

  const runBtnColor = (r: number) => {
    if (r === 0) return Colors.dot;
    if (r === 4) return Colors.boundary4;
    if (r === 6) return Colors.boundary6;
    return Colors.primaryLight;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Score Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.inningsLabel}>
            {innings?.battingTeamId?.name || 'Batting'} • {innings?.inningsNo === 1 ? '1st' : '2nd'} Innings
          </Text>
          <Text style={styles.score}>{totalRuns}/{totalWickets}</Text>
          <Text style={styles.overs}>{formatOvers(legalBalls)} / {maxOvers} ov</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.rrLabel}>CRR</Text>
          <Text style={styles.rrValue}>{calcRR(totalRuns, legalBalls)}</Text>
          {target && (
            <>
              <Text style={styles.targetText}>Target: {target}</Text>
              <Text style={styles.rrLabel}>RRR</Text>
              <Text style={[styles.rrValue, { color: Colors.warning }]}>{calcRRR(target, totalRuns, legalBalls, maxOvers)}</Text>
              {needed !== null && <Text style={styles.neededText}>Need {needed} in {ballsLeft} balls</Text>}
            </>
          )}
        </View>
      </View>

      {/* Last balls */}
      {lastBalls.length > 0 && (
        <View style={styles.ballsRow}>
          <Text style={styles.ballsLabel}>This over:</Text>
          {lastBalls.slice(-6).map((b, i) => (
            <View key={i} style={[styles.ballChip, {
              backgroundColor: b === 'W' ? Colors.wicket : b === 'WD' ? Colors.wide : b === 'NB' ? Colors.noBall : b === '4' ? Colors.boundary4 : b === '6' ? Colors.boundary6 : b === '•' ? Colors.dot : Colors.primaryDark,
            }]}>
              <Text style={styles.ballChipText}>{b}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {/* Current Players */}
        <View style={styles.playersRow}>
          <TouchableOpacity style={styles.playerCard} onPress={() => setShowPlayerModal('striker')}>
            <Text style={styles.playerLabel}>🏏 Striker</Text>
            <Text style={styles.playerName}>{playerName(strikerId, battingTeamPlayers)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.swapBtn} onPress={swapBatsmen}>
            <Text style={styles.swapIcon}>⇄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playerCard} onPress={() => setShowPlayerModal('nonStriker')}>
            <Text style={styles.playerLabel}>Non-Striker</Text>
            <Text style={styles.playerName}>{playerName(nonStrikerId, battingTeamPlayers)}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.playerCard, { marginHorizontal: 16, marginBottom: 16 }]} onPress={() => setShowPlayerModal('bowler')}>
          <Text style={styles.playerLabel}>🎳 Bowler</Text>
          <Text style={styles.playerName}>{playerName(bowlerId, bowlingTeamPlayers)}</Text>
        </TouchableOpacity>

        {/* Extras Selector */}
        <Text style={styles.sectionLabel}>Extras</Text>
        <View style={styles.extrasRow}>
          {(['none', 'wide', 'noBall', 'bye', 'legBye'] as ExtraType[]).map((e) => (
            <TouchableOpacity key={e} style={[styles.extraChip, extraType === e && styles.extraChipActive]} onPress={() => setExtraType(e)}>
              <Text style={[styles.extraText, extraType === e && styles.extraTextActive]}>
                {e === 'none' ? 'Normal' : e === 'noBall' ? 'No Ball' : e === 'legBye' ? 'Leg Bye' : e.charAt(0).toUpperCase() + e.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Run Buttons */}
        <Text style={styles.sectionLabel}>Runs</Text>
        <View style={styles.runsGrid}>
          {[0, 1, 2, 3, 4, 6].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.runBtn, { backgroundColor: runBtnColor(r) }]}
              onPress={() => {
                if (extraType === 'wide') recordBall(0, { type: 'wide', value: r });
                else if (extraType === 'noBall') recordBall(r, { type: 'noBall', value: 0 });
                else if (extraType === 'bye') recordBall(0, { type: 'bye', value: r });
                else if (extraType === 'legBye') recordBall(0, { type: 'legBye', value: r });
                else recordBall(r);
              }}
              disabled={saving}>
              <Text style={styles.runBtnText}>{r === 0 ? '•' : r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wicket */}
        <TouchableOpacity style={styles.wicketBtn} onPress={() => { setDismissedBatsmanId(strikerId); setShowWicketModal(true); }} disabled={saving}>
          <Text style={styles.wicketBtnText}>🚨 Wicket</Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleUndo}>
            <Text style={styles.actionText}>↩ Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={swapBatsmen}>
            <Text style={styles.actionText}>⇄ Swap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Scorecard', { matchId })}>
            <Text style={styles.actionText}>📋 Card</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.error }]} onPress={() => handleInningsOver(innings)}>
            <Text style={[styles.actionText, { color: Colors.error }]}>End Inn.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Wicket Modal */}
      <Modal visible={showWicketModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Wicket</Text>

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.wicketGrid}>
              {WICKET_TYPES.map((w) => (
                <TouchableOpacity key={w.key} style={[styles.wicketChip, wicketType === w.key && styles.wicketChipActive]} onPress={() => setWicketType(w.key)}>
                  <Text style={[styles.wicketText, wicketType === w.key && styles.wicketTextActive]}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Dismissed Batsman</Text>
            {battingTeamPlayers.filter((p: any) => p._id !== nonStrikerId).map((p: any) => (
              <TouchableOpacity key={p._id} style={[styles.playerOption, dismissedBatsmanId === p._id && styles.playerOptionSelected]} onPress={() => setDismissedBatsmanId(p._id)}>
                <Text style={{ color: Colors.text }}>{p.name}</Text>
              </TouchableOpacity>
            ))}

            {(['caught', 'runOut', 'stumped'].includes(wicketType)) && (
              <>
                <Text style={styles.modalLabel}>Fielder (optional)</Text>
                {bowlingTeamPlayers.map((p: any) => (
                  <TouchableOpacity key={p._id} style={[styles.playerOption, fielderId === p._id && styles.playerOptionSelected]} onPress={() => setFielderId(p._id)}>
                    <Text style={{ color: Colors.text }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.error }]} onPress={() => recordWicket(0)} disabled={saving}>
                <Text style={{ color: Colors.text, fontWeight: '700' }}>{saving ? 'Saving...' : 'Confirm Wicket'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.surfaceAlt }]} onPress={() => setShowWicketModal(false)}>
                <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPlayerModal !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {showPlayerModal === 'bowler' ? 'Select Bowler' :
               showPlayerModal === 'newBatsman' ? 'New Batsman In' :
               showPlayerModal === 'striker' ? 'Select Striker' : 'Select Non-Striker'}
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {(showPlayerModal === 'bowler'
                ? bowlingTeamPlayers
                : battingTeamPlayers.filter((p: any) => {
                    // Exclude players who are already out
                    if (innings?.dismissedBatsmanIds?.includes(p._id)) return false;
                    
                    if (showPlayerModal === 'striker' || showPlayerModal === 'newBatsman') return p._id !== nonStrikerId;
                    if (showPlayerModal === 'nonStriker') return p._id !== strikerId;
                    return true;
                  })
              ).map((item: any) => (
                <TouchableOpacity key={item._id} style={styles.playerOption} onPress={() => selectPlayer(item._id)}>
                  <Text style={{ color: Colors.text, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{item.role}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.surfaceAlt, marginTop: 8 }]} onPress={() => setShowPlayerModal(null)}>
              <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primaryDark, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inningsLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  score: { fontSize: 48, fontWeight: '900', color: Colors.text },
  overs: { color: Colors.textSecondary, fontSize: 14 },
  headerRight: { alignItems: 'flex-end' },
  rrLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 1 },
  rrValue: { color: Colors.accent, fontSize: 18, fontWeight: '700' },
  targetText: { color: Colors.warning, fontSize: 12, marginTop: 4, fontWeight: '600' },
  neededText: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  ballsRow: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: Colors.surface, gap: 6 },
  ballsLabel: { color: Colors.textMuted, fontSize: 12 },
  ballChip: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  ballChipText: { color: Colors.text, fontWeight: '700', fontSize: 11 },
  body: { padding: 0, paddingBottom: 40 },
  playersRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  playerCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.border },
  playerLabel: { color: Colors.textMuted, fontSize: 11, marginBottom: 4 },
  playerName: { color: Colors.text, fontWeight: '700', fontSize: 13 },
  swapBtn: { backgroundColor: Colors.primaryDark, borderRadius: 8, padding: 10 },
  swapIcon: { color: Colors.accent, fontSize: 18 },
  sectionLabel: { color: Colors.textMuted, fontSize: 11, letterSpacing: 1, marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
  extrasRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 6, marginBottom: 4 },
  extraChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  extraChipActive: { backgroundColor: Colors.warning + '33', borderColor: Colors.warning },
  extraText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },
  extraTextActive: { color: Colors.warning },
  runsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 8 },
  runBtn: { width: '14%', aspectRatio: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 50, minHeight: 50 },
  runBtnText: { color: Colors.text, fontWeight: '900', fontSize: 20 },
  wicketBtn: { marginHorizontal: 16, marginVertical: 8, backgroundColor: Colors.error + '22', borderWidth: 2, borderColor: Colors.error, borderRadius: 12, padding: 16, alignItems: 'center' },
  wicketBtnText: { color: Colors.error, fontWeight: '800', fontSize: 18 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface },
  actionText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  modalLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 12, marginBottom: 6, letterSpacing: 0.5 },
  wicketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wicketChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  wicketChipActive: { backgroundColor: Colors.error + '33', borderColor: Colors.error },
  wicketText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },
  wicketTextActive: { color: Colors.error },
  playerOption: { padding: 12, borderRadius: 8, backgroundColor: Colors.surfaceAlt, marginVertical: 3, borderWidth: 1, borderColor: Colors.border },
  playerOptionSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  modalBtns: { marginTop: 16, gap: 8 },
  modalBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
});
