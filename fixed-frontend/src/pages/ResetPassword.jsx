import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';
import bgImage from '../assets/sign-in-bg.jpg';
import { apiUrl } from '../utils/api';

export default function ResetPassword() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { email: stateEmail } = location.state || {};
    const email = stateEmail || sessionStorage.getItem('resetEmail') || '';

    const handleChange = (index, value) => {
        if (!/^[0-9]?$/.test(value)) return;
        const updatedOtp = [...otp];
        updatedOtp[index] = value;
        setOtp(updatedOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Please enter the full 6-digit OTP.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            const response = await fetch(apiUrl('/api/auth/reset-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode, newPassword }),
            });

            const data = await response.json();
            if (data.success) {
                sessionStorage.removeItem('resetEmail');
                setSuccess('Password reset successfully! Redirecting to sign in...');
                setTimeout(() => navigate('/signin'), 2000);
            } else {
                setError(data.message || 'Reset failed.');
            }
        } catch {
            setError('Server error. Please try again later.');
        }
    };

    if (!email) return (
        <div className="text-center mt-10 px-4">
            <p className="text-red-500 mb-4">No email found. Please start the password reset from the beginning.</p>
            <Link to="/forgot-password" className="text-forest underline font-medium">
                Back to Forgot Password
            </Link>
        </div>
    );

    return (
        <div
            className="min-h-screen flex flex-col bg-cover bg-center relative"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <div className="absolute inset-0 bg-black/50 z-0"></div>
            <div className="relative z-10 flex flex-col min-h-screen">
                <Header textColor="white" />
                <main className="flex-grow flex items-center justify-center px-4 py-12">
                    <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md text-center">
                        <h2 className="text-3xl font-bold text-forest mb-4">Reset Your Password</h2>
                        <p className="text-sm text-gray-600 mb-6">Enter the OTP sent to {email}</p>

                        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        id={`otp-${i}`}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        className="w-10 h-12 text-xl text-center border border-gray-300 rounded focus:outline-forest"
                                        required
                                    />
                                ))}
                            </div>

                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                required
                            />

                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm Password"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                required
                            />

                            {error && <p className="text-sm text-red-600">{error}</p>}
                            {success && <p className="text-sm text-green-600">{success}</p>}

                            <button
                                type="submit"
                                className="mt-2 bg-forest text-white font-semibold py-2 px-6 rounded hover:bg-green-800 transition"
                            >
                                Reset Password
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
