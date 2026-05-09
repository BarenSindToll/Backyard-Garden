import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import bgImage from '../assets/sign-in-bg.jpg';
import { apiUrl } from '../utils/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await fetch(apiUrl('/api/auth/send-reset-otp'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (data.success) {
                sessionStorage.setItem('resetEmail', email);
                navigate('/reset-password', { state: { email } });
            } else {
                setError(data.message || 'Failed to send OTP. Please try again.');
            }
        } catch {
            setError('Server error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col bg-cover bg-center relative"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <div className="absolute inset-0 bg-black/50 z-0"></div>
            <div className="relative z-10 flex flex-col min-h-screen">
                <Header textColor="white" />
                <main className="flex-grow flex items-center justify-center px-4 py-12">
                    <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md">
                        <h2 className="text-3xl font-bold text-forest mb-4 text-center">Forgot Password</h2>
                        <p className="text-sm text-gray-600 mb-6 text-center">
                            Enter your email address and we will send you a one-time code to reset your password.
                        </p>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="Your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="border border-gray-300 rounded px-3 py-2"
                                required
                            />
                            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition disabled:opacity-60"
                            >
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
