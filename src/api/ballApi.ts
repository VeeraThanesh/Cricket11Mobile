import axiosClient from './axiosClient';

export const addBall = (data: any) => axiosClient.post('/ball/add', data);
export const undoBall = (matchId: string) => axiosClient.put(`/ball/undo/${matchId}`);
export const editBall = (ballId: string, data: any) => axiosClient.put(`/ball/edit/${ballId}`, data);
export const getBalls = (matchId: string, inningsNo: number) =>
  axiosClient.get(`/ball/list/${matchId}/${inningsNo}`);
export const startSecondInnings = (matchId: string) =>
  axiosClient.post(`/ball/startSecondInnings/${matchId}`);
export const updateCurrentPlayers = (inningsId: string, data: any) =>
  axiosClient.put(`/innings/updatePlayers/${inningsId}`, data);
