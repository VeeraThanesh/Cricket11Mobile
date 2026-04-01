import axiosClient from './axiosClient';

export const login = (data: { email: string; password: string }) =>
  axiosClient.post('/login', data);

export const register = (data: {
  userName: string;
  email: string;
  password: string;
  role?: string;
}) => axiosClient.post('/createUser', data);
