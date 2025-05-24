import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import bgImage from '../assets/sign-in-bg.jpg';

export default function VerifyEmail() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resendCount, setResendCount] = useState(0);
    const [cooldown, setCooldown] = useState(0);
    const navigate = useNavigate();

    // Countdown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleChange = (index, value) => {
        if (!/^[0-9]?$/.test(value)) return;
        const updatedOtp = [...otp];
        updatedOtp[index] = value;
        setOtp(updatedOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Enter the full 6-digit OTP');
            return;
        }

        try {
            const response = await fetch('http://localhost:4000/api/auth/verify-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ otp: otpCode }),
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('Email verified! Redirecting you to homepage...');
                setTimeout(() => navigate('/home'), 1500);
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch {
            setError('Server error. Please try again.');
        }
    };

    const handleResend = async () => {
        setError('');
        setSuccess('');

        if (resendCount >= 2) {
            setError('Maximum OTP resend attempts reached.');
            return;
        }

        try {
            const response = await fetch('http://localhost:4000/api/auth/send-verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({}),
            });

            const data = await response.json();
            if (data.success) {
                setSuccess('OTP resent! Check your email.');
                setResendCount(resendCount + 1);
                setCooldown(30);
            } else {
                setError(data.message || 'Could not resend OTP.');
            }
        } catch {
            setError('Failed to resend. Try again later.');
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
                        <h2 className="text-3xl font-bold text-forest mb-6 text-center">Verify Your Email</h2>

                        <form onSubmit={handleVerify} className="flex flex-col gap-5 items-center">
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        id={`otp-${i}`}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-10 h-12 text-xl text-center border border-gray-300 rounded focus:outline-forest"
                                        required
                                    />
                                ))}

                            </div>

                            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                            {success && <p className="text-sm text-green-600 text-center">{success}</p>}

                            <button
                                type="submit"
                                className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition w-full"
                            >
                                Verify Email
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                onClick={handleResend}
                                disabled={cooldown > 0 || resendCount >= 2}
                                className={`text-sm font-medium ${cooldown > 0 || resendCount >= 2
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-forest hover:underline'
                                    }`}
                            >
                                {cooldown > 0
                                    ? `Resend in ${cooldown}s`
                                    : resendCount >= 2
                                        ? 'Resend limit reached'
                                        : 'Resend OTP'}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
