import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ProducerDashboard from './pages/ProducerDashboard';
import ProducerVerification from './pages/ProducerVerification';
import UserDashboard from './pages/UserDashboard';
import QRScanner from './pages/QRScanner';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/producer/login" element={<Login />} />
        <Route path="/producer/register" element={<Register />} />
        <Route path="/producer/verification" element={<ProducerVerification />} />
        <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/scan" element={<QRScanner />} />
      </Routes>
    </Router>
  );
}

export default App;
