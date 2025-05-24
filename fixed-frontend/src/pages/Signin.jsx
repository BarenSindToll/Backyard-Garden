import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import bgImage from '../assets/sign-in-bg.jpg'

export default function Signin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const res = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        setMessage(data.message || (data.success ? 'Login successful' : 'Login failed'));

        if (data.success) {
            localStorage.setItem('userId', data.userId); // backend must return it
            navigate('/home'); // redirect to homepage
        } else if (data.shouldVerify) {
            alert(data.message);
            navigate('/verify');
        } else {
            setMessage(data.message || 'Login failed');
        }

    };

    return (
        <div
            className="min-h-screen flex flex-col bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
        > <div className="absolute inset-0 bg-black/50 z-0"></div>
            <div className="relative z-10 flex flex-col min-h-screen">
                <Header textColor="white" />

                <main className="flex-grow flex items-center justify-center px-4 py-12">
                    <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold text-forest mb-4 text-center">
                            Sign In
                        </h2>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="Email"
                                className="border border-gray-300 rounded px-3 py-2"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <input
                                type="password"
                                placeholder="Password"
                                className="border border-gray-300 rounded px-3 py-2"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <button
                                type="submit"
                                className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition"
                            >
                                Sign In
                            </button>

                            <div className="text-sm text-center">
                                <Link to="/forgot-password" className="text-forest underline">
                                    Forgot Password?
                                </Link>
                            </div>

                            {message && (
                                <p className="text-sm text-center text-gray-700 mt-2">{message}</p>
                            )}
                        </form>
                    </div>
                </main>
            </div>
        </div >
    );
}
