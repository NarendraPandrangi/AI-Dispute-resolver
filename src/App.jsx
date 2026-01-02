import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CreateDispute from './pages/CreateDispute';
import DisputeDetails from './pages/DisputeDetails';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Layout from './components/Layout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Loading...</div>;
  }

  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="create-dispute" element={<CreateDispute />} />
            <Route path="dispute/:id" element={<DisputeDetails />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
