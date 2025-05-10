import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            // Fetch user data
            api.get('/api/auth/me')
                .then(response => {
                    setCurrentUser(response.data);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    delete api.defaults.headers.common['Authorization'];
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const response = await api.post('/api/auth/login', { email, password });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setCurrentUser(user);
        return user;
    };

    const register = async (email, password, name) => {
        const response = await api.post('/api/auth/register', { email, password, name });
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setCurrentUser(user);
        return user;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setCurrentUser(null);
    };

    const value = {
        currentUser,
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
} 