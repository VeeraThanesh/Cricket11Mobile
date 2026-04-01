import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { register } from '../../api/authApi';
import { Colors, GlobalStyles } from '../../theme/styles';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

const ROLES = ['Scorer', 'Admin', 'Viewer'];

export default function RegisterScreen({ navigation }: Props) {
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Scorer');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!userName || !email || !password) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);
    try {
      const res = await register({ userName, email, password, role });
      if (res.data.error) {
        Alert.alert('Error', res.data.message);
      } else {
        Alert.alert('Success', 'Account created! Please login.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.logo}>🏏</Text>
            <Text style={styles.title}>Create Account</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={GlobalStyles.input}
              placeholder="Username"
              placeholderTextColor={Colors.textMuted}
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="none"
            />
            <TextInput
              style={GlobalStyles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={GlobalStyles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.roleLabel}>Role</Text>
            <View style={styles.roleRow}>
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
              style={[GlobalStyles.button, loading && { opacity: 0.6 }]}
              onPress={handleRegister}
              disabled={loading}>
              <Text style={GlobalStyles.buttonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkRow}>
              <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 48 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginTop: 8 },
  form: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border },
  roleLabel: { color: Colors.textSecondary, fontSize: 13, marginTop: 8, marginBottom: 4 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleChip: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  roleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  roleTextActive: { color: Colors.text },
  linkRow: { alignItems: 'center', marginTop: 16 },
  link: { color: Colors.textSecondary, fontSize: 14 },
  linkBold: { color: Colors.primaryLight, fontWeight: '700' },
});
