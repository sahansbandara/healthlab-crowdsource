import api, { BASE_URL } from './api';


export const registerUser = async (userData) => {
    const response = await api.post('/auth/register-participant', userData);
    if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};

/** Researcher registration: sends FormData (supports optional affiliationProof file). Returns { success, message, researcher }. */
export const registerResearcher = async (formData) => {
    const response = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const loginUser = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const data = response.data;
    if (data.token) {
        localStorage.setItem('token', data.token);
        // Backend may send { user: { _id, name, email, role } } or flat { _id, name, email, role }
        const user = data.user || (data._id && { _id: data._id, name: data.name, email: data.email, role: data.role });
        if (user) localStorage.setItem('user', JSON.stringify(user));
    }
    return data;
};

export const logoutUser = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
};

export const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};

export { BASE_URL };
