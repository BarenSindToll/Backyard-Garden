import Header from '../components/Header';


export default function Signin() {
    return (
        <div className="min-h-screen bg-cream flex flex-col">
            <Header textColor="forest" />

            <main className="flex-grow flex items-center justify-center px-4 py-12">
                <div className="bg-white shadow-md border border-gray-200 rounded-lg p-8 w-full max-w-md">
                    <h2 className="text-3xl font-bold text-forest mb-6 text-center">
                        Sign In
                    </h2>

                    <form className="flex flex-col gap-5">
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
                        <div className="text-right text-sm">
                            <a href="/forgot-password" className="text-forest font-medium hover:underline">
                                Forgot Password?
                            </a>
                        </div>
                        <button
                            type="submit"
                            className="bg-forest text-white font-semibold py-2 rounded hover:bg-green-800 transition"
                        >
                            Sign In
                        </button>

                        <p className="text-sm text-center text-gray-600">
                            Don’t have an account?{' '}
                            <a href="/signup" className="text-forest font-semibold hover:underline">
                                Sign Up
                            </a>
                        </p>
                    </form>
                </div>
            </main>
        </div>
    );
}
