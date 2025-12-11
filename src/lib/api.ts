import axios from 'axios';

export const api = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  }, //instância global > todas requests vão começar com /api e usar JSON
});

api.interceptors.response.use( //todas respostas de erro vão passar por aqui, evita repetição de try/catch
  (response) => response,
  (error) => {
    console.error('API error:', error);
    return Promise.reject(error);
  }
);
