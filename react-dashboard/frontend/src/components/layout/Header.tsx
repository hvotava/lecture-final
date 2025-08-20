import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogIn, Home, Info, DollarSign, Star, Phone } from 'lucide-react';

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
    setIsMobileMenuOpen(false);
  };

  const handleRegisterClick = () => {
    navigate('/register');
    setIsMobileMenuOpen(false);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navigationItems = [
    { id: 'hero', label: 'Domů', icon: Home },
    { id: 'project-intro', label: 'O projektu', icon: Info },
    { id: 'about-vision', label: 'O nás', icon: Star },
    { id: 'pricing', label: 'Ceník', icon: DollarSign },
    { id: 'references', label: 'Reference', icon: Phone },
  ];

  return (
    <>
      {/* Main Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 border-b transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0)',
          backdropFilter: isScrolled ? 'blur(20px)' : 'blur(0px)',
          borderColor: isScrolled ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0)',
        }}
      >
        <div className="ypo-container">
          <div className="ypo-flex ypo-items-center ypo-justify-between py-4">
            {/* Logo */}
            <Link 
              to="/" 
              className="ypo-flex ypo-items-center ypo-gap-3 ypo-text-2xl ypo-font-semibold ypo-heading ypo-text-primary hover:ypo-text-accent ypo-transition-colors"
              aria-label="AI Lektor - Domovská stránka"
            >
              <div className="w-8 h-8 ypo-bg-accent ypo-rounded-lg ypo-flex ypo-items-center ypo-justify-center ypo-text-white ypo-text-lg ypo-font-bold">
                AI
              </div>
              <span>AI Lektor</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex ypo-items-center ypo-gap-8">
              <div className="ypo-flex ypo-items-center ypo-gap-6">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="ypo-text-primary hover:ypo-text-accent ypo-transition-colors ypo-font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="ypo-flex ypo-items-center ypo-gap-4 ypo-ml-6">
                <button
                  onClick={handleLoginClick}
                  className="ypo-btn ypo-btn-ghost ypo-focus-ring"
                  aria-label="Přihlásit se do systému"
                >
                  <LogIn size={18} />
                  Přihlášení
                </button>
                <button
                  onClick={handleRegisterClick}
                  className="ypo-btn ypo-btn-primary ypo-focus-ring"
                  aria-label="Registrovat nový účet"
                >
                  <User size={18} />
                  Registrace
                </button>
              </div>
            </nav>

            {/* Mobile Menu Toggle - Hidden on large screens */}
            <div className="lg:hidden">
              {/* Placeholder for mobile menu button - actual button is fixed positioned */}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Compact Mobile Menu Button - Fixed Bottom Right */}
      <motion.button
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 ypo-bg-primary hover:ypo-bg-primary-dark ypo-text-white ypo-rounded-full ypo-shadow-xl ypo-flex ypo-items-center ypo-justify-center ypo-transition-all duration-300"
        onClick={toggleMobileMenu}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isMobileMenuOpen ? 'Zavřít menu' : 'Otevřít menu'}
        aria-expanded={isMobileMenuOpen}
      >
        <motion.div
          animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.div>
      </motion.button>

      {/* Compact Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={toggleMobileMenu}
            />
            
            {/* Menu Panel */}
            <motion.nav
              initial={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20, y: 20 }}
              transition={{ duration: 0.3, type: "spring", damping: 20 }}
              className="lg:hidden fixed bottom-24 right-6 z-50 ypo-bg-surface ypo-rounded-2xl ypo-shadow-2xl border border-gray-200 overflow-hidden"
              style={{ minWidth: '200px' }}
            >
              <div className="p-4">
                {/* Navigation Items */}
                <div className="space-y-2 mb-4">
                  {navigationItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => scrollToSection(item.id)}
                        className="w-full ypo-flex ypo-items-center ypo-gap-3 px-3 py-2 ypo-text-left ypo-text-primary hover:ypo-bg-muted ypo-rounded-lg ypo-transition-colors"
                      >
                        <Icon size={18} />
                        <span className="ypo-font-medium">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Divider */}
                <hr className="border-gray-200 my-4" />

                {/* Auth Buttons */}
                <div className="space-y-2">
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: navigationItems.length * 0.05 }}
                    onClick={handleLoginClick}
                    className="w-full ypo-flex ypo-items-center ypo-gap-3 px-3 py-2 ypo-text-left ypo-text-primary hover:ypo-bg-muted ypo-rounded-lg ypo-transition-colors"
                  >
                    <LogIn size={18} />
                    <span className="ypo-font-medium">Přihlášení</span>
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (navigationItems.length + 1) * 0.05 }}
                    onClick={handleRegisterClick}
                    className="w-full ypo-flex ypo-items-center ypo-gap-3 px-3 py-2 ypo-bg-primary ypo-text-white ypo-rounded-lg hover:ypo-bg-primary-dark ypo-transition-colors"
                  >
                    <User size={18} />
                    <span className="ypo-font-medium">Registrace</span>
                  </motion.button>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}; 