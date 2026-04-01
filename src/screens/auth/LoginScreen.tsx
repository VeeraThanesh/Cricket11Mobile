import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { login as loginApi } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import { Colors, GlobalStyles } from '../../theme/styles';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill all fields');
    setLoading(true);
    try {
      const res = await loginApi({ email, password });
      const { data: resData } = res.data;
      if (res.data.error) {
        Alert.alert('Error', res.data.message);
      } else {
        await login(resData);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.logoArea}>
            <Text style={styles.logo}>🏏</Text>
            <Text style={styles.appName}>Cricket11</Text>
            <Text style={styles.tagline}>Ball-by-Ball Scoring</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Welcome Back</Text>

            <TextInput
              style={GlobalStyles.input}
              placeholder="Email or Username"
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

            <TouchableOpacity
              style={[GlobalStyles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              <Text style={GlobalStyles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
              <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 64 },
  appName: { fontSize: 32, fontWeight: '800', color: Colors.accent, marginTop: 8 },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  form: { backgroundColor: Colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  linkRow: { alignItems: 'center', marginTop: 16 },
  link: { color: Colors.textSecondary, fontSize: 14 },
  linkBold: { color: Colors.primaryLight, fontWeight: '700' },
});
