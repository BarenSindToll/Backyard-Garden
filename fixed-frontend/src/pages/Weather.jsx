import { useState, useEffect } from 'react';
import DashboardHeader from '../components/DashboardHeader';

const API_KEY = '2Y4LEHPRNRVWJFJFJDG87GGFL';

const conditionIcons = {
    'clear': 'sun.svg',
    'partially cloudy': 'partially-cloudy.svg',
    'cloudy': 'cloudy.svg',
    'rain': 'rain.svg',
    'showers': 'showers.svg',
    'thunderstorm': 'thunder.svg',
    'snow': 'snow.svg',
    'fog': 'fog.svg',
    'overcast': 'cloudy.svg',
};

export default function Weather() {
    const [location, setLocation] = useState('');
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [todaySnapshot, setToday] = useState(null);

    //  Extract weather using saved location
    const fetchForecast = async (cityName) => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(
                `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
                    cityName
                )}?unitGroup=metric&include=days,current&key=${API_KEY}&contentType=json`
            );
            const data = await response.json();
            if (data.days && data.currentConditions) {
                setForecast(data.days.slice(0, 7));
                setToday(data.currentConditions);
            } else {
                setError('No forecast data available.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to fetch weather data.');
        } finally {
            setLoading(false);
        }
    };

    //  Load user location from backend
    useEffect(() => {
        const fetchUserLocation = async () => {
            try {
                const res = await fetch('http://localhost:4000/api/user/get-data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ userId: localStorage.getItem('userId') }),
                });
                const data = await res.json();
                if (data.success && data.userData.location) {
                    const cityOnly = data.userData.location.split(',')[0].trim();
                    setLocation(cityOnly);
                    fetchForecast(cityOnly);
                } else {
                    setLocation('Timișoara');
                    fetchForecast('Timișoara');
                    setError('No saved location found. Showing default.');
                }
            } catch (err) {
                console.error(err);
                setLocation('Timișoara');
                fetchForecast('Timișoara');
                setError('Could not load your saved location. Showing default.');
            }
        };
        fetchUserLocation();
    }, []);

    function getIconForCondition(condition) {
        if (!condition) return 'default.svg';
        const parts = condition.toLowerCase().split(',').map(p => p.trim());
        for (const part of parts) {
            for (const key in conditionIcons) {
                if (part.includes(key)) {
                    return conditionIcons[key];
                }
            }
        }
        return 'default.svg';
    }
    const todayDate = forecast[0]?.datetime;
    const today = todaySnapshot || forecast[0];

    return (
        <div className="bg-white min-h-screen">
            <DashboardHeader />
            <div className="max-w-4xl mx-auto p-6 text-forest">
                <h2 className="text-2xl font-bold mb-4">7-Day Weather Forecast</h2>
                <p className="mb-6 text-sm text-gray-600">
                    Forecast for <strong>{location || 'your location'}</strong>
                </p>

                {loading && <p>Loading forecast...</p>}
                {error && <p className="text-red-600">{error}</p>}

                {/* Today Forecast */}
                {today && (
                    <div className="bg-gradient-to-r from-[#d9ecf2] to-[#f0f8ff] rounded-xl shadow-md p-6 mb-10 text-forest">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            {/* Date & Condition */}
                            <div className="text-left space-y-1 mb-4 md:mb-0">
                                <h2 className="text-2xl font-semibold tracking-wide">
                                    {todayDate ? new Date(todayDate).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
                                </h2>
                                <p className="text-sm text-gray-700">
                                    {todayDate ? new Date(todayDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : ''}
                                </p>

                                <p className="text-sm text-gray-700 italic pt-24">{today.conditions}</p>
                            </div>

                            {/* Icon + Temp */}
                            <div className="text-center">
                                <img
                                    src={`/icons/${getIconForCondition(today.conditions)}`}
                                    alt={today.conditions}
                                    className="w-24 h-24 mx-auto mb-2"
                                />
                                <div className="text-4xl font-bold">{today.temp}°C</div>
                                <p className="text-sm text-gray-600">
                                    Feels like {today.feelslike}°C
                                </p>
                            </div>

                            {/* Details */}
                            <div className="space-y-2 text-sm text-gray-700 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <img src="/icons/wind.svg" className="w-5 h-5" alt="Wind" />
                                    {today.windspeed} km/h
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <img src="/icons/humidity.svg" className="w-5 h-5" alt="Humidity" />
                                    {today.humidity}%
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <img src="/icons/pressure.svg" className="w-5 h-5" alt="Pressure" />
                                    {today.pressure} hPa
                                </div>
                                <div className="flex justify-center gap-6 mt-10 pt-20 text-sm text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <img src="/icons/sunrise.svg" className="w-5 h-5" alt="Sunrise" />
                                        {today.sunrise}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <img src="/icons/sunset.svg" className="w-5 h-5" alt="Sunset" />
                                        {today.sunset}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Weekly Forecast */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-7xl mx-auto mt-6">
                    {forecast.slice(1).map((day, i) => (
                        <div key={i} className="bg-cream rounded-lg shadow p-4 text-center">
                            <p className="font-semibold text-lg">
                                {new Date(day.datetime).toLocaleDateString('en-US', { weekday: 'long' })}
                            </p>
                            <p className="text-sm text-gray-600">
                                {new Date(day.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                            <img
                                src={`/icons/${getIconForCondition(day.conditions)}`}
                                alt={day.conditions}
                                className="w-20 h-20 mx-auto my-2"
                            />
                            <p className="capitalize text-sm mb-1">{day.conditions}</p>
                            <p className="text-base font-medium text-forest">+{day.tempmax}°C</p>
                            <p className="text-xs text-gray-500">↓ {day.tempmin}°C</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
