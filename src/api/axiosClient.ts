import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your machine's local IP when testing on a physical device
const BASE_URL = 'http://192.168.0.2:3000/api/cricket11'; // Android emulator → localhost

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
axiosClient.interceptors.request.use(async (config) => {
  try {
    const stored = await AsyncStorage.getItem('@cricket_user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch (_) {}
  return config;
});

export default axiosClient;
