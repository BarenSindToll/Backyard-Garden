import { useState } from 'react';
import Header from '../components/Header';

export default function VerifyReset() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [message, setMessage] = useState(null);

    const handleChange = (index, value) => {
        if (!/^\d?$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');

        const res = await fetch('http://localhost:4000/api/auth/verify-reset-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // required for token cookie
            body: JSON.stringify({ otp: otpCode }),
        });

        const data = await res.json();
        setMessage(data.message || 'Something went wrong');
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col">
            <Header textColor="forest" />

            <main className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-forest mb-2">Reset Password OTP</h2>
                    <p className="text-sm text-gray-600 mb-6">Enter the 6-digit code sent to your email</p>

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
                            Submit
                        </button>

                        {message && (
                            <p className="text-sm text-gray-700 mt-2">{message}</p>
                        )}
                    </form>
                </div>
            </main>
        </div>
    );
}
