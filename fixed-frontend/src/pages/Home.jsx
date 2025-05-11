// src/pages/Home.jsx
import DashboardHeader from '../components/DashboardHeader';
import banner from '/banner.jpg'; // Adjust path

export default function Home() {
    return (
        <div className="bg-cream min-h-screen">
            <DashboardHeader />
            <div className="text-center mt-8">
                <h2 className="text-3xl font-bold text-forest mb-4">Welcome!</h2>
                <p className="text-gray-600 max-w-xl mx-auto mb-10">
                    Here you cand explore our guides, create your own designs and schedule.
                </p>
            </div>

            {/* Blog section */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white shadow rounded overflow-hidden">
                        <img
                            src={`https://source.unsplash.com/600x400/?garden,${i}`}
                            alt="Blog post"
                            className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                            <h3 className="font-semibold text-lg text-forest mb-2">How to prepare your spring garden</h3>
                            <p className="text-sm text-gray-600">
                                Learn the best techniques to get your garden blooming beautifully this season.
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
