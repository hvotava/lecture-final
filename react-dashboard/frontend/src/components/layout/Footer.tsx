import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Github, Linkedin, Twitter } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2">
            <Link 
              to="/" 
              className="flex items-center gap-3 text-2xl font-semibold heading text-white hover:text-accent transition-colors mb-4"
            >
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white text-lg font-bold">
                AI
              </div>
              <span>AI Lektor</span>
            </Link>
            <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
              Osobní hlasový trenér pro vzdělávání. Adaptivní výuka hlasem s měřitelným pokrokem 
              a reálnými konverzacemi.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail size={16} />
                <a 
                  href="mailto:info@ailektor.cz" 
                  className="hover:text-accent transition-colors"
                >
                  info@ailektor.cz
                </a>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone size={16} />
                <a 
                  href="tel:+420123456789" 
                  className="hover:text-accent transition-colors"
                >
                  +420 123 456 789
                </a>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin size={16} />
                <span>Praha, Česká republika</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="heading heading-6 text-white mb-4">Rychlé odkazy</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/login" 
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  Přihlášení
                </Link>
              </li>
              <li>
                <Link 
                  to="/register" 
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  Registrace
                </Link>
              </li>
              <li>
                <a 
                  href="#pricing" 
                  className="text-gray-300 hover:text-accent transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Ceník
                </a>
              </li>
              <li>
                <a 
                  href="#about" 
                  className="text-gray-300 hover:text-accent transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  O nás
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="heading heading-6 text-white mb-4">Právní informace</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/kontakt" 
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  Kontakt
                </Link>
              </li>
              <li>
                <Link 
                  to="/podminky" 
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  Podmínky použití
                </Link>
              </li>
              <li>
                <Link 
                  to="/soukromi" 
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  Ochrana soukromí
                </Link>
              </li>
              <li>
                <Link 
                  to="/gdpr" 
                  className="text-gray-300 hover:text-accent transition-colors"
                >
                  GDPR
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-gray-600 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-300 text-small mb-4 md:mb-0">
            © {currentYear} AI Lektor. Všechna práva vyhrazena.
          </div>
          
          {/* Social Media Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/ailektor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-accent transition-colors"
              aria-label="GitHub"
            >
              <Github size={20} />
            </a>
            <a
              href="https://linkedin.com/company/ailektor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-accent transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={20} />
            </a>
            <a
              href="https://twitter.com/ailektor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-accent transition-colors"
              aria-label="Twitter"
            >
              <Twitter size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}; 