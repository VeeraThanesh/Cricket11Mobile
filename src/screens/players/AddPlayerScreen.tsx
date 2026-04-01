import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { createPlayer, updatePlayer } from '../../api/playerApi';
import { Colors, GlobalStyles } from '../../theme/styles';

const ROLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicketkeeper'];

export default function AddPlayerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const existing = route.params?.player;

  const [name, setName] = useState(existing?.name || '');
  const [jerseyNo, setJerseyNo] = useState(existing?.jerseyNo?.toString() || '');
  const [role, setRole] = useState(existing?.role || 'Batsman');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name) return Alert.alert('Error', 'Player name is required');
    setLoading(true);
    try {
      if (existing) {
        await updatePlayer(existing._id, { name, jerseyNo: jerseyNo ? Number(jerseyNo) : undefined, role });
        Alert.alert('Success', 'Player updated');
      } else {
        await createPlayer({ name, jerseyNo: jerseyNo ? Number(jerseyNo) : undefined, role });
        Alert.alert('Success', 'Player added');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>{existing ? 'Edit Player' : 'New Player'}</Text>

        <Text style={styles.label}>Player Name *</Text>
        <TextInput
          style={GlobalStyles.input}
          placeholder="name"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Jersey Number</Text>
        <TextInput
          style={GlobalStyles.input}
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
          value={jerseyNo}
          onChangeText={setJerseyNo}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleChip, role === r && styles.roleChipActive]}
              onPress={() => setRole(r)}>
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[GlobalStyles.button, { marginTop: 24 }, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}>
          <Text style={GlobalStyles.buttonText}>{loading ? 'Saving...' : existing ? 'Save Changes' : 'Add Player'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  label: { color: Colors.textSecondary, fontSize: 13, marginTop: 12, marginBottom: 4 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  roleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  roleTextActive: { color: Colors.text },
});
