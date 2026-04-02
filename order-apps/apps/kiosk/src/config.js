// API configuration — switch between old and new backend
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const RESTAURANT_ID = parseInt(process.env.REACT_APP_RESTAURANT_ID || '1', 10);

export { API_BASE, RESTAURANT_ID };
