import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Signup from './pages/Signup.jsx';
import Signin from './pages/Signin.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import VerifyReset from './pages/VerifyReset.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

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


      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
