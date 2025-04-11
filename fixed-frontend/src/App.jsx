import Header from './components/Header';
import FeatureCard from './components/FeatureCard';
import gardenImg from './assets/garden-photo.jpg';
import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Garden Layout',
    description: 'Design and visualize your garden bed'
  },
  {
    title: 'Task Planning',
    description: 'Schedule and manage gardening tasks'
  },
  {
    title: 'Plant Recommendations',
    description: 'Learn what to grow and where to plant it'
  }
];

export default function App() {
  return (
    <div className="font-sans">
      <div className="relative h-[80vh] bg-cover bg-center" style={{ backgroundImage: `url(${gardenImg})` }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <Header textColor='white' />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Plan Your Home Garden with Ease
          </h1>
          <p className="max-w-xl mx-auto mb-6 text-lg">
            A gardening assistant to help you grow! Organize your garden layout,
            track and schedule tasks, get plant suggestions, and view the local
            weather forecast.
          </p>
          <Link to="/signup">
            <button className="bg-forest text-white px-6 py-3 rounded-md font-semibold">
              Get Started
            </button>
          </Link>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-6 mt-16 px-6 max-w-6xl mx-auto pb-24">
        {features.map((f, i) => (
          <FeatureCard key={i} {...f} />
        ))}
      </section>
    </div>
  );
}
