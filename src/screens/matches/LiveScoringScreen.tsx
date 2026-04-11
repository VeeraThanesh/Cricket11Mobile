import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, Modal, ScrollView, StatusBar, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMatch, completeMatch } from '../../api/matchApi';
import { addBall, undoBall, updateCurrentPlayers, startSecondInnings, getBalls } from '../../api/ballApi';
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

const END_REASONS = [
  { key: 'normal', label: 'Normal / Overs Done' },
  { key: 'declare', label: 'Declared (Match Setup)' },
  { key: 'rain', label: 'Rainy / Bad Weather' },
  { key: 'postponed', label: 'Postponed / Abandoned' },
  { key: 'other', label: 'Other Reason' },
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
  const [showReasonModal, setShowReasonModal] = useState<'striker' | 'nonStriker' | 'bowler' | null>(null);
  const [changeReason, setChangeReason] = useState<'injury' | 'other' | ''>('');
  const [changeDescription, setChangeDescription] = useState('');
  const [pendingPlayerId, setPendingPlayerId] = useState<string>('');
  const [wicketType, setWicketType] = useState<WicketType | ''>('');
  const [fielderId, setFielderId] = useState('');
  const [dismissedBatsmanId, setDismissedBatsmanId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEndInningsModal, setShowEndInningsModal] = useState(false);
  const [endInningsReason, setEndInningsReason] = useState('normal');
  const [otherReasonText, setOtherReasonText] = useState('');

  // Ball history display
  const [inningsBalls, setInningsBalls] = useState<any[]>([]);

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

        try {
          const ballsRes = await getBalls(matchId, activeInnings.inningsNo);
          if (ballsRes.data?.data) {
            setInningsBalls(ballsRes.data.data);
          }
        } catch (e) {
          console.log('Error fetching balls', e);
        }
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

      const newBall = res.data?.data?.ball;
      if (newBall) setInningsBalls((prev) => [...prev, newBall]);

      // Clear extras
      setExtraType('none');

      // Check if innings is over
      if (res.data?.data?.inningsOver) {
        handleInningsOver(updatedInnings);
      } else {
        // Auto swap logic
        const runsRun = (extras?.type === 'wide' || extras?.type === 'bye' || extras?.type === 'legBye') 
          ? extras.value 
          : batRuns;
        const isOddRun = runsRun % 2 !== 0;
        const overComplete = res.data?.data?.overComplete;
        
        if (isOddRun !== overComplete) {
           await swapBatsmen();
        }

        if (overComplete && !res.data?.data?.inningsOver) {
          setBowlerId('');
          setShowPlayerModal('bowler');
        }
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
      
      const newBall = res.data?.data?.ball;
      if (newBall) setInningsBalls((prev) => [...prev, newBall]);

      // Reset wicket state
      setShowWicketModal(false);
      setWicketType('');
      setFielderId('');
      setDismissedBatsmanId('');
      setExtraType('none');

      // Prompt for new batsman
      if (!res.data?.data?.inningsOver) {
        if (res.data?.data?.overComplete) {
          setBowlerId('');
        }
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
            setInningsBalls((prev) => prev.slice(0, -1));
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
                  setInningsBalls([]);
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
    // Determine if we need to ask for a reason for the change
    const totalLegal = innings?.totalLegalBalls || 0;
    const currentOverNo = Math.floor(totalLegal / 6);
    const hasBallsInOver = inningsBalls.some((b: any) => b.overNo === currentOverNo);
    
    // It's a mid-over if we're not exactly at a multiple of 6 legal balls,
    // OR if we are at a multiple of 6 but illegal balls (wides/no-balls) have started the over.
    const isMidOver = (totalLegal === 0 && hasBallsInOver) || (totalLegal % 6 !== 0) || (totalLegal > 0 && totalLegal % 6 === 0 && hasBallsInOver);

    const requiresReason = 
      (showPlayerModal === 'striker' && strikerId) ||
      (showPlayerModal === 'nonStriker' && nonStrikerId) ||
      (showPlayerModal === 'bowler' && bowlerId && isMidOver);

    if (requiresReason && showPlayerModal) {
      setPendingPlayerId(playerId);
      setShowReasonModal(showPlayerModal as 'striker' | 'nonStriker' | 'bowler');
      setShowPlayerModal(null);
    } else {
      const currentRole = showPlayerModal as string;
      setShowPlayerModal(null);
      await executePlayerChange(currentRole, playerId);
    }
  };

  const executePlayerChange = async (role: string, playerId: string, reasonData?: any) => {
    let payload: any = {};
    if (role === 'striker') {
      setStrikerId(playerId);
      payload = { currentStrikerId: playerId };
    } else if (role === 'nonStriker') {
      setNonStrikerId(playerId);
      payload = { currentNonStrikerId: playerId };
    } else if (role === 'bowler') {
      setBowlerId(playerId);
      payload = { currentBowlerId: playerId };
    } else if (role === 'newBatsman') {
      if (innings?.dismissedBatsmanIds?.includes(nonStrikerId)) {
        setNonStrikerId(playerId);
        payload = { currentNonStrikerId: playerId };
      } else {
        setStrikerId(playerId);
        payload = { currentStrikerId: playerId };
      }
    }
    if (reasonData) payload.playerChangeReason = reasonData;
    await updateCurrentPlayers(inningsId, payload);
  };

  const confirmPlayerChange = async () => {
    if (!changeReason) {
      return Alert.alert('Required', 'Please select a reason (Injury or Other).');
    }
    if (!changeDescription.trim()) {
      return Alert.alert('Required', 'Please enter a description explanation.');
    }
    
    let replacedPlayerId = '';
    if (showReasonModal === 'striker') replacedPlayerId = strikerId;
    else if (showReasonModal === 'nonStriker') replacedPlayerId = nonStrikerId;
    else if (showReasonModal === 'bowler') replacedPlayerId = bowlerId;

    const reasonData = {
      playerId: replacedPlayerId,
      role: showReasonModal,
      reason: changeReason,
      description: changeDescription.trim()
    };
    
    await executePlayerChange(showReasonModal!, pendingPlayerId, reasonData);
    
    setShowReasonModal(null);
    setChangeReason('');
    setChangeDescription('');
    setPendingPlayerId('');
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

  // Bowler stats calculation
  const bowlerBalls = inningsBalls.filter((b: any) =>
    (b.bowlerId?._id || b.bowlerId) === bowlerId
  );
  let bLegalBalls = 0, bRuns = 0, bWickets = 0;
  bowlerBalls.forEach((b: any) => {
    if (b.isLegalBall) bLegalBalls++;
    bRuns += b.totalRuns;
    if (b.isWicket && !['runOut', 'retiredHurt', 'obstructingTheField'].includes(b.wicket?.type)) bWickets++;
  });
  const bOvers = formatOvers(bLegalBalls);

  // Current over balls calculation
  const totalLegal = innings?.totalLegalBalls || 0;
  let currentOverNo = Math.floor(totalLegal / 6);
  let currentOverBalls = inningsBalls.filter((b: any) => b.overNo === currentOverNo);

  let headerBalls = currentOverBalls;
  let isPreviousOver = false;
  if (headerBalls.length === 0 && totalLegal > 0) {
    headerBalls = inningsBalls.filter((b: any) => b.overNo === currentOverNo - 1);
    isPreviousOver = true;
  }
  const headerBallLabels = headerBalls.map((ball: any) => {
    if (ball.isWicket) return 'W';
    if (ball.extras?.type === 'wide') return 'WD';
    if (ball.extras?.type === 'noBall') return 'NB';
    const r = ball.batRuns + (ball.extras?.value || 0);
    return r === 4 ? '4' : r === 6 ? '6' : r === 0 ? '•' : r.toString();
  });

  if (currentOverBalls.length === 0 && totalLegal > 0) {
    const lastOverBalls = inningsBalls.filter((b: any) => b.overNo === currentOverNo - 1);
    if (lastOverBalls.length > 0 && (lastOverBalls[0].bowlerId?._id || lastOverBalls[0].bowlerId) === bowlerId) {
      currentOverBalls = lastOverBalls;
    }
  }

  const renderOverBox = (ball?: any, idx?: number) => {
    if (!ball) {
      return <View key={`empty-${idx}`} style={[styles.overBox, { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }]} />;
    }
    let label = '';
    let isDot = false;
    let color = Colors.text;
    let borderColor = 'rgba(255,255,255,0.4)';

    if (ball.isWicket) {
      label = 'W';
      color = '#FF5252'; // More vibrant for dark background
      borderColor = '#FF5252';
    } else if (ball.extras?.type === 'wide') {
      label = 'WD';
      color = '#FFC107';
      borderColor = '#FFC107';
    } else if (ball.extras?.type === 'noBall') {
      label = 'NB';
      color = '#FF9800';
      borderColor = '#FF9800';
    } else if (ball.batRuns === 4) {
      label = '4';
      color = '#4FC3F7';
      borderColor = '#4FC3F7';
    } else if (ball.batRuns === 6) {
      label = '6';
      color = '#BA68C8';
      borderColor = '#BA68C8';
    } else if (ball.totalRuns === 0) {
      isDot = true;
      borderColor = '#4CAF50';
    } else {
      label = ball.totalRuns.toString();
      color = '#FFFFFF';
    }

    return (
      <View key={ball._id || `ball-${idx}`} style={[styles.overBox, { borderColor }]}>
        {isDot ? (
          <View style={styles.overBoxDot} />
        ) : (
          <Text style={[styles.overBoxText, { color }]}>{label}</Text>
        )}
      </View>
    );
  };

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
      {headerBallLabels.length > 0 && (
        <View style={styles.ballsRow}>
          <Text style={styles.ballsLabel}>{isPreviousOver ? 'Last over:' : 'This over:'}</Text>
          {headerBallLabels.slice(-12).map((b, i) => (
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
        <TouchableOpacity style={styles.bowlerCard} activeOpacity={0.8} onPress={() => setShowPlayerModal('bowler')}>
          <View style={styles.bowlerInfo}>
            <View style={styles.bowlerAvatar}>
              <Text style={styles.bowlerAvatarIcon}>🥎</Text>
            </View>
            <View style={styles.bowlerDetails}>
              <Text style={styles.bowlerLabel}>Current Bowler</Text>
              <Text style={styles.bowlerCardName} numberOfLines={1}>{playerName(bowlerId, bowlingTeamPlayers)}</Text>
            </View>
            <View style={styles.bowlerCardStatsBox}>
              <Text style={styles.bowlerCardStatsValue}>{bWickets}-{bRuns}</Text>
              <Text style={styles.bowlerCardStatsLabel}>{bOvers} ov</Text>
            </View>
          </View>
          <View style={styles.overBoxesContainer}>
            {Array.from({ length: Math.max(6, currentOverBalls.length) }).map((_, i) =>
              renderOverBox(currentOverBalls[i], i)
            )}
          </View>
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
          <TouchableOpacity style={[styles.actionBtn, { borderColor: Colors.error }]} onPress={() => {
            setEndInningsReason('normal');
            setShowEndInningsModal(true);
          }}>
            <Text style={[styles.actionText, { color: Colors.error }]}>End Match</Text>
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
            {battingTeamPlayers.filter((p: any) => p._id === strikerId || p._id === nonStrikerId).map((p: any) => (
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
                ? bowlingTeamPlayers.filter((p: any) => {
                    if (p._id === bowlerId) return false;
                    const bowlingTeamIdField = innings?.bowlingTeamId?._id || innings?.bowlingTeamId;
                    const team1Id = match?.team1Id?._id || match?.team1Id;
                    const bowlingTeamObj = bowlingTeamIdField === team1Id ? match?.team1Id : match?.team2Id;
                    const bowlingCaptainId = bowlingTeamObj?.captainId?._id || bowlingTeamObj?.captainId;
                    
                    return p.role === 'Bowler' || p.role === 'All-rounder' || p._id === bowlingCaptainId;
                  })
                : battingTeamPlayers.filter((p: any) => {
                    // Exclude players who are already out
                    if (innings?.dismissedBatsmanIds?.includes(p._id)) return false;
                    
                    if (showPlayerModal === 'newBatsman') return p._id !== nonStrikerId && p._id !== strikerId;
                    if (showPlayerModal === 'striker') return p._id !== nonStrikerId && p._id !== strikerId;
                    if (showPlayerModal === 'nonStriker') return p._id !== strikerId && p._id !== nonStrikerId;
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

      {/* Change Player Reason Modal */}
      <Modal visible={showReasonModal !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Player Change Reason</Text>
            <Text style={styles.modalLabel}>Why are you changing the {showReasonModal === 'bowler' ? 'bowler' : 'batsman'}?</Text>
            
            <View style={styles.wicketGrid}>
              <TouchableOpacity style={[styles.wicketChip, changeReason === 'injury' && styles.wicketChipActive]} onPress={() => setChangeReason('injury')}>
                <Text style={[styles.wicketText, changeReason === 'injury' && styles.wicketTextActive]}>Injury</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.wicketChip, changeReason === 'other' && styles.wicketChipActive]} onPress={() => setChangeReason('other')}>
                <Text style={[styles.wicketText, changeReason === 'other' && styles.wicketTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter explanation..."
              placeholderTextColor={Colors.textMuted}
              value={changeDescription}
              onChangeText={setChangeDescription}
              maxLength={100}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.error }]} onPress={confirmPlayerChange} disabled={saving}>
                <Text style={{ color: Colors.text, fontWeight: '700' }}>Confirm Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.surfaceAlt }]} onPress={() => {
                setShowReasonModal(null);
                setChangeReason('');
                setChangeDescription('');
                setPendingPlayerId('');
              }}>
                <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Match Modal */}
      <Modal visible={showEndInningsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>End Match Options</Text>
            <Text style={styles.modalLabel}>Select a reason for ending the match:</Text>
            
            <View style={styles.wicketGrid}>
              {END_REASONS.map((r) => (
                <TouchableOpacity 
                  key={r.key} 
                  style={[styles.wicketChip, endInningsReason === r.key && styles.wicketChipActive]} 
                  onPress={() => setEndInningsReason(r.key)}
                >
                  <Text style={[styles.wicketText, endInningsReason === r.key && styles.wicketTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {endInningsReason === 'other' && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter description..."
                placeholderTextColor={Colors.textMuted}
                value={otherReasonText}
                onChangeText={setOtherReasonText}
                maxLength={100}
              />
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.error }]} onPress={async () => {
                if (endInningsReason === 'other' && !otherReasonText.trim()) {
                  Alert.alert('Required', 'Please enter a description to confirm.');
                  return;
                }
                setShowEndInningsModal(false);
                try {
                  const reasonLabel = END_REASONS.find(r => r.key === endInningsReason)?.label || endInningsReason;
                  await completeMatch(matchId, { reason: endInningsReason, reasonLabel, note: otherReasonText.trim() });
                  if (endInningsReason === 'rain') {
                    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
                  } else {
                    navigation.replace('MatchResult', { matchId });
                  }
                } catch(err) {
                  Alert.alert('Error', 'Could not end match early. Please try again.');
                }
              }}>
                <Text style={{ color: Colors.text, fontWeight: '700' }}>Confirm End Match</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: Colors.surfaceAlt }]} onPress={() => setShowEndInningsModal(false)}>
                <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
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
  bowlerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  bowlerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bowlerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bowlerAvatarIcon: {
    fontSize: 20,
  },
  bowlerDetails: {
    flex: 1,
  },
  bowlerLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  bowlerCardName: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bowlerCardStatsBox: {
    alignItems: 'flex-end',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bowlerCardStatsValue: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },
  bowlerCardStatsLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  overBoxesContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surfaceAlt,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  overBoxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  overBoxText: {
    fontSize: 14,
    fontWeight: '800',
  },
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
  reasonInput: { backgroundColor: Colors.background, color: Colors.text, borderRadius: 8, padding: 12, marginTop: 16, borderWidth: 1, borderColor: Colors.border, fontSize: 14 },
});
