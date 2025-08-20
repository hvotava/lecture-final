import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Eye, Palette, Zap } from 'lucide-react';
import { Hero } from './sections/Hero';
import HeroModern from './sections/HeroModern';
import HeroGlassmorphism from './sections/HeroGlassmorphism';
import HeroInteractive from './sections/HeroInteractive';

type DesignOption = 'original' | 'modern' | 'glassmorphism' | 'interactive';

interface DesignSelectorProps {
  onDesignChange?: (design: DesignOption) => void;
}

export const DesignSelector: React.FC<DesignSelectorProps> = ({ onDesignChange }) => {
  const [selectedDesign, setSelectedDesign] = useState<DesignOption>('original');
  const [isOpen, setIsOpen] = useState(false);

  const designs = [
    {
      id: 'original' as DesignOption,
      name: 'Původní Design',
      description: 'Současný design s gradientem a obrázkem',
      icon: Eye,
      color: 'from-blue-500 to-purple-500',
      component: Hero
    },
    {
      id: 'modern' as DesignOption,
      name: 'Modern Minimalist',
      description: 'Čistý design s důrazem na typografii',
      icon: Palette,
      color: 'from-gray-600 to-blue-600',
      component: HeroModern
    },
    {
      id: 'glassmorphism' as DesignOption,
      name: 'Glassmorphism',
      description: 'Moderní skleněné efekty s gradienty',
      icon: Zap,
      color: 'from-purple-500 to-pink-500',
      component: HeroGlassmorphism
    },
    {
      id: 'interactive' as DesignOption,
      name: 'Interactive Dynamic',
      description: 'Interaktivní animace a 3D efekty',
      icon: Settings,
      color: 'from-cyan-500 to-purple-500',
      component: HeroInteractive
    }
  ];

  const handleDesignChange = (design: DesignOption) => {
    setSelectedDesign(design);
    onDesignChange?.(design);
    setIsOpen(false);
  };

  const currentDesign = designs.find(d => d.id === selectedDesign);
  const CurrentComponent = currentDesign?.component || Hero;

  return (
    <div className="relative">
      {/* Design Selector Button */}
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-r ${currentDesign?.color || 'from-blue-500 to-purple-500'} rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity`}></div>
          <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-3 flex items-center space-x-2">
            <Settings size={20} className="text-white" />
            <span className="text-white text-sm font-medium hidden sm:block">
              Design
            </span>
          </div>
        </motion.button>

        {/* Design Options Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="absolute top-16 right-0 w-80 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl"
            >
              <h3 className="text-white font-bold text-lg mb-4 flex items-center space-x-2">
                <Palette size={20} />
                <span>Vyberte Design</span>
              </h3>

              <div className="space-y-3">
                {designs.map((design) => (
                  <motion.button
                    key={design.id}
                    onClick={() => handleDesignChange(design.id)}
                    className={`w-full group relative overflow-hidden rounded-xl transition-all duration-300 ${
                      selectedDesign === design.id 
                        ? 'ring-2 ring-white/50' 
                        : 'hover:ring-1 hover:ring-white/30'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${design.color} opacity-20 group-hover:opacity-30 transition-opacity`}></div>
                    <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 bg-gradient-to-r ${design.color} rounded-lg`}>
                          <design.icon size={20} className="text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="text-white font-semibold text-sm mb-1">
                            {design.name}
                          </h4>
                          <p className="text-white/70 text-xs leading-relaxed">
                            {design.description}
                          </p>
                        </div>
                        {selectedDesign === design.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 bg-green-400 rounded-full"
                          />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-white/60 text-xs text-center">
                  Klikněte pro náhled designu
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Current Design Component */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDesign}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <CurrentComponent />
        </motion.div>
      </AnimatePresence>

      {/* Design Info Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="fixed bottom-4 left-4 z-40"
      >
        <div className="bg-black/20 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center space-x-2">
          <div className={`w-2 h-2 bg-gradient-to-r ${currentDesign?.color || 'from-blue-500 to-purple-500'} rounded-full`}></div>
          <span className="text-white text-sm font-medium">
            {currentDesign?.name || 'Původní Design'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default DesignSelector; 