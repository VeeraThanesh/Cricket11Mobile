import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { getTeams, deleteTeam } from '../../api/teamApi';
import { Colors, GlobalStyles } from '../../theme/styles';

export default function TeamListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    try {
      const res = await getTeams();
      setTeams(res.data?.data || []);
    } catch (_) {
      Alert.alert('Error', 'Could not fetch teams');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTeams(); }, []));

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Team', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTeam(id); fetchTeams(); } },
    ]);
  };

  if (loading) return <View style={GlobalStyles.centered}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <FlatList
        data={teams}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={<Text style={GlobalStyles.sectionHeader}>All Teams ({teams.length})</Text>}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🏟️</Text>
            <Text style={styles.emptyText}>No teams yet. Create your first team!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={GlobalStyles.card} onPress={() => navigation.navigate('CreateTeam', { team: item })}>
            <View style={GlobalStyles.spaceBetween}>
              <View>
                <Text style={styles.teamName}>{item.name}</Text>
                <Text style={styles.playerCount}>{item.playerIds?.length || 0} Players</Text>
              </View>
              <View style={GlobalStyles.row}>
                <TouchableOpacity onPress={() => handleDelete(item._id, item.name)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            {item.playerIds?.slice(0, 5).map((p: any) => (
              <Text key={p._id} style={styles.playerPill}>• {p.name} ({p.role})</Text>
            ))}
            {item.playerIds?.length > 5 && (
              <Text style={styles.moreText}>+{item.playerIds.length - 5} more</Text>
            )}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateTeam', {})}>
        <Text style={styles.fabText}>+ Create Team</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  teamName: { color: Colors.text, fontWeight: '700', fontSize: 16 },
  playerCount: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  playerPill: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  moreText: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  deleteBtn: { padding: 8 },
  deleteText: { color: Colors.error, fontSize: 18, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 20, left: 20, backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  fabText: { color: Colors.text, fontWeight: '700', fontSize: 16 },
});
