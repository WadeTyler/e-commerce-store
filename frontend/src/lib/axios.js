import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.mode === "development" ? 'http://localhost:3000/api' : '/api',
  withCredentials: true,  // send cookies in every request
});

export default instance;