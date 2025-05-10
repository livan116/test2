import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VideoChat from './components/chat/VideoChat';
import Dashboard from './components/dashboard/Dashboard';
import Navbar from './components/layout/Navbar';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <VideoChat />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
