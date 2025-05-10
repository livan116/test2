import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

// Add token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const INTERESTS = [
    'Music',
    'Movies',
    'Sports',
    'Technology',
    'Gaming',
    'Travel',
    'Food',
    'Art',
    'Books',
    'Fashion',
];

export default function Dashboard() {
    const [preferences, setPreferences] = useState({
        genderPreference: 'any',
        interests: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        // Fetch user preferences
        const fetchPreferences = async () => {
            try {
                const response = await api.get('/api/user/preferences');
                setPreferences(response.data);
            } catch (err) {
                if (err.response?.status === 401) {
                    // If unauthorized, redirect to login
                    navigate('/login');
                } else {
                    setError('Failed to load preferences');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPreferences();
    }, [currentUser, navigate]);

    const handleGenderPreferenceChange = (e) => {
        setPreferences((prev) => ({
            ...prev,
            genderPreference: e.target.value,
        }));
    };

    const handleInterestToggle = (interest) => {
        setPreferences((prev) => {
            const interests = prev.interests.includes(interest)
                ? prev.interests.filter((i) => i !== interest)
                : [...prev.interests, interest];
            return { ...prev, interests };
        });
    };

    const handleSavePreferences = async () => {
        try {
            setLoading(true);
            await api.post('/api/user/preferences', preferences);
            setError('');
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login');
            } else {
                setError('Failed to save preferences');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
                    <div className="max-w-md mx-auto">
                        <div className="divide-y divide-gray-200">
                            <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
                                    Your Preferences
                                </h2>

                                {error && (
                                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                                        {error}
                                    </div>
                                )}

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Gender Preference
                                    </label>
                                    <select
                                        value={preferences.genderPreference}
                                        onChange={handleGenderPreferenceChange}
                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    >
                                        <option value="any">Any</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Interests
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {INTERESTS.map((interest) => (
                                            <button
                                                key={interest}
                                                onClick={() => handleInterestToggle(interest)}
                                                className={`px-4 py-2 rounded-md text-sm font-medium ${preferences.interests.includes(interest)
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    }`}
                                            >
                                                {interest}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-center space-x-4">
                                    <button
                                        onClick={handleSavePreferences}
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        {loading ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                    <button
                                        onClick={() => navigate('/chat')}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        Start Chatting
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 