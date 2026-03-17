import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getToken = () => localStorage.getItem('admin_token');

export const api = {
  login: async (password) => {
    const response = await axios.post(`${API}/admin/login`, { password });
    return response.data;
  },

  uploadStorybook: async (file, title, subtitle) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subtitle', subtitle);

    const response = await axios.post(`${API}/storybooks/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.data;
  },

  getStorybooks: async (status = null) => {
    const params = status ? { status } : {};
    const response = await axios.get(`${API}/storybooks`, { params });
    return response.data;
  },

  getStorybook: async (id) => {
    const response = await axios.get(`${API}/storybooks/${id}`);
    return response.data;
  },

  getStorybookBySlug: async (slug) => {
    const response = await axios.get(`${API}/storybooks/slug/${slug}`);
    return response.data;
  },

  updateStorybook: async (id, data) => {
    const response = await axios.put(`${API}/storybooks/${id}`, data, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.data;
  },

  deleteStorybook: async (id) => {
    const response = await axios.delete(`${API}/storybooks/${id}`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.data;
  },

  verifyPassword: async (id, password) => {
    const response = await axios.post(`${API}/storybooks/${id}/verify-password`, { password });
    return response.data;
  },
};

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BACKEND_URL}${path}`;
};
