import axios from 'axios';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const apiClient = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const accessToken = getAccessToken();
        if (accessToken) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error?.response?.status;
        const originalRequest = error?.config;

        if (!originalRequest || status !== 401) {
            return Promise.reject(error);
        }
        if (originalRequest._retry) {
            return Promise.reject(error);
        }
        if (String(originalRequest.url || '').includes('/auth/refresh')) {
            return Promise.reject(error);
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            clearTokens();
            return Promise.reject(error);
        }

        try {
            originalRequest._retry = true;

            const refreshResponse = await apiClient.post(
                '/auth/refresh',
                null,
                { headers: { 'x-refresh-token': refreshToken } }
            );

            const newAccessToken = refreshResponse?.data?.accessToken;
            const newRefreshToken = refreshResponse?.data?.refreshToken;
            if (!newAccessToken || !newRefreshToken) {
                clearTokens();
                return Promise.reject(error);
            }

            setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            return apiClient(originalRequest);
        } catch (refreshError) {
            clearTokens();
            return Promise.reject(refreshError);
        }
    }
);

export const api = {
    register: async ({ email, first_name, last_name, password, role }) => {
        const response = await apiClient.post('/auth/register', { email, first_name, last_name, password, role });
        return response.data;
    },
    login: async ({ email, password }) => {
        const response = await apiClient.post('/auth/login', { email, password });
        const accessToken = response?.data?.accessToken;
        const refreshToken = response?.data?.refreshToken;
        if (accessToken && refreshToken) {
            setTokens({ accessToken, refreshToken });
        }
        return response.data;
    },
    logout: () => {
        clearTokens();
    },
    me: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
    getProducts: async () => {
        const response = await apiClient.get('/products');
        return response.data;
    },
    getProductById: async (id) => {
        const response = await apiClient.get(`/products/${id}`);
        return response.data;
    },
    createProduct: async (product) => {
        const response = await apiClient.post('/products', product);
        return response.data;
    },
    updateProduct: async (id, product) => {
        const response = await apiClient.put(`/products/${id}`, product);
        return response.data;
    },
    deleteProduct: async (id) => {
        const response = await apiClient.delete(`/products/${id}`);
        return response.data;
    },

    // Users (admin)
    getUsers: async () => {
        const response = await apiClient.get('/users');
        return response.data;
    },
    updateUser: async (id, payload) => {
        const response = await apiClient.put(`/users/${id}`, payload);
        return response.data;
    },
    blockUser: async (id) => {
        await apiClient.delete(`/users/${id}`);
    },
};