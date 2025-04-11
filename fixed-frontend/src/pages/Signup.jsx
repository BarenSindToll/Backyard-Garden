import Header from '../components/Header';


export default function Signup() {
    return (
        <div className="min-h-screen bg-cream flex flex-col">
            {/* Reused Header with forest color */}
            <Header textColor="forest" />

            {/* Form card */}
            <main className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md">
                    <h2 className="text-3xl font-bold text-forest mb-6 text-center">
                        Create an Account
                    </h2>

                    <form className="flex flex-col gap-5">
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
                            <input
                                type="text"
                                placeholder="Jane Doe"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full border border-gray-300 rounded px-3 py-2"
                            />
                        </div>

                        <button
                            type="submit"
                            className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition"
                        >
                            Sign Up
                        </button>

                        <p className="text-sm text-center text-gray-600">
                            Already have an account?{' '}
                            <a href="/signin" className="text-forest font-semibold hover:underline">
                                Sign In
                            </a>
                        </p>
                    </form>

                </div>
            </main>
        </div>
    );
}
