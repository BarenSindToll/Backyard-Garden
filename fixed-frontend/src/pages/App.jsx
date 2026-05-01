import Header from '../components/Header';
import FeatureCard from '../components/FeatureCard';
import gardenImg from '../assets/garden-photo.jpg';
import { Link } from 'react-router-dom';
import { useLanguage } from '../utils/languageContext';

export default function App() {
    const { t } = useLanguage();
    const l = t.landing;

    return (
        <div className="font-sans">
            <div className="relative h-[80vh] bg-cover bg-center" style={{ backgroundImage: `url(${gardenImg})` }}>
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                <Header textColor='white' />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white px-4">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {l.title}
                    </h1>
                    <p className="max-w-xl mx-auto mb-6 text-lg">
                        {l.subtitle}
                    </p>
                    <Link to="/signup">
                        <button className="bg-forest text-white px-6 py-3 rounded-md font-semibold">
                            {l.cta}
                        </button>
                    </Link>
                </div>
            </div>

            <section className="grid md:grid-cols-3 gap-6 mt-16 px-6 max-w-6xl mx-auto pb-24">
                {l.features.map((f, i) => (
                    <FeatureCard key={i} {...f} />
                ))}
            </section>
        </div>
    );
}
