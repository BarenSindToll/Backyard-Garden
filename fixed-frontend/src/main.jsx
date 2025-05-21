import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Home from './pages/Home';
import Signup from './pages/Signup.jsx';
import Signin from './pages/Signin.jsx';
import ForgotPassword from './pages/ForgotPassword';
import VerifyReset from './pages/VerifyReset';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import GardenLayout from './pages/GardenLayout'
import Weather from './pages/Weather';
import Calendar from './pages/Calendar';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset" element={<VerifyReset />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/garden-layout" element={<GardenLayout />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/calendar" element={<Calendar />} />


      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
