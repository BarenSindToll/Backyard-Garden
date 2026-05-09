import { useState } from 'react';
import Header from '../components/Header';
import bgImage from '../assets/sign-in-bg.jpg';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../utils/languageContext';
import { apiUrl } from '../utils/api';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t } = useLanguage();
    const s = t.signup;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError(s.passwordMismatch);
            return;
        }

        try {
            const response = await fetch(apiUrl('/api/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (data.success) {
                alert(s.otpSent);
                navigate('/verify');
            } else {
                setError(data.message || s.serverError);
            }
        } catch (err) {
            console.error(err);
            setError(s.serverError);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-cover bg-center relative" style={{ backgroundImage: `url(${bgImage})` }}>
            <div className="absolute inset-0 bg-black/50 z-0"></div>
            <div className="relative z-10 flex flex-col min-h-screen">
                <Header textColor="white" />

                <main className="flex-grow flex items-center justify-center px-4 py-12">
                    <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md">
                        <h2 className="text-3xl font-bold text-forest mb-6 text-center">{s.title}</h2>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{s.fullName}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={s.namePlaceholder}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{s.email}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{s.password}</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 block mb-1">{s.confirmPassword}</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    required
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition"
                            >
                                {s.submit}
                            </button>

                            <p className="text-sm text-center text-gray-600">
                                {s.alreadyHaveAccount}{' '}
                                <a href="/signin" className="text-forest font-semibold hover:underline">
                                    {s.signInLink}
                                </a>
                            </p>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
