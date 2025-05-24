import calendar from '../assets/calendar.svg';
import layout from '../assets/layout.svg';
import leaf from '../assets/leaf.svg';

const icons = {

  'Task Planning': layout,
  'Garden Layout': calendar,
  'Recommendations': leaf
};

export default function FeatureCard({ title, description }) {
  return (
    <div className="text-center px-4">
      <img src={icons[title]} alt={title} className="h-10 mx-auto mb-2" />
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-700">{description}</p>
    </div>
  );
}
