import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play, UserPlus, ArrowRight } from 'lucide-react';

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  const handleTryFree = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1553484771-371a605b060b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`
          }}
        />
        <div 
          className="absolute inset-0 bg-gradient-to-br from-black/40 via-primary/60 to-primary"
          style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(13,27,42,0.6) 50%, rgba(13,27,42,1) 100%)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container text-center text-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Main Heading */}
          <h1 className="heading heading-1 text-white mb-6">
            AI Lektor – osobní hlasový trenér pro vzdělávání
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-large text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Adaptivní výuka hlasem. Reálné konverzace. Měřitelný pokrok.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <button
              onClick={handleTryFree}
              className="btn btn-primary btn-large btn-pill group focus-ring"
              aria-label="Vyzkoušet AI Lektor zdarma"
            >
              <Play size={20} />
              Vyzkoušet zdarma
              <ArrowRight 
                size={16} 
                className="transition-transform group-hover:translate-x-1" 
              />
            </button>

            <button
              onClick={handleLogin}
              className="btn btn-secondary btn-large btn-pill focus-ring"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              aria-label="Přihlásit se do existujícího účtu"
            >
              <UserPlus size={20} />
              Přihlásit se
            </button>
          </motion.div>

          {/* Small Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-small text-gray-300"
          >
            Po přihlášení přejdete do dashboardu
          </motion.p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1 h-3 bg-white/50 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-accent/20 rounded-full blur-xl" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-full blur-lg" />
    </section>
  );
}; 