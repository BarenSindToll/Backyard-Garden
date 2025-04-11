export default function DashboardHeader() {
    return (
        <header className="flex justify-between items-center px-6 py-4 bg-cream border-b border-gray-200">
            <h1 className="text-3xl font-bold text-forest">Backyard Garden</h1>
            <div className="w-10 h-10 rounded-full bg-forest flex items-center justify-center text-white text-xl">
                <span className="material-icons">person</span>
            </div>
        </header>
    );
}
