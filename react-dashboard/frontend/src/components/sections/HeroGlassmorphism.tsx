import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  ArrowRight, 
  Sparkles, 
  Mic, 
  MessageSquare, 
  Brain,
  Zap,
  Globe,
  Users,
  Award
} from 'lucide-react';

export const HeroGlassmorphism: React.FC = () => {
  const navigate = useNavigate();

  const handleTryFree = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.8
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const floatVariants: Variants = {
    animate: {
      y: [0, -15, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-cyan-500/20"></div>
        
        {/* Animated Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
          className="absolute bottom-20 left-1/2 w-72 h-72 bg-gradient-to-r from-orange-400 to-pink-600 rounded-full blur-3xl"
        />
      </div>

      {/* Glass Morphism Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-6 py-20"
      >
        <div className="min-h-[80vh] flex items-center">
          <div className="grid lg:grid-cols-2 gap-16 items-center w-full">
            
            {/* Left Column - Content */}
            <motion.div variants={itemVariants} className="text-white space-y-8">
              
              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="inline-block"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur-lg opacity-75"></div>
                  <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 flex items-center space-x-3">
                    <Sparkles className="text-yellow-300" size={20} />
                    <span className="text-sm font-medium bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                      Powered by Advanced AI Technology
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Main Heading */}
              <motion.div variants={itemVariants}>
                <h1 className="text-6xl lg:text-8xl font-black leading-none">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                    AI Lektor
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                    Revolution
                  </span>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                variants={itemVariants}
                className="text-xl lg:text-2xl text-purple-100 leading-relaxed max-w-xl"
              >
                Zažijte budoucnost vzdělávání s našim revolučním AI asistentem. 
                <span className="text-cyan-300 font-semibold"> Personalizované, interaktivní, efektivní.</span>
              </motion.p>

              {/* Feature Pills */}
              <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
                {[
                  { icon: Brain, text: "AI-Powered", color: "from-purple-500 to-pink-500" },
                  { icon: Globe, text: "Multi-Language", color: "from-cyan-500 to-blue-500" },
                  { icon: Zap, text: "Instant Feedback", color: "from-yellow-500 to-orange-500" }
                ].map((feature, index) => (
                  <div key={index} className="relative group">
                    <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center space-x-2">
                      <feature.icon size={16} className="text-white" />
                      <span className="text-sm font-medium text-white">{feature.text}</span>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 pt-4">
                
                {/* Primary CTA */}
                <button
                  onClick={handleTryFree}
                  className="group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-2xl px-8 py-4 flex items-center justify-center space-x-3 text-white font-bold text-lg shadow-2xl transform group-hover:scale-105 transition-all duration-300">
                    <Play size={24} />
                    <span>Začít Adventures</span>
                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </button>

                {/* Secondary CTA */}
                <button
                  onClick={handleLogin}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-2xl border border-white/20"></div>
                  <div className="relative px-8 py-4 flex items-center justify-center space-x-3 text-white font-semibold text-lg group-hover:bg-white/10 transition-all duration-300">
                    <span>Přihlásit se</span>
                  </div>
                </button>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                variants={itemVariants}
                className="flex items-center space-x-8 pt-6 text-purple-200"
              >
                <div className="flex items-center space-x-2">
                  <Users size={20} className="text-cyan-300" />
                  <span className="text-sm">10,000+ Students</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Award size={20} className="text-yellow-300" />
                  <span className="text-sm">4.9★ Rating</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - 3D Visual */}
            <motion.div
              variants={itemVariants}
              className="relative flex items-center justify-center"
            >
              
              {/* Central Glass Container */}
              <div className="relative">
                
                {/* Main Glass Morphism Card */}
                <motion.div
                  animate={{ 
                    rotateY: [0, 5, -5, 0],
                    rotateX: [0, 2, -2, 0] 
                  }}
                  transition={{ 
                    duration: 8, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="relative w-96 h-96 mx-auto"
                >
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-3xl blur-2xl opacity-50"></div>
                  
                  {/* Glass Card */}
                  <div className="relative w-full h-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                      
                      {/* Central Brain Icon */}
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 180, 360]
                        }}
                        transition={{ 
                          duration: 10, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full blur-xl opacity-75"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <Brain size={48} className="text-white" />
                        </div>
                      </motion.div>

                      {/* Floating Data Visualization */}
                      <div className="grid grid-cols-3 gap-4 w-full">
                        {[...Array(9)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ 
                              opacity: [0.3, 1, 0.3],
                              scale: [0.8, 1.2, 0.8]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.2,
                              ease: "easeInOut"
                            }}
                            className="w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-400 rounded-lg opacity-60"
                          />
                        ))}
                      </div>

                      {/* Status Text */}
                      <div className="text-center">
                        <motion.p
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 3, repeat: Infinity }}
                          className="text-white font-semibold text-lg"
                        >
                          AI Learning Active
                        </motion.p>
                        <p className="text-purple-200 text-sm">Processing knowledge...</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Elements */}
                {[
                  { icon: Mic, position: "-top-6 -left-6", color: "from-pink-400 to-rose-400", delay: 0 },
                  { icon: MessageSquare, position: "-top-6 -right-6", color: "from-cyan-400 to-blue-400", delay: 1 },
                  { icon: Sparkles, position: "-bottom-6 -left-6", color: "from-yellow-400 to-orange-400", delay: 2 },
                  { icon: Zap, position: "-bottom-6 -right-6", color: "from-purple-400 to-indigo-400", delay: 3 }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    variants={floatVariants}
                    animate="animate"
                    style={{ animationDelay: `${item.delay}s` }}
                    className={`absolute ${item.position} group`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="relative w-16 h-16 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl flex items-center justify-center">
                      <item.icon size={24} className="text-white" />
                    </div>
                  </motion.div>
                ))}

                {/* Connection Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                  <defs>
                    <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="50%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  {[...Array(4)].map((_, i) => (
                    <motion.circle
                      key={i}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.6 }}
                      transition={{ 
                        duration: 3, 
                        delay: i * 0.5,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      cx="200" 
                      cy="200" 
                      r={50 + i * 30}
                      stroke="url(#connectionGradient)"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="10,5"
                    />
                  ))}
                </svg>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5 }}
          className="mt-20"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "99.9%", label: "Uptime", color: "from-green-400 to-emerald-400" },
              { value: "150ms", label: "Response Time", color: "from-blue-400 to-cyan-400" },
              { value: "50+", label: "Languages", color: "from-purple-400 to-pink-400" },
              { value: "24/7", label: "Support", color: "from-orange-400 to-red-400" }
            ].map((metric, index) => (
              <div key={index} className="text-center group">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-r ${metric.color} rounded-2xl blur opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                  <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                    <div className={`text-3xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                      {metric.value}
                    </div>
                    <div className="text-purple-200 text-sm mt-2">{metric.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroGlassmorphism; 