import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogIn } from 'lucide-react';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Handle scroll effect for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const headerVariants = {
    transparent: {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      backdropFilter: 'blur(0px)',
      borderColor: 'rgba(255, 255, 255, 0)',
    },
    solid: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderColor: 'rgba(0, 0, 0, 0.1)',
    }
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300"
      variants={headerVariants}
      animate={isScrolled ? 'solid' : 'transparent'}
      style={{
        backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0)',
        backdropFilter: isScrolled ? 'blur(20px)' : 'blur(0px)',
        borderColor: isScrolled ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0)',
      }}
    >
      <div className="container">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 text-2xl font-semibold heading text-primary hover:text-accent transition-colors"
            aria-label="AI Lektor - Domovská stránka"
          >
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white text-lg font-bold">
              AI
            </div>
            <span>AI Lektor</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLoginClick}
                className="btn btn-ghost focus-ring"
                aria-label="Přihlásit se do systému"
              >
                <LogIn size={18} />
                Přihlášení
              </button>
              <button
                onClick={handleRegisterClick}
                className="btn btn-primary focus-ring"
                aria-label="Registrovat nový účet"
              >
                <User size={18} />
                Registrace
              </button>
            </div>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus-ring"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? 'Zavřít menu' : 'Otevřít menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-200 bg-surface"
            >
              <div className="py-4 space-y-3">
                <button
                  onClick={() => {
                    handleLoginClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full btn btn-ghost justify-start focus-ring"
                  aria-label="Přihlásit se do systému"
                >
                  <LogIn size={18} />
                  Přihlášení
                </button>
                <button
                  onClick={() => {
                    handleRegisterClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full btn btn-primary justify-start focus-ring"
                  aria-label="Registrovat nový účet"
                >
                  <User size={18} />
                  Registrace
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}; 