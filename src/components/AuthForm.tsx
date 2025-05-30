import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Mail, Lock, LogIn, UserPlus, ArrowLeft, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import AdComponent from './AdComponent';

interface AuthFormProps {
  setIsLoading: (loading: boolean) => void;
  onBack: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

export default function AuthForm({ setIsLoading, onBack }: AuthFormProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [circles, setCircles] = useState<{ x: number; y: number; scale: number }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const newCircles = Array.from({ length: 15 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      scale: 0.5 + Math.random() * 1.5,
    }));
    setCircles(newCircles);
  }, []);

  const createParticles = () => {
    const newParticles: Particle[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 600 - 300, // -300 to 300
      y: Math.random() * 600 - 300,
      size: Math.random() * 8 + 4,
      duration: Math.random() * 2 + 1,
      delay: Math.random() * 0.5,
      color: ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'][Math.floor(Math.random() * 5)]
    }));
    setParticles(newParticles);
    
    // Clear particles after animation
    setTimeout(() => {
      setParticles([]);
    }, 3000);
  };

  const handleFormSwitch = () => {
    setIsAnimating(true);
    createParticles();
    
    setTimeout(() => {
      setIsSignUp(!isSignUp);
      setFormError(null);
      setIsAnimating(false);
    }, 300);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setFormError('This email is already registered. Please sign in instead.');
        } else {
          setFormError(error.message);
        }
        return;
      }
      
      toast.success('Check your email for the confirmation link!');
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setFormError('Incorrect email or password');
        } else {
          setFormError(error.message);
        }
        return;
      }
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" translate="no">
      {/* Sol reklam alanı */}
      <div className="hidden lg:flex flex-col items-center justify-center absolute left-0 top-0 bottom-0 w-[300px] z-20">
        <div className="sticky top-8">
          <AdComponent type="sidebar" />
        </div>
      </div>
      {/* Sağ reklam alanı */}
      <div className="hidden lg:flex flex-col items-center justify-center absolute right-0 top-0 bottom-0 w-[300px] z-20">
        <div className="sticky top-8">
          <AdComponent type="sidebar" />
        </div>
      </div>

      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2940&auto=format&fit=crop)',
          filter: 'brightness(0.2)',
          transform: 'translateZ(0)'
        }}
      />

      <motion.button
        onClick={onBack}
        className={`absolute top-4 left-4 px-4 py-2 ${
          theme === 'dark'
            ? 'bg-gray-800/50'
            : 'bg-white/50'
        } backdrop-blur-sm rounded-xl text-white flex items-center gap-2 z-50 hover:bg-opacity-70 transition-all duration-200 border border-white/10`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-5 h-5" />
        Ana Sayfaya Dön
      </motion.button>

      {/* Animated Background Circles */}
      {circles.map((circle, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full bg-blue-500/20 backdrop-blur-sm"
          initial={{ x: circle.x, y: circle.y, scale: 0 }}
          animate={{
            x: [circle.x - 50, circle.x + 50, circle.x - 50],
            y: [circle.y - 50, circle.y + 50, circle.y - 50],
            scale: circle.scale,
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            width: '150px',
            height: '150px',
          }}
        />
      ))}

      {/* Particles */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full pointer-events-none z-30"
            style={{
              backgroundColor: particle.color,
              width: particle.size,
              height: particle.size,
              left: '50%',
              top: '50%',
            }}
            initial={{ 
              x: 0, 
              y: 0, 
              scale: 0, 
              opacity: 1,
              rotate: 0
            }}
            animate={{ 
              x: particle.x, 
              y: particle.y, 
              scale: [0, 1, 0], 
              opacity: [0, 1, 0],
              rotate: 360
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: "easeOut"
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>

      {/* Animated SVG Background */}
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-30">
          <motion.path
            d="M 0,50 Q 100,100 200,50 T 400,50"
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth="2"
            fill="transparent"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </svg>
      </div>

      <div className="max-w-md w-full mx-4 relative z-10">
        <motion.div
          key={isSignUp ? 'signup' : 'signin'}
          initial={{ 
            opacity: 0, 
            rotateY: isAnimating ? 90 : 0,
            scale: 0.8,
            z: -100
          }}
          animate={{ 
            opacity: 1, 
            rotateY: 0,
            scale: 1,
            z: 0
          }}
          exit={{ 
            opacity: 0, 
            rotateY: -90,
            scale: 0.8,
            z: -100
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          className={`backdrop-blur-xl ${
            theme === 'dark'
              ? 'bg-white/10 border-white/20'
              : 'bg-white/80 border-gray-200'
          } p-8 rounded-2xl shadow-2xl border relative overflow-hidden`}
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
            perspective: '1000px',
            transformStyle: 'preserve-3d'
          }}
          translate="no"
        >
          {/* Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{
              boxShadow: isSignUp 
                ? '0 0 50px rgba(139, 92, 246, 0.3), 0 0 100px rgba(139, 92, 246, 0.1)'
                : '0 0 50px rgba(59, 130, 246, 0.3), 0 0 100px rgba(59, 130, 246, 0.1)'
            }}
            transition={{ duration: 0.6 }}
          />

          {/* Sparkle Effects */}
          <motion.div
            className="absolute top-4 right-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400 opacity-70" />
          </motion.div>

          <motion.div
            className="absolute bottom-4 left-4"
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-5 h-5 text-purple-400 opacity-60" />
          </motion.div>

          <div className="relative mb-8">
            <div className="relative w-32 h-32 mx-auto">
              <motion.div
                className={`absolute inset-0 rounded-full ${
                  theme === 'dark'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-900 border-blue-500/50'
                    : 'bg-gradient-to-br from-blue-400 to-indigo-700 border-blue-400/50'
                } border-4`}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: 1, 
                  rotate: 0,
                  boxShadow: isSignUp 
                    ? '0 0 30px rgba(139, 92, 246, 0.6)'
                    : '0 0 30px rgba(59, 130, 246, 0.6)'
                }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
              />
              <motion.div
                className="absolute inset-0 flex items-center justify-center text-white text-5xl font-bold"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  rotate: isSignUp ? 360 : 0
                }}
                transition={{ 
                  duration: 0.8, 
                  delay: 0.4,
                  type: "spring",
                  stiffness: 300
                }}
              >
                {isSignUp ? <UserPlus className="w-16 h-16" /> : <LogIn className="w-16 h-16" />}
              </motion.div>
            </div>
          </div>

          <motion.div 
            className="text-center mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'} bg-gradient-to-r ${
              isSignUp 
                ? 'from-purple-500 to-pink-600' 
                : 'from-blue-500 to-indigo-600'
            } bg-clip-text text-transparent`}>
              {isSignUp ? 'Hesap Oluştur' : 'Giriş Yap'}
            </h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {isSignUp
                ? 'E-posta adresinizle ücretsiz hesap oluşturun'
                : 'Hesabınıza giriş yaparak çalışmaya devam edin'}
            </p>
          </motion.div>

          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mb-6 p-3 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-200 text-sm"
            >
              {formError}
            </motion.div>
          )}

          <motion.form 
            onSubmit={isSignUp ? handleSubmit : handleSignIn}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="mb-6">
              <label
                htmlFor="email"
                className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                E-posta Adresi
              </label>
              <motion.div 
                className={`relative rounded-xl overflow-hidden border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 focus-within:border-blue-500/50'
                  : 'bg-white border-gray-300 focus-within:border-blue-500'
                } transition-all duration-200`}
                whileFocus={{ scale: 1.02 }}
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`block w-full pl-10 pr-3 py-3 ${
                    theme === 'dark'
                      ? 'bg-transparent text-white placeholder-gray-400'
                      : 'text-gray-900 placeholder-gray-500'
                  } focus:outline-none text-base`}
                  placeholder="email@örnek.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </motion.div>
            </div>

            <div className="mb-8">
              <label
                htmlFor="password"
                className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                Şifre
              </label>
              <motion.div 
                className={`relative rounded-xl overflow-hidden border ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 focus-within:border-blue-500/50'
                  : 'bg-white border-gray-300 focus-within:border-blue-500'
                } transition-all duration-200`}
                whileFocus={{ scale: 1.02 }}
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={`block w-full pl-10 pr-3 py-3 ${
                    theme === 'dark'
                      ? 'bg-transparent text-white placeholder-gray-400'
                      : 'text-gray-900 placeholder-gray-500'
                  } focus:outline-none text-base`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </motion.div>
            </div>

            <motion.button
              whileHover={{ 
                scale: 1.05, 
                boxShadow: isSignUp 
                  ? '0 10px 40px rgba(139, 92, 246, 0.4)'
                  : '0 10px 40px rgba(59, 130, 246, 0.4)'
              }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className={`w-full py-3 px-4 rounded-xl font-medium text-white ${
                isSignUp 
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500'
                  : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600'
              } hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 border border-white/10 relative overflow-hidden`}
            >
              <motion.div
                className="absolute inset-0 bg-white/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              <div className="relative z-10 flex items-center gap-2">
              {isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  Hesap Oluştur
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Giriş Yap
                </>
              )}
              </div>
            </motion.button>

            <div className="mt-6 text-center">
              <motion.button
                type="button"
                onClick={handleFormSwitch}
                className={`text-sm ${
                  theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                } font-medium transition-colors relative`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  className="relative z-10"
                  animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
              >
                {isSignUp ? 'Zaten bir hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
                </motion.span>
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}