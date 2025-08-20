import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  ArrowRight, 
  Mic, 
  Volume2, 
  Brain, 
  Sparkles,
  MessageCircle,
  Zap,
  Eye,
  Hand,
  Cpu
} from 'lucide-react';

export const HeroInteractive: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);

  // Mouse tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 50, stiffness: 300 });
  const smoothMouseY = useSpring(mouseY, { damping: 50, stiffness: 300 });

  // Transform values based on mouse position
  const rotateX = useTransform(smoothMouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(smoothMouseX, [-300, 300], [-10, 10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const x = e.clientX - centerX;
        const y = e.clientY - centerY;
        
        mouseX.set(x);
        mouseY.set(y);
        setMousePosition({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const handleTryFree = () => {
    setIsPlaying(true);
    setTimeout(() => {
      navigate('/register');
    }, 1000);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // Particle system data
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    speed: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.5 + 0.2
  }));

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Animated Particle Background */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: particle.opacity,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity],
            }}
            transition={{
              duration: particle.speed * 10,
              repeat: Infinity,
              ease: "linear",
              delay: particle.id * 0.1,
            }}
          />
        ))}
      </div>

      {/* Dynamic Grid Background */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          backgroundPosition: isHovering ? '40px 40px' : '0px 0px',
        }}
        transition={{ duration: 0.5 }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Interactive Glow Effect Following Mouse */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: smoothMouseX,
          top: smoothMouseY,
          x: '-50%',
          y: '-50%',
        }}
      >
        <div className="w-96 h-96 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-full blur-3xl" />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-20">
        <div className="min-h-[80vh] flex items-center">
          <div className="grid lg:grid-cols-2 gap-16 items-center w-full">
            
            {/* Left Column - Interactive Content */}
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, type: "spring" }}
              className="text-white space-y-8"
            >
              
              {/* Interactive Badge */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block cursor-pointer"
              >
                <div className="relative group">
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-full blur-lg opacity-75 group-hover:opacity-100"
                  />
                  <div className="relative bg-black/50 backdrop-blur-xl border border-purple-500/50 rounded-full px-6 py-3 flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Cpu className="text-cyan-400" size={20} />
                    </motion.div>
                    <span className="text-sm font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                      Next-Gen AI Technology
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Interactive Main Heading */}
              <motion.div>
                <motion.h1 
                  className="text-7xl lg:text-9xl font-black leading-none cursor-pointer select-none"
                  whileHover={{ scale: 1.02 }}
                  style={{
                    rotateX,
                    rotateY,
                  }}
                >
                  <motion.span
                    className="block bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  >
                    AI LEKTOR
                  </motion.span>
                  <motion.span
                    className="block bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: ['100% 50%', '0% 50%', '100% 50%'],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear",
                      delay: 0.5
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  >
                    FUTURE
                  </motion.span>
                </motion.h1>
              </motion.div>

              {/* Interactive Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-xl lg:text-2xl text-purple-100 leading-relaxed max-w-xl"
              >
                Vstupte do éry{' '}
                <motion.span
                  className="text-cyan-300 font-bold cursor-pointer"
                  whileHover={{ scale: 1.1, color: "#00f5ff" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  interaktivního vzdělávání
                </motion.span>
                {' '}s AI, které rozumí, učí se a roste s vámi.
              </motion.p>

              {/* Interactive Feature Showcase */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="grid grid-cols-3 gap-4"
              >
                {[
                  { icon: Eye, label: "Visual AI", color: "from-blue-500 to-cyan-500" },
                  { icon: Hand, label: "Touch Interface", color: "from-purple-500 to-pink-500" },
                  { icon: Brain, label: "Neural Learning", color: "from-green-500 to-emerald-500" }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ 
                      scale: 1.1, 
                      rotateY: 15,
                      z: 50 
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="group cursor-pointer"
                  >
                    <div className="relative">
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-xl blur opacity-50 group-hover:opacity-100 group-hover:blur-lg`}
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.3
                        }}
                      />
                      <div className="relative bg-black/30 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-center">
                        <feature.icon size={32} className="mx-auto mb-2 text-white" />
                        <span className="text-sm font-medium text-white">{feature.label}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Interactive CTA Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-6 pt-6"
              >
                
                {/* Animated Primary CTA */}
                <motion.button
                  onClick={handleTryFree}
                  className="group relative overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={isPlaying ? {
                    scale: [1, 1.2, 1],
                    rotate: [0, 360, 0]
                  } : {}}
                  transition={{ duration: 1 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 rounded-2xl"
                    animate={{
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  />
                  <div className="relative px-8 py-4 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center space-x-3 text-white font-bold text-lg">
                    <motion.div
                      animate={{ rotate: isPlaying ? [0, 360] : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Play size={24} />
                    </motion.div>
                    <span>Spustit AI Demo</span>
                    <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
                  </div>
                </motion.button>

                {/* Interactive Secondary CTA */}
                <motion.button
                  onClick={handleLogin}
                  className="group relative"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 group-hover:border-white/40 transition-all duration-300" />
                  <div className="relative px-8 py-4 flex items-center justify-center space-x-3 text-white font-semibold text-lg">
                    <motion.div
                      whileHover={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Sparkles size={20} />
                    </motion.div>
                    <span>Vstoupit</span>
                  </div>
                </motion.button>
              </motion.div>

              {/* Live Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="flex items-center space-x-8 pt-6 text-purple-200"
              >
                <motion.div 
                  className="flex items-center space-x-2"
                  whileHover={{ scale: 1.1 }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-3 h-3 bg-green-400 rounded-full"
                  />
                  <span className="text-sm">Live: 1,247 users</span>
                </motion.div>
                <motion.div 
                  className="flex items-center space-x-2"
                  whileHover={{ scale: 1.1 }}
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Brain size={16} className="text-cyan-400" />
                  </motion.div>
                  <span className="text-sm">AI Processing</span>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Column - 3D Interactive Visualization */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, type: "spring", delay: 0.3 }}
              className="relative flex items-center justify-center"
            >
              
              {/* 3D Interactive Container */}
              <motion.div
                style={{ rotateX, rotateY }}
                className="relative w-96 h-96 mx-auto"
                whileHover={{ scale: 1.05 }}
              >
                
                {/* Central Interactive Sphere */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{
                    rotateY: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <motion.div
                    className="relative w-64 h-64 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 shadow-2xl"
                    whileHover={{ scale: 1.1 }}
                    animate={{
                      boxShadow: [
                        "0 0 50px rgba(139, 92, 246, 0.5)",
                        "0 0 100px rgba(236, 72, 153, 0.5)",
                        "0 0 50px rgba(6, 182, 212, 0.5)",
                        "0 0 50px rgba(139, 92, 246, 0.5)"
                      ],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="absolute inset-4 bg-black/20 backdrop-blur-xl rounded-full border border-white/30 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: [0, -360] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      >
                        <Brain size={80} className="text-white" />
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Orbiting Interactive Elements */}
                {[
                  { icon: Mic, angle: 0, radius: 150, color: "from-pink-500 to-rose-500" },
                  { icon: MessageCircle, angle: 90, radius: 150, color: "from-cyan-500 to-blue-500" },
                  { icon: Sparkles, angle: 180, radius: 150, color: "from-yellow-500 to-orange-500" },
                  { icon: Zap, angle: 270, radius: 150, color: "from-purple-500 to-indigo-500" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      x: '-50%',
                      y: '-50%',
                    }}
                    animate={{
                      rotate: [item.angle, item.angle + 360],
                    }}
                    transition={{
                      duration: 10 + index * 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  >
                    <motion.div
                      style={{
                        x: `${item.radius}px`,
                      }}
                      whileHover={{ scale: 1.3, z: 100 }}
                      className="group cursor-pointer"
                    >
                      <div className="relative">
                        <motion.div
                          className={`absolute inset-0 bg-gradient-to-r ${item.color} rounded-2xl blur opacity-75 group-hover:opacity-100 group-hover:blur-lg`}
                          animate={{
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.5
                          }}
                        />
                        <div className="relative w-16 h-16 bg-black/30 backdrop-blur-xl border border-white/30 rounded-2xl flex items-center justify-center">
                          <item.icon size={24} className="text-white" />
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}

                {/* Interactive Data Streams */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <motion.linearGradient 
                      id="streamGradient" 
                      x1="0%" y1="0%" x2="100%" y2="100%"
                      animate={{
                        x1: ["0%", "100%", "0%"],
                        x2: ["100%", "0%", "100%"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
                    </motion.linearGradient>
                  </defs>
                  
                  {[...Array(6)].map((_, i) => (
                    <motion.circle
                      key={i}
                      cx="192" 
                      cy="192" 
                      r={60 + i * 20}
                      stroke="url(#streamGradient)"
                      strokeWidth="2"
                      fill="none"
                      strokeDasharray="20,10"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ 
                        pathLength: [0, 1, 0],
                        opacity: [0, 0.6, 0],
                        rotate: [0, 360]
                      }}
                      transition={{
                        duration: 4,
                        delay: i * 0.3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </svg>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Interactive Bottom Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="mt-20"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "Real-time", label: "AI Processing", icon: Cpu },
              { value: "∞", label: "Possibilities", icon: Sparkles },
              { value: "24/7", label: "Available", icon: Volume2 },
              { value: "100%", label: "Personalized", icon: Brain }
            ].map((metric, index) => (
              <motion.div
                key={index}
                className="group cursor-pointer"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 + index * 0.1, duration: 0.6 }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-2xl blur group-hover:blur-lg"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.5
                    }}
                  />
                  <div className="relative bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center group-hover:border-white/40 transition-all duration-300">
                    <motion.div
                      className="mb-3 flex justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <metric.icon size={24} className="text-cyan-400" />
                    </motion.div>
                    <motion.div 
                      className="text-2xl font-bold text-white mb-2"
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.3
                      }}
                    >
                      {metric.value}
                    </motion.div>
                    <div className="text-purple-200 text-sm">{metric.label}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroInteractive; 