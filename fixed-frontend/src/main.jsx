import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App.jsx';
import Home from './pages/Home';
import Signup from './pages/Signup.jsx';
import Signin from './pages/Signin.jsx';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import GardenLayout from './pages/GardenLayout'
import Weather from './pages/Weather';
import Calendar from './pages/Calendar';
import Blog from './pages/Blog';
import AdminBlogPost from './pages/admin/AdminBlog.jsx';
import AdminProfile from './pages/admin/AdminProfile.jsx';
import NewBlogPost from './pages/admin/NewBlogPost.jsx';
import EditBlogPost from './pages/admin/EditBlogPost.jsx';
import SinglePost from './pages/SinglePost.jsx';
import { UserProvider } from './utils/userContext.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import PermacultureLayout from './pages/PermacultureLayout.jsx';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/garden-layout" element={<GardenLayout />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/admin/blog" element={<AdminBlogPost />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/blog/new" element={<NewBlogPost />} />
          <Route path="/admin/blog/edit/:slug" element={<EditBlogPost />} />
          <Route path="/blog/:slug" element={<SinglePost />} />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/perma" element={<PermacultureLayout />} />

        </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
