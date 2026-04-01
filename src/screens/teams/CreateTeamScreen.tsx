import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { createTeam, updateTeam } from '../../api/teamApi';
import { getPlayers } from '../../api/playerApi';
import { Colors, GlobalStyles } from '../../theme/styles';

const ROLE_COLORS: Record<string, string> = {
  Batsman: '#2196F3', Bowler: '#E91E63',
  'All-rounder': '#9C27B0', Wicketkeeper: '#FF9800',
};

export default function CreateTeamScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const existing = route.params?.team;

  const [name, setName] = useState(existing?.name || '');
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    existing?.playerIds?.map((p: any) => (typeof p === 'string' ? p : p._id)) || []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPlayers().then((res) => {
      setPlayers(res.data?.data || []);
      setLoading(false);
    });
  }, []);

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name) return Alert.alert('Error', 'Team name is required');
    setSaving(true);
    try {
      const payload = { name, playerIds: selectedIds };
      if (existing) {
        await updateTeam(existing._id, payload);
        Alert.alert('Success', 'Team updated');
      } else {
        await createTeam(payload);
        Alert.alert('Success', 'Team created');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={GlobalStyles.centered}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <FlatList
        data={players}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>{existing ? 'Edit Team' : 'Create Team'}</Text>
            <Text style={styles.label}>Team Name *</Text>
            <TextInput
              style={GlobalStyles.input}
              placeholder="e.g. Chennai Super Kings"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>Select Players ({selectedIds.length} selected)</Text>
          </View>
        }
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item._id);
          return (
            <TouchableOpacity
              style={[styles.playerRow, selected && styles.playerRowSelected]}
              onPress={() => togglePlayer(item._id)}>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] || Colors.primary }]}>
                  {item.role} {item.jerseyNo ? `• #${item.jerseyNo}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={[GlobalStyles.button, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={GlobalStyles.buttonText}>{saving ? 'Saving...' : existing ? 'Save Changes' : 'Create Team'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 4 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: Colors.surface, borderRadius: 10, marginVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  playerRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  playerName: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  roleText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  footer: { padding: 16, paddingBottom: 24, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
});
