import { Link } from 'react-router-dom';

export default function DashboardHeader() {
    return (
        <header className="flex items-center justify-between px-6 py-4">
            <div className="flex-1 text-center">
                <h1 className="text-3xl font-bold text-forest">Backyard Garden</h1>

            </div>

            <div className="absolute right-6 top-6">
                <Link to="/profile">
                    <div className="bg-forest text-white w-10 h-10 flex items-center justify-center rounded-full text-sm">
                        <span>👤</span>
                    </div>
                </Link>
            </div>
        </header>
    );
}
