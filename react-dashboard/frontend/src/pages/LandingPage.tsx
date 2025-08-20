import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { ProjectIntro } from '../components/sections/ProjectIntro';
import { AboutVision } from '../components/sections/AboutVision';
import { Pricing } from '../components/sections/Pricing';
import { References } from '../components/sections/References';
import DesignSelector from '../components/DesignSelector';

// Import YPO theme CSS
import '../ui/ypo-theme.css';

const LandingPage: React.FC = () => {
  const [selectedDesign, setSelectedDesign] = useState<string>('original');

  return (
    <div className="min-h-screen ypo-bg-surface">
      {/* Design Selector - floating design switcher */}
      <DesignSelector onDesignChange={(design) => setSelectedDesign(design)} />
      
      {/* Header - only show on original design */}
      {selectedDesign === 'original' && <Header />}
      
      {/* Main Content */}
      <main>
        {/* Hero Section with Design Selector */}
        {selectedDesign !== 'original' ? (
          // New hero designs handle their own layout
          <></>
        ) : (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Original Hero is handled by DesignSelector */}
          </motion.section>
        )}

        {/* Additional sections - only show on original design */}
        {selectedDesign === 'original' && (
          <>
            {/* Project Description */}
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <ProjectIntro />
            </motion.section>

            {/* About Us & Vision */}
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <AboutVision />
            </motion.section>

            {/* Pricing Plans */}
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <Pricing />
            </motion.section>

            {/* References */}
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <References />
            </motion.section>
          </>
        )}
      </main>

      {/* Footer - only show on original design */}
      {selectedDesign === 'original' && <Footer />}
    </div>
  );
};

export default LandingPage; 