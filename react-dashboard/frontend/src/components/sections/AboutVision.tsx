import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Shield, 
  Globe, 
  Lightbulb,
  Award,
  Users2
} from 'lucide-react';

export const AboutVision: React.FC = () => {
  return (
    <section className="section bg-surface">
      <div className="container">
        {/* About Us Section */}
        <div className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                  alt="Náš tým pracuje na AI vzdělávací technologii"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
                
                {/* Floating Badge */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-accent" />
                    <span className="text-small font-medium">Kvalita na prvním místě</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Users2 size={24} className="text-accent" />
                </div>
                <h2 className="heading heading-2">O nás</h2>
              </div>
              
              <div className="space-y-4 text-large text-muted leading-relaxed">
                <p>
                  Jsme tým zkušených technologů, pedagogů a AI výzkumníků, kteří věří, 
                  že vzdělávání může být efektivnější, přístupnější a zábavnější.
                </p>
                <p>
                  Náš projekt AI Lektor vznikl z potřeby překonat bariéry tradičního 
                  vzdělávání. Kombinujeme nejnovější technologie umělé inteligence 
                  s hlubokým porozuměním tomu, jak lidé nejlépe učí.
                </p>
                <p>
                  Kvalita je pro nás klíčová. Každý aspekt našeho systému je pečlivě 
                  navržen a testován, abychom zajistili nejlepší možný vzdělávací zážitek.
                </p>
              </div>

              {/* Key Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Heart size={20} className="text-red-500" />
                  <div>
                    <div className="font-medium">Lidskost</div>
                    <div className="text-small text-muted">AI slouží lidem</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Award size={20} className="text-blue-500" />
                  <div>
                    <div className="font-medium">Excelence</div>
                    <div className="text-small text-muted">Nejvyšší kvalita</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Vision & Mission Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Vision */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card card-body-large text-center bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-accent/10 rounded-2xl">
                <Lightbulb size={32} className="text-accent" />
              </div>
            </div>
            
            <h3 className="heading heading-3 mb-4 text-accent">Naše vize</h3>
            <p className="text-large text-muted mb-6 leading-relaxed">
              Vytvoříme svět, kde má každý člověk přístup k personalizovanému, 
              efektivnímu a příjemnému vzdělávání pomocí AI technologií.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 justify-center">
                <Globe size={18} className="text-accent" />
                <span className="text-small">Globální dostupnost</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Heart size={18} className="text-accent" />
                <span className="text-small">Lidsky orientované</span>
              </div>
            </div>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="card card-body-large text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Shield size={32} className="text-primary" />
              </div>
            </div>
            
            <h3 className="heading heading-3 mb-4 text-primary">Naše mise</h3>
            <p className="text-large text-muted mb-6 leading-relaxed">
              Demokratizujeme vzdělávání pomocí etických AI technologií, které 
              respektují soukromí a podporují lidský potenciál.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 justify-center">
                <Shield size={18} className="text-primary" />
                <span className="text-small">Etické AI</span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Users2 size={18} className="text-primary" />
                <span className="text-small">Inkluzivní přístup</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ethical Principles */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <h3 className="heading heading-3 mb-8">Etické zásady AI</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-50 rounded-xl">
              <Shield size={24} className="text-green-600 mx-auto mb-3" />
              <h4 className="font-medium mb-2">Transparentnost</h4>
              <p className="text-small text-muted">
                Otevřeně komunikujeme, jak naše AI funguje a jaká data používá.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <Heart size={24} className="text-red-600 mx-auto mb-3" />
              <h4 className="font-medium mb-2">Soukromí</h4>
              <p className="text-small text-muted">
                Vaše data jsou chráněna nejvyššími bezpečnostními standardy.
              </p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <Users2 size={24} className="text-blue-600 mx-auto mb-3" />
              <h4 className="font-medium mb-2">Inkluzivita</h4>
              <p className="text-small text-muted">
                Naše AI je navržena tak, aby sloužila všem bez diskriminace.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}; 