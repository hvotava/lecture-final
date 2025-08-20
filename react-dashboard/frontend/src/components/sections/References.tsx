import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

const references = [
  {
    name: 'YPO',
    url: 'https://www.ypo.org/',
    description: 'Young Presidents\' Organization - Globální síť CEO a business lídrů',
    logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=100&q=80'
  },
  {
    name: 'Aspironix',
    url: 'https://www.aspironix.com/',
    description: 'Technologické řešení pro moderní vzdělávání a firemní rozvoj',
    logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=100&q=80'
  },
  {
    name: 'SynQFlows',
    url: 'https://www.synqflows.com/',
    description: 'Inovativní platformy pro automatizaci a optimalizaci procesů',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=100&q=80'
  }
];

export const References: React.FC = () => {
  return (
    <section id="references" className="section bg-muted">
      <div className="container">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="heading heading-2 mb-4"
          >
            Reference & inspirace
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-large text-muted"
          >
            Organizace a platformy, které nás inspirují k vytváření lepších vzdělávacích řešení
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {references.map((reference, index) => (
            <motion.a
              key={reference.name}
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card card-body group hover:shadow-xl transition-all duration-300 no-underline"
              aria-label={`Navštívit ${reference.name} - otevře se v novém okně`}
            >
              {/* Logo Container */}
              <div className="relative overflow-hidden rounded-lg mb-4 bg-gray-100">
                <img
                  src={reference.logo}
                  alt={`${reference.name} logo`}
                  className="w-full h-24 object-cover grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-white/20 group-hover:bg-white/0 transition-all duration-300" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="heading heading-5 group-hover:text-accent transition-colors">
                    {reference.name}
                  </h3>
                  <ExternalLink 
                    size={16} 
                    className="text-gray-400 group-hover:text-accent transition-colors" 
                  />
                </div>
                <p className="text-muted text-small leading-relaxed">
                  {reference.description}
                </p>
              </div>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            </motion.a>
          ))}
        </div>

        {/* Additional Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-small text-muted">
            Tyto organizace představují inspiraci pro náš přístup k inovacím ve vzdělávání a technologiích.
            <br />
            Odkazy se otevřou v novém okně.
          </p>
        </motion.div>
      </div>
    </section>
  );
}; 