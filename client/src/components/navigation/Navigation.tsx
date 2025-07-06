import React, { useState } from 'react';
import { NavigationLink } from './types';

export const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const leftLinks: NavigationLink[] = [
    { label: 'RU', href: '#' },
    { label: 'UNDRESS', href: '#' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 flex justify-between p-4 bg-[#1a1024] bg-opacity-80 backdrop-blur z-50">
      <div className="flex gap-8 items-center">
        {leftLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-white/80 text-sm uppercase tracking-wider hover:text-white transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>
      
      <button 
        className="md:hidden text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        ☰
      </button>

      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#1a1024] md:hidden">
          <div className="flex flex-col p-4">
            {leftLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-white/80 py-2 text-sm uppercase tracking-wider hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};