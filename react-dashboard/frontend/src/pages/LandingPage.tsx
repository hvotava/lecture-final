import React from 'react';
import { motion } from 'framer-motion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/sections/Hero';
import { ProjectIntro } from '../components/sections/ProjectIntro';
import { AboutVision } from '../components/sections/AboutVision';
import { Pricing } from '../components/sections/Pricing';
import { References } from '../components/sections/References';

// Import YPO theme CSS
import '../ui/ypo-theme.css';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen ypo-bg-surface">
      {/* Header - sticky with transparency effect */}
      <Header />
      
      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Hero />
        </motion.section>

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
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage; 