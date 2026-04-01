import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { getPlayers, deletePlayer } from '../../api/playerApi';
import { Colors, GlobalStyles } from '../../theme/styles';

const ROLE_COLORS: Record<string, string> = {
  Batsman: '#2196F3',
  Bowler: '#E91E63',
  'All-rounder': '#9C27B0',
  Wicketkeeper: '#FF9800',
};

export default function PlayerListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = async () => {
    try {
      const res = await getPlayers();
      setPlayers(res.data?.data || []);
    } catch (_) {
      Alert.alert('Error', 'Could not fetch players');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPlayers(); }, []));

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Player', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deletePlayer(id);
          fetchPlayers();
        },
      },
    ]);
  };

  if (loading) return <View style={GlobalStyles.centered}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <FlatList
        data={players}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={<Text style={GlobalStyles.sectionHeader}>All Players ({players.length})</Text>}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyText}>No players yet. Add your first player!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={GlobalStyles.card}
            onPress={() => navigation.navigate('AddPlayer', { player: item })}>
            <View style={GlobalStyles.spaceBetween}>
              <View style={GlobalStyles.row}>
                <View style={[styles.jerseyBadge, { backgroundColor: Colors.primaryDark }]}>
                  <Text style={styles.jerseyNo}>#{item.jerseyNo || '—'}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.playerName}>{item.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[item.role] || Colors.primary) + '22', borderColor: ROLE_COLORS[item.role] || Colors.primary }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] || Colors.primary }]}>{item.role}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item._id, item.name)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddPlayer', {})}>
        <Text style={styles.fabText}>+ Add Player</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  jerseyBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  jerseyNo: { color: Colors.accent, fontWeight: '700', fontSize: 12 },
  playerName: { color: Colors.text, fontWeight: '600', fontSize: 15 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, marginTop: 4, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 8 },
  deleteText: { color: Colors.error, fontSize: 18, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  fabText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
});
