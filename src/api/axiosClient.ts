import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

// Change this to your machine's local IP when testing on a physical device
const BASE_URL = 'http://192.168.0.8:3000/api/cricket11'; // Android emulator → localhost

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true,
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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If no response (network error / backend down)
    if (!error.response && originalRequest.url !== '/login') {
      DeviceEventEmitter.emit('unauthorized');
      return Promise.reject(error);
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/refreshToken') {
        DeviceEventEmitter.emit('unauthorized');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axiosClient.post('/refreshToken');
        const newToken = res.data.data.token;
        
        // Update async storage
        const stored = await AsyncStorage.getItem('@cricket_user');
        if (stored) {
          const user = JSON.parse(stored);
          user.token = newToken;
          await AsyncStorage.setItem('@cricket_user', JSON.stringify(user));
        }

        processQueue(null, newToken);
        originalRequest.headers.Authorization = 'Bearer ' + newToken;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        DeviceEventEmitter.emit('unauthorized');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
