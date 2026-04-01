import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Modal, Animated, Easing,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMatch, setupToss } from '../../api/matchApi';
import { Colors, GlobalStyles } from '../../theme/styles';

export default function TossScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { matchId } = route.params;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tossWinnerId, setTossWinnerId] = useState('');
  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl' | ''>('');
  const [saving, setSaving] = useState(false);

  // Toss Animation State
  const [showTossModal, setShowTossModal] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [tossResult, setTossResult] = useState<'Heads' | 'Tails' | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getMatch(matchId).then((res) => {
      setMatch(res.data?.data?.match);
      setLoading(false);
    });
  }, [matchId]);

  const startSpin = () => {
    setIsSpinning(true);
    setTossResult(null);
    setShowTossModal(true);

    // Initial spin animation
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 250,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Set result after 2 seconds
    setTimeout(() => {
      const res = Math.random() > 0.5 ? 'Heads' : 'Tails';
      setTossResult(res);
      setIsSpinning(false);
      // Wait a bit then stop loop smoothly at a fixed position
      spinValue.stopAnimation();
    }, 2000);
  };

  const handleStart = async () => {
    if (!tossWinnerId || !tossChoice) return Alert.alert('Error', 'Please complete toss details');
    setSaving(true);
    try {
      const res = await setupToss(matchId, { tossWinnerId, tossChoice });
      const inningsId = res.data?.data?.innings?._id;
      navigation.replace('LiveScoring', { matchId, inningsId });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to setup toss');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !match) return <View style={GlobalStyles.centered}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  const teams = [match.team1Id, match.team2Id];

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.coin}>🪙</Text>
        <Text style={styles.heading}>Toss</Text>
        <Text style={styles.subheading}>{match.name} • {match.matchType}</Text>

        <TouchableOpacity style={styles.tossBtn} onPress={startSpin}>
          <Text style={styles.tossBtnText}>🪙 Spin Coin</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Toss Winner</Text>
        {teams.map((team: any) => (
          <TouchableOpacity
            key={team._id}
            style={[styles.teamCard, tossWinnerId === team._id && styles.teamCardSelected]}
            onPress={() => setTossWinnerId(team._id)}>
            <View style={[styles.radio, tossWinnerId === team._id && styles.radioSelected]} />
            <Text style={[styles.teamName, tossWinnerId === team._id && { color: Colors.accent }]}>{team.name}</Text>
          </TouchableOpacity>
        ))}

        {tossWinnerId !== '' && (
          <>
            <Text style={styles.label}>
              {teams.find((t: any) => t._id === tossWinnerId)?.name} chose to...
            </Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceBtn, tossChoice === 'bat' && styles.choiceBtnActive]}
                onPress={() => setTossChoice('bat')}>
                <Text style={styles.choiceIcon}>🏏</Text>
                <Text style={[styles.choiceText, tossChoice === 'bat' && styles.choiceTextActive]}>Bat First</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceBtn, tossChoice === 'bowl' && styles.choiceBtnActive]}
                onPress={() => setTossChoice('bowl')}>
                <Text style={styles.choiceIcon}>🎳</Text>
                <Text style={[styles.choiceText, tossChoice === 'bowl' && styles.choiceTextActive]}>Bowl First</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {tossWinnerId && tossChoice && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {teams.find((t: any) => t._id === tossWinnerId)?.name} won the toss and chose to {tossChoice} first.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[GlobalStyles.button, { marginTop: 24 }, (!tossWinnerId || !tossChoice || saving) && { opacity: 0.5 }]}
          onPress={handleStart}
          disabled={!tossWinnerId || !tossChoice || saving}>
          <Text style={GlobalStyles.buttonText}>{saving ? 'Starting...' : 'Start Match →'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Toss Modal */}
      <Modal visible={showTossModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Toss Spinning...</Text>
            
            <View style={styles.coinContainer}>
              <Animated.View style={[
                styles.animatedCoin,
                {
                  transform: [{
                    rotateY: spinValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }
              ]}>
                <Text style={styles.coinEmoji}>{isSpinning ? '🪙' : (tossResult === 'Heads' ? '👤' : '🦒')}</Text>
              </Animated.View>
            </View>

            {tossResult && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>It's {tossResult}!</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowTossModal(false)}>
                  <Text style={styles.closeBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center' },
  coin: { fontSize: 64, marginBottom: 8 },
  heading: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subheading: { color: Colors.textSecondary, fontSize: 14, marginBottom: 24 },
  label: { color: Colors.textSecondary, fontSize: 13, marginTop: 20, marginBottom: 8, alignSelf: 'flex-start' },
  teamCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: Colors.surface, borderRadius: 12, marginVertical: 4, borderWidth: 1, borderColor: Colors.border, width: '100%' },
  teamCardSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '11' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, marginRight: 12 },
  radioSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  teamName: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  choiceRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  choiceBtn: { flex: 1, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface },
  choiceBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  choiceIcon: { fontSize: 32, marginBottom: 8 },
  choiceText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 14 },
  choiceTextActive: { color: Colors.accent },
  summary: { marginTop: 20, padding: 16, backgroundColor: Colors.primaryDark, borderRadius: 12, width: '100%' },
  summaryText: { color: Colors.text, fontSize: 15, textAlign: 'center', fontWeight: '600' },
  tossBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, marginBottom: 10 },
  tossBtnText: { color: Colors.accent, fontWeight: '700', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: Colors.surface, padding: 40, borderRadius: 20, alignItems: 'center', width: '80%' },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 30 },
  coinContainer: { height: 120, justifyContent: 'center', alignItems: 'center' },
  animatedCoin: { width: 100, height: 100, backgroundColor: Colors.accent, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFD700' },
  coinEmoji: { fontSize: 50 },
  resultContainer: { marginTop: 30, alignItems: 'center' },
  resultText: { color: Colors.accent, fontSize: 24, fontWeight: '900', marginBottom: 20 },
  closeBtn: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10 },
  closeBtnText: { color: Colors.text, fontWeight: '700' },
});
