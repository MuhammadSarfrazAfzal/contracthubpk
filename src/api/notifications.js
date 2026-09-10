import axios from 'axios';
import { getApiUrl } from './config';

const API_URL = getApiUrl('/api/notifications');

export const getNotifications = async (token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const res = await axios.get(API_URL, config);
  return res.data;
};

export const markAsRead = async (token, id) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const res = await axios.put(`${API_URL}/${id}/read`, {}, config);
  return res.data;
};

export const markAllAsRead = async (token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const res = await axios.put(`${API_URL}/read-all`, {}, config);
  return res.data;
};
