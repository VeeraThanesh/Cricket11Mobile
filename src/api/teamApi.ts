import axiosClient from './axiosClient';

export const createTeam = (data: any) => axiosClient.post('/team/create', data);
export const getTeams = (params?: any) => axiosClient.get('/team/list', { params });
export const updateTeam = (id: string, data: any) => axiosClient.put(`/team/update/${id}`, data);
export const deleteTeam = (id: string) => axiosClient.delete(`/team/delete/${id}`);
