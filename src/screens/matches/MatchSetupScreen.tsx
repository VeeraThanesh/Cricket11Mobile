import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Switch,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { createMatch } from '../../api/matchApi';
import { getTeams } from '../../api/teamApi';
import { Colors, GlobalStyles } from '../../theme/styles';

const MATCH_TYPES = ['T20', 'ODI', 'Custom'];
const DEFAULT_OVERS: Record<string, number> = { T20: 20, ODI: 50, Custom: 10 };

export default function MatchSetupScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const [matchName, setMatchName] = useState('');
  const [matchType, setMatchType] = useState('T20');
  const [overs, setOvers] = useState('20');
  const [venue, setVenue] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState('11');
  const [substituteAllowed, setSubstituteAllowed] = useState(false);
  const [maxBowlers, setMaxBowlers] = useState('4');
  const [teams, setTeams] = useState<any[]>([]);
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTeams().then((res) => setTeams(res.data?.data || []));
  }, []);

  const selectMatchType = (type: string) => {
    setMatchType(type);
    setOvers(DEFAULT_OVERS[type].toString());
  };

  const handleCreate = async () => {
    if (!matchName) return Alert.alert('Error', 'Match name is required');
    if (!team1Id || !team2Id) return Alert.alert('Error', 'Please select both teams');
    if (team1Id === team2Id) return Alert.alert('Error', 'Teams must be different');
    setLoading(true);
    try {
      const res = await createMatch({
        name: matchName, matchType, overs: Number(overs),
        venue, playersPerTeam: Number(playersPerTeam),
        team1Id, team2Id,
        settings: { substituteAllowed, maxBowlers: Number(maxBowlers) },
      });
      const matchId = res.data?.data?._id;
      if (matchId) navigation.navigate('Toss', { matchId });
      else Alert.alert('Error', 'Failed to create match');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  const TeamPicker = ({ label, value, onSelect, disabledId }: { label: string; value: string; onSelect: (id: string) => void, disabledId?: string }) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      {teams.map((t) => {
        const isDisabled = t._id === disabledId;
        return (
          <TouchableOpacity
            key={t._id}
            style={[
              styles.teamRow,
              value === t._id && styles.teamRowSelected,
              isDisabled && { opacity: 0.3 }
            ]}
            onPress={() => onSelect(t._id)}
            disabled={isDisabled}>
            <View style={[styles.radio, value === t._id && styles.radioSelected, isDisabled && { borderColor: Colors.border }]} />
            <Text style={[styles.teamName, value === t._id && { color: Colors.accent }, isDisabled && { color: Colors.textMuted }]}>{t.name}</Text>
            <Text style={styles.playerCount}>{t.playerIds?.length || 0} players</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>New Match</Text>

        <Text style={styles.label}>Match Name *</Text>
        <TextInput style={GlobalStyles.input} placeholder="e.g. Final Match" placeholderTextColor={Colors.textMuted} value={matchName} onChangeText={setMatchName} />

        <Text style={styles.label}>Match Type</Text>
        <View style={styles.typeRow}>
          {MATCH_TYPES.map((t) => (
            <TouchableOpacity key={t} style={[styles.typeChip, matchType === t && styles.typeChipActive]} onPress={() => selectMatchType(t)}>
              <Text style={[styles.typeText, matchType === t && styles.typeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Overs</Text>
        <TextInput style={GlobalStyles.input} placeholder="20" placeholderTextColor={Colors.textMuted} value={overs} onChangeText={setOvers} keyboardType="number-pad" />

        <Text style={styles.label}>Players Per Team</Text>
        <TextInput style={GlobalStyles.input} value={playersPerTeam} onChangeText={setPlayersPerTeam} keyboardType="number-pad" />

        <Text style={styles.label}>Venue (optional)</Text>
        <TextInput style={GlobalStyles.input} placeholder="e.g. Wankhede Stadium" placeholderTextColor={Colors.textMuted} value={venue} onChangeText={setVenue} />

        <Text style={styles.label}>Max Bowlers</Text>
        <TextInput style={GlobalStyles.input} value={maxBowlers} onChangeText={setMaxBowlers} keyboardType="number-pad" />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Substitute Allowed</Text>
          <Switch value={substituteAllowed} onValueChange={setSubstituteAllowed} trackColor={{ true: Colors.primary }} thumbColor={Colors.accent} />
        </View>

        <TeamPicker label="Team 1 *" value={team1Id} onSelect={setTeam1Id} disabledId={team2Id} />
        <TeamPicker label="Team 2 *" value={team2Id} onSelect={setTeam2Id} disabledId={team1Id} />

        <TouchableOpacity style={[GlobalStyles.button, { marginTop: 24 }, loading && { opacity: 0.6 }]} onPress={handleCreate} disabled={loading}>
          <Text style={GlobalStyles.buttonText}>{loading ? 'Creating...' : 'Create & Set Toss →'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 13, marginTop: 16, marginBottom: 4 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { color: Colors.textMuted, fontWeight: '600' },
  typeTextActive: { color: Colors.text },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: 4 },
  switchLabel: { color: Colors.textSecondary, fontSize: 14 },
  teamRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: Colors.surface, borderRadius: 10, marginVertical: 4, borderWidth: 1, borderColor: Colors.border },
  teamRowSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent + '11' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, marginRight: 12 },
  radioSelected: { borderColor: Colors.accent, backgroundColor: Colors.accent },
  teamName: { color: Colors.text, fontWeight: '600', flex: 1 },
  playerCount: { color: Colors.textMuted, fontSize: 12 },
});
