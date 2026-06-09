import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('pluto_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pluto_token');
      localStorage.removeItem('pluto_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;
