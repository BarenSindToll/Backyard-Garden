import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';

export default function VerifyReset() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { email } = location.state || {};

    const handleChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length !== 6) return setMessage('Enter full 6-digit OTP');

        // ✅ Pass email + OTP to next page
        navigate('/reset-password', {
            state: {
                email,
                otp: otpCode,
            },
        });
    };

    if (!email) return <p className="text-center mt-10 text-red-500">Missing email. Please restart.</p>;

    return (
        <div className="min-h-screen bg-cream flex flex-col">
            <Header textColor="forest" />
            <main className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-forest mb-2">Enter OTP</h2>
                    <p className="text-sm text-gray-600 mb-6">We emailed a 6-digit code to {email}</p>

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
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            className="mt-4 bg-forest text-white font-semibold py-2 px-6 rounded hover:bg-green-800 transition"
                        >
                            Verify
                        </button>

                        {message && <p className="text-sm text-red-600 mt-2">{message}</p>}
                    </form>
                </div>
            </main>
        </div>
    );
}
