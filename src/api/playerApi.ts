import axiosClient from './axiosClient';

export const createPlayer = (data: any) => axiosClient.post('/player/create', data);
export const getPlayers = (params?: any) => axiosClient.get('/player/list', { params });
export const updatePlayer = (id: string, data: any) => axiosClient.put(`/player/update/${id}`, data);
export const deletePlayer = (id: string) => axiosClient.delete(`/player/delete/${id}`);
