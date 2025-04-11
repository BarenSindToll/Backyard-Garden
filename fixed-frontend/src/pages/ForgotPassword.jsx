import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState(null);
    const navigate = useNavigate(); // hook for redirection

    const handleSubmit = async (e) => {
        e.preventDefault();

        const res = await fetch('http://localhost:4000/api/auth/send-reset-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // so the token cookie is stored
            body: JSON.stringify({ email }),
        });

        const data = await res.json();
        setMessage(data.message || (data.success ? 'OTP sent!' : 'Something went wrong'));

        if (data.success) {
            setTimeout(() => navigate('/verify-reset'), 1000); // redirect after short delay
        }
    };


    return (
        <div className="min-h-screen bg-cream flex flex-col">
            <Header textColor="forest" />

            <main className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md">
                    <h2 className="text-2xl font-bold text-forest mb-4 text-center">
                        Reset Password
                    </h2>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email address
                            </label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition"
                        >
                            Send OTP
                        </button>

                        {message && (
                            <p className="text-sm text-center text-gray-700 mt-2">{message}</p>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
}
