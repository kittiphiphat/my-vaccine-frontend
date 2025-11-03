'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon, faAdjust } from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';

export default function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    setMounted(true);
    if (resolvedTheme) {
      setCurrentTheme(resolvedTheme);
    } else {
      setTheme('light');
      setCurrentTheme('light');
    }
  }, [resolvedTheme, setTheme]);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setCurrentTheme(newTheme);
  };

  if (!mounted) {
    return (
      <motion.button
        disabled
        className="p-2 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      >
        <FontAwesomeIcon icon={faAdjust} className="w-6 h-6 text-foreground/50" />
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 rounded-full cursor-pointer hover:bg-secondary/15 active:bg-secondary/25 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label={`สลับธีม (ปัจจุบัน: ${currentTheme === 'light' ? 'สว่าง' : 'มืด'})`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <FontAwesomeIcon
        icon={currentTheme === 'light' ? faSun : faMoon}
        className={`w-6 h-6 transition-transform duration-300 ${
          currentTheme === 'light' ? 'rotate-0 text-foreground' : 'rotate-180 text-primary-foreground'
        }`}
      />
    </motion.button>
  );
}