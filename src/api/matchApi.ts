import axiosClient from './axiosClient';

export const createMatch = (data: any) => axiosClient.post('/match/create', data);
export const getMatches = (params?: any) => axiosClient.get('/match/list', { params });
export const getMatch = (id: string) => axiosClient.get(`/match/${id}`);
export const setupToss = (id: string, data: any) => axiosClient.put(`/match/toss/${id}`, data);
export const getScorecard = (id: string) => axiosClient.get(`/match/scorecard/${id}`);
export const completeMatch = (id: string, data?: any) => axiosClient.put(`/match/complete/${id}`, data);
