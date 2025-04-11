import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(null);
    const location = useLocation();
    const { email, otp } = location.state || {};

    const handleSubmit = async (e) => {
        e.preventDefault();

        const res = await fetch('http://localhost:4000/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, otp, newPassword: password }),
        });

        const data = await res.json();
        setMessage(data.message || 'Something went wrong');
    };

    if (!email || !otp) {
        return <p className="text-center mt-10 text-red-500">Missing reset data. Please restart.</p>;
    }

    return (
        <div className="min-h-screen bg-cream flex flex-col">
            <Header textColor="forest" />
            <main className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md">
                    <h2 className="text-2xl font-bold text-forest mb-4 text-center">
                        Set a New Password
                    </h2>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <input
                                type="password"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition"
                        >
                            Reset Password
                        </button>

                        {message && <p className="text-sm text-center text-gray-700 mt-2">{message}</p>}
                    </form>
                </div>
            </main>
        </div>
    );
}
