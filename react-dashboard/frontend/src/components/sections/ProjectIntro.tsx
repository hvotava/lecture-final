import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Mic, 
  BarChart3, 
  Users,
  Zap,
  Target
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Adaptivní výuka',
    description: 'AI se přizpůsobuje tempu a znalostem každého studenta. Personalizované lekce podle individuálních potřeb.',
    color: 'text-blue-600'
  },
  {
    icon: Mic,
    title: 'Hlasové rozhraní',
    description: 'Přírodní konverzace přes telefon, WebRTC nebo WhatsApp. Žádné složité rozhraní, jen mluvte.',
    color: 'text-green-600'
  },
  {
    icon: BarChart3,
    title: 'Analytika pokroku',
    description: 'Detailní reporty a doporučení. Sledujte pokrok v reálném čase a optimalizujte výuku.',
    color: 'text-purple-600'
  },
  {
    icon: Users,
    title: 'Týmová spolupráce',
    description: 'Spravujte celé týmy, nastavujte role a sdílejte výsledky. Ideální pro firemní školení.',
    color: 'text-orange-600'
  }
];

export const ProjectIntro: React.FC = () => {
  return (
    <section id="project-intro" className="section bg-surface">
      <div className="container">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="heading heading-2 mb-4"
          >
            Popis projektu AI Lektor
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-large text-muted max-w-3xl mx-auto"
          >
            Revolucionizujeme způsob, jakým se lidé učí. Naše AI technologie kombinuje nejlepší z personalizované výuky 
            s přirozeným hlasovým rozhraním pro maximální efektivitu učení.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Feature Cards */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card card-body hover:shadow-lg transition-all duration-300 group"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gray-100 group-hover:bg-accent/10 transition-colors ${feature.color}`}>
                    <feature.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="heading heading-5 mb-2">{feature.title}</h3>
                    <p className="text-muted">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                alt="AI vzdělávání a technologie"
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
              
              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-6 right-6 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-accent" />
                  <span className="text-small font-medium">AI Powered</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-green-600" />
                  <span className="text-small font-medium">Personalizované</span>
                </div>
              </motion.div>
            </div>

            {/* Background Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/10 rounded-full blur-xl -z-10" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-10" />
          </motion.div>
        </div>

        {/* Statistics Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-muted rounded-2xl p-8 text-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold heading text-accent mb-2">95%</div>
              <div className="text-muted">Úspěšnost dokončení kurzů</div>
            </div>
            <div>
              <div className="text-4xl font-bold heading text-accent mb-2">3x</div>
              <div className="text-muted">Rychlejší učení než tradiční metody</div>
            </div>
            <div>
              <div className="text-4xl font-bold heading text-accent mb-2">24/7</div>
              <div className="text-muted">Dostupnost AI lektora</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}; 