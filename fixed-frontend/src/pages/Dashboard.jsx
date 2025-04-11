
import Navigation from '../components/Navigation';
import GardenLayout from '../components/garden-layout/GardenGrid';
import DashboardHeader from '../components/DashboardHeader';

export default function Dashboard() {
    return (
        <div className="bg-cream min-h-screen text-forest font-sans">
            <DashboardHeader />
            <Navigation />
            <GardenLayout />
        </div>
    );
}
