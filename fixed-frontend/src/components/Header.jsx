import { useState } from 'react';
import { Link } from 'react-router-dom';


const textColorMap = {
  white: 'text-white',
  forest: 'text-forest',
  black: 'text-black'
};

export default function Header({ textColor = 'forest' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const textClass = textColorMap[textColor] || 'text-forest';

  return (
    <header className="flex justify-between items-center p-6 relative z-20">
      <Link to="/" className={`text-xl font-bold ${textClass}`}>Backyard Garden</Link>

      {/* Desktop nav */}
      <nav className={`hidden md:flex gap-6 font-semibold text-sm ${textClass}`}>
        <Link to="/signup" className={textClass}>New account</Link>
        <Link to="/signin" className={textClass}>Sign In</Link>
      </nav>

      {/* Mobile toggle */}
      <button className={`md:hidden text-2xl ${textClass}`} onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-full right-6 bg-white shadow-md border rounded-md p-4 flex flex-col gap-2 md:hidden z-10 text-sm font-semibold text-forest">
          <Link to="/signup">New account</Link>
          <Link to="/signin">Sign In</Link>
        </div>
      )}
    </header>
  );
}
