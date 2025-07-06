import React from 'react';
import { NavigationLink } from './types';

export const Footer: React.FC = () => {
  const links: NavigationLink[] = [
    { label: 'Новости', href: '#' },
    { label: 'Политика конфиденциальности', href: '#' },
    { label: 'Контакты', href: '#' },
    { label: 'Техническая поддержка', href: '#' }
  ];

  return (
    <footer className="bg-[#1a1024]/95 py-6 border-t border-white/10">
      <div className="max-w-3xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-white/70 text-sm hover:text-white transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  );
};