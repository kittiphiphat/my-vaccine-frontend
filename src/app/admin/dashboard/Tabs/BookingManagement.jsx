'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog, faClock, faCalendarAlt, faSpinner, 
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

import BookingSettingSection from './BookingManagement/BookingSettingSection';
import VaccineTimeSlotSection from './BookingManagement/VaccineTimeSlotSection';
import VaccineServiceDaySection from './BookingManagement/VaccineServiceDaySection';

dayjs.locale('th');
dayjs.extend(buddhistEra);

const MySwal = withReactContent(Swal);

const tabs = [
  { id: 'booking', label: 'ตั้งค่าการจอง', icon: <FontAwesomeIcon icon={faCog} className="w-4 h-4" /> },
  { id: 'slot', label: 'ช่วงเวลาให้บริการ', icon: <FontAwesomeIcon icon={faClock} className="w-4 h-4" /> },
  { id: 'serviceDay', label: 'วันที่ให้บริการ', icon: <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4" /> },
];

// Skeleton Loader Component
const SkeletonLoader = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-[var(--muted-foreground)] bg-opacity-20 rounded w-1/4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-24 bg-[var(--muted-foreground)] bg-opacity-10 rounded-lg"></div>
      <div className="h-24 bg-[var(--muted-foreground)] bg-opacity-10 rounded-lg"></div>
    </div>
  </div>
);

export default function VaccineSettingsPage({ searchTerm }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('booking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingSettings, setBookingSettings] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [serviceDays, setServiceDays] = useState([]);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');

  const fetchData = useCallback(async (endpoint, context) => {
    try {
      const token = sessionStorage.getItem('jwt');
      if (!token) throw new Error('Unauthorized');
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`ไม่สามารถโหลดข้อมูล${context}ได้`);
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : [];
    } catch (error) {
      setError(error.message);
      MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message,
        customClass: {
          popup: 'bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm p-4 max-w-sm w-full',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 rounded-lg hover:bg-[var(--primary)]/90 transition-colors',
        },
      });
      if (error.message === 'Unauthorized') router.replace('/login');
      return [];
    }
  }, [router]);

  const fetchBookingSettings = useCallback(async () => fetchData('/api/booking-settings?populate=*', 'การตั้งค่าการจอง'), [fetchData]);
  const fetchTimeSlots = useCallback(async () => fetchData('/api/vaccine-time-slots?populate=*', 'ช่วงเวลาให้บริการ'), [fetchData]);
  const fetchServiceDays = useCallback(async () => fetchData('/api/vaccine-service-days?populate=*', 'วันที่ให้บริการ'), [fetchData]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [settings, slots, days] = await Promise.all([fetchBookingSettings(), fetchTimeSlots(), fetchServiceDays()]);
        setBookingSettings(settings);
        setTimeSlots(slots);
        setServiceDays(days);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [fetchBookingSettings, fetchTimeSlots, fetchServiceDays]);

  return (
    <motion.div
      className="min-h-screen bg-[var(--background)] p-4 md:p-6 lg:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-[var(--secondary)] p-1 rounded-lg w-fit mb-6">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className=" shadow-sm p-6"
          >
            {loading ? (
              <SkeletonLoader />
            ) : error ? (
              <div className="flex items-center gap-3 p-4 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 text-[var(--destructive)] rounded-lg">
                <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
                <p>เกิดข้อผิดพลาด: {error}</p>
              </div>
            ) : (
              <>
                {activeTab === 'booking' && <BookingSettingSection initialData={bookingSettings} refetchData={fetchBookingSettings} />}
                {activeTab === 'slot' && <VaccineTimeSlotSection initialData={timeSlots} refetchData={fetchTimeSlots} />}
                {activeTab === 'serviceDay' && <VaccineServiceDaySection initialData={serviceDays} refetchData={fetchServiceDays} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}