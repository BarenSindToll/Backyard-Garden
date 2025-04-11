// pages/Home.jsx
import DashboardHeader from '../components/DashboardHeader';
import ZoneTabs from '../components/garden-layout/ZoneTabs';
import GardenGrid from '../components/garden-layout/GardenGrid';
import PlantSidebar from '../components/garden-layout/PlantSidebar';

export default function Home() {
    return (
        <div className="min-h-screen bg-cream text-forest font-sans">
            <DashboardHeader />
            <div className="flex px-6 py-8 gap-6">
                <div className="w-2/3">
                    <ZoneTabs />
                    <GardenGrid />
                </div>
                <div className="w-1/3">
                    <PlantSidebar />
                </div>
            </div>
        </div>
    );
}
