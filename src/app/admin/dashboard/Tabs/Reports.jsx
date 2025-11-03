'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import StatisticsTab from './Reports/StatisticsTab';
import ReportTab from './Reports/ReportTab';

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function VaccineDashboardPage({ searchTerm }) {
  const router = useRouter();
  const [tab, setTab] = useState('statistics');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const token = sessionStorage.getItem('jwt');
        if (!token) throw new Error('Unauthorized: No token found');
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            Expires: '0',
          },
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Unauthorized: ${errorText || 'Invalid response'}`);
        }
        setLoading(false);
      } catch (error) {
        const errorMessage = error.response?.statusText || `ไม่สามารถตรวจสอบการ認証ได้: ${error.message}`;
        MySwal.fire({
          icon: 'error',
          title: 'กรุณาเข้าสู่ระบบ',
          text: errorMessage.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : errorMessage,
          customClass: {
            popup: 'bg-[var(--card)] dark:bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] dark:border-[var(--border)] shadow-sm p-4 max-w-sm w-full',
            title: 'text-lg font-semibold text-[var(--card-foreground)] dark:text-[var(--card-foreground)]',
            htmlContainer: 'text-base text-[var(--muted-foreground)] dark:text-[var(--muted-foreground)]',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
          },
        });
        router.replace('/login');
      }
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)] dark:bg-[var(--background)]">
        <motion.div
          className="w-10 h-10 border-4 border-[var(--primary)] dark:border-[var(--primary)] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 bg-[var(--card)] dark:bg-[var(--card)] rounded-[var(--radius)] shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-extrabold text-[var(--foreground)] dark:text-[var(--foreground)] mb-4">แดชบอร์ดรายงาน </h2>
      <div className="flex gap-3 mb-6">
        {['statistics', 'report'].map((t) => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-5 py-3 text-sm font-medium rounded-[var(--radius)] transition-all duration-200 shadow-sm ${
              tab === t
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md'
                : 'bg-[var(--muted)]/50 text-[var(--foreground)] dark:text-[var(--foreground)] hover:bg-[var(--primary)]/10 dark:hover:bg-[var(--primary)]/10'
            }`}
            aria-label={t === 'statistics' ? 'แสดงสถิติ' : 'แสดงรายงาน'}
          >
            {t === 'statistics' ? 'สถิติ' : 'รายงาน'}
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {tab === 'statistics' ? <StatisticsTab searchTerm={searchTerm} /> : <ReportTab searchTerm={searchTerm} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}