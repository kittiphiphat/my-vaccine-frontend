'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faCircleCheck,
  faClock,
  faCircleXmark,
  faTriangleExclamation,
  faBoxArchive,
  faChevronLeft,
  faChevronRight,
  faSyringe,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from 'next-themes';

// DayJS Setup
dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.tz.setDefault('Asia/Bangkok');

const ITEMS_PER_PAGE = 5;
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, duration: 0.4 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const pageVariants = {
  initial: { opacity: 0, x: 15 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -15, transition: { duration: 0.1 } },
};
const buttonVariants = {
  hover: { scale: 1.05, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
  tap: { scale: 0.98 },
};

// CustomDialog Component
const CustomDialog = ({ isOpen, onClose, title, text, icon, buttons = [] }) => {
  if (!isOpen) return null;
  const icons = {
    error: <FontAwesomeIcon icon={faCircleXmark} className="h-6 w-6 text-[var(--destructive)]" />,
    success: <FontAwesomeIcon icon={faCircleCheck} className="h-6 w-6 text-green-500" />,
    warning: <FontAwesomeIcon icon={faTriangleExclamation} className="h-6 w-6 text-amber-500" />,
  };
  return (
    <div className="fixed inset-0 bg-[var(--background)]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-[90vw] sm:max-w-md p-4 sm:p-6 font-prompt"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="dialog-title"
      >
        <div className="text-center">
          {icon && <div className="flex justify-center mb-3">{icons[icon]}</div>}
          <h3 id="dialog-title" className="text-base sm:text-lg font-bold text-[var(--card-foreground)]">{title}</h3>
          {text && <p className="text-sm sm:text-base text-[var(--muted-foreground)] mt-2">{text}</p>}
          <div className="mt-4 flex flex-col sm:flex-row-reverse justify-center gap-3">
            {buttons.map((button, index) => (
              <motion.div key={index} variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button
                  onClick={button.onClick}
                  variant={button.variant || 'default'}
                  className={`w-full sm:w-auto text-sm sm:text-base font-semibold rounded-lg px-4 py-2 transition-all duration-200 ${
                    button.variant === 'destructive'
                      ? 'bg-[var(--destructive)] text-[var(--primary-foreground)] hover:bg-[var(--destructive)]/90'
                      : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2`}
                  aria-label={button.text}
                >
                  {button.text}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// PaginationControls Component
const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center items-center gap-2 mt-4 print-hidden">
      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full text-sm font-medium border-[var(--border)] text-[var(--primary)] hover:bg-[var(--muted)]/10 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 p-0"
          aria-label="หน้าก่อนหน้า"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
        </Button>
      </motion.div>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <motion.div key={page} variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={() => onPageChange(page)}
            variant={currentPage === page ? 'default' : 'outline'}
            className={`h-8 w-8 sm:h-10 sm:w-10 text-sm font-medium rounded-full transition-all duration-200 ${
              currentPage === page
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                : 'border-[var(--border)] text-[var(--primary)] hover:bg-[var(--muted)]/10'
            } focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2`}
            aria-label={`หน้า ${page}`}
          >
            {page}
          </Button>
        </motion.div>
      ))}
      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full text-sm font-medium border-[var(--border)] text-[var(--primary)] hover:bg-[var(--muted)]/10 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 p-0"
          aria-label="หน้าถัดไป"
        >
          <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
};

// AppointmentCard Component
const AppointmentCard = ({ appointment, onCancel }) => {
  const attr = appointment.attributes || {
    bookingDate: appointment.bookingDate,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.booking_status,
    vaccination_status: appointment.vaccination_status,
    vaccine: appointment.vaccine ? { data: { attributes: appointment.vaccine } } : null,
  };
  const vaccineTitle = attr.vaccine?.data?.attributes?.title || 'ไม่ระบุวัคซีน';
  const bookingDate = attr.bookingDate ? dayjs(attr.bookingDate.split('T')[0]).tz('Asia/Bangkok') : null;
  const isPast = bookingDate ? dayjs().tz('Asia/Bangkok').isAfter(bookingDate.endOf('day')) : false;

  const statusInfo = useMemo(() => {
    switch (attr.status) {
      case 'cancelled':
        return { text: 'ยกเลิกแล้ว', icon: <FontAwesomeIcon icon={faCircleXmark} className="h-4 w-4" />, color: 'text-[var(--destructive)] bg-[var(--destructive)]/10' };
      case 'confirmed':
        if (isPast) {
          return { text: 'สำเร็จ', icon: <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />, color: 'text-sky-600 bg-sky-500/10' };
        }
        return { text: 'ยืนยันแล้ว', icon: <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />, color: 'text-green-600 bg-green-500/10' };
      default:
        return { text: 'รอการยืนยัน', icon: <FontAwesomeIcon icon={faClock} className="h-4 w-4" />, color: 'text-amber-600 bg-amber-500/10' };
    }
  }, [attr.status, isPast]);

  const vaccinationStatusInfo = useMemo(() => {
    if (attr.status === 'cancelled') {
      return { text: 'ยังไม่ได้รับการฉีด', icon: <FontAwesomeIcon icon={faSyringe} className="h-4 w-4" />, color: 'text-amber-600 bg-amber-100' };
    }
    const status = attr.vaccination_status || 'not_started';
    const isVaccinated = status === 'vaccinated';
    const isNotVaccinated = ['not_started', 'not_vaccinated'].includes(status);
    return isVaccinated
      ? { text: 'ฉีดแล้ว', icon: <FontAwesomeIcon icon={faSyringe} className="h-4 w-4" />, color: 'text-green-600 bg-green-100' }
      : isNotVaccinated
        ? { text: 'ยังไม่ได้รับการฉีด', icon: <FontAwesomeIcon icon={faSyringe} className="h-4 w-4" />, color: 'text-amber-600 bg-amber-100' }
        : { text: 'ไม่ทราบสถานะ', icon: <FontAwesomeIcon icon={faSyringe} className="h-4 w-4" />, color: 'text-gray-600 bg-gray-100' };
  }, [attr.vaccination_status, attr.status]);

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="flex flex-col items-start gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] shadow-md hover:shadow-lg transition-all duration-200"
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)] shadow-sm">
          <span className="text-xl font-bold text-[var(--primary)]">{bookingDate ? bookingDate.format('D') : '-'}</span>
          <span className="text-sm font-medium text-[var(--muted-foreground)] uppercase">{bookingDate ? bookingDate.format('MMM') : '-'}</span>
        </div>
        <div className="flex-grow space-y-1.5">
          <h3 className="text-base font-bold text-[var(--card-foreground)] truncate">{vaccineTitle}</h3>
          <p className="text-sm text-[var(--muted-foreground)]">เวลา {attr.startTime?.substring(0, 5) || '--:--'} - {attr.endTime?.substring(0, 5) || '--:--'} น.</p>
          <div className="flex flex-wrap gap-2">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
              {statusInfo.icon}
              <span>{statusInfo.text}</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-semibold ${vaccinationStatusInfo.color}`} aria-label={`สถานะฉีด: ${vaccinationStatusInfo.text}`}>
              {vaccinationStatusInfo.icon}
              <span>{vaccinationStatusInfo.text}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="w-full sm:w-auto">
          <Button
            variant="default"
            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            onClick={() => window.location.href = `/appointment/${appointment.id}`}
            aria-label="ดูรายละเอียด"
          >
            รายละเอียด
          </Button>
        </motion.div>
        {attr.status !== 'cancelled' && !isPast && (
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold text-[var(--destructive)] border-[var(--border)] hover:bg-[var(--destructive)]/10 transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              onClick={() => onCancel(appointment)}
              aria-label="ยกเลิกนัด"
            >
              ยกเลิก
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// SegmentedControl Component
const SegmentedControl = ({ tabs, selectedTab, onTabChange }) => {
  const tabRefs = useRef(tabs.map(() => React.createRef()));
  const [tabWidths, setTabWidths] = useState(tabs.map(() => 0));

  useEffect(() => {
    const updateWidths = () => {
      const widths = tabRefs.current.map(ref => ref.current?.offsetWidth || 0);
      setTabWidths(widths);
    };
    updateWidths();
    window.addEventListener('resize', updateWidths);
    return () => window.removeEventListener('resize', updateWidths);
  }, []);

  const selectedIndex = tabs.findIndex(tab => tab.id === selectedTab);
  const xPosition = tabWidths.slice(0, selectedIndex).reduce((sum, width) => sum + width, 0) + 0.5;

  return (
    <div className="relative flex w-full max-w-[90vw] sm:max-w-md mx-auto p-0.5 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] shadow-sm">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={tabRefs.current[index]}
          onClick={() => onTabChange(tab.id)}
          className={`relative z-10 w-full py-2 text-sm font-semibold rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${
            selectedTab === tab.id
              ? 'text-[var(--primary-foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'
          }`}
          aria-label={tab.label}
        >
          {tab.label}
        </button>
      ))}
      <motion.div
        layoutId="segmented-control-active-bg"
        className="absolute top-0.5 h-[calc(100%-4px)] rounded-lg bg-[var(--primary)] shadow-md"
        animate={{ x: xPosition, width: tabWidths[selectedIndex] - 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </div>
  );
};

// TimeFilterControls Component
const TimeFilterControls = ({ filters, selectedFilter, onFilterChange, disabled }) => (
  <div className="flex justify-center gap-2">
    {filters.map(filter => (
      <motion.div key={filter.id} variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          onClick={() => !disabled && onFilterChange(filter.id)}
          variant={selectedFilter === filter.id ? 'default' : 'outline'}
          disabled={disabled}
          className={`w-full sm:w-auto px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ${
            selectedFilter === filter.id
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
              : 'text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--muted)]/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={filter.label}
        >
          {filter.label}
        </Button>
      </motion.div>
    ))}
  </div>
);

// EmptyState Component
const EmptyState = ({ icon, title, text }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-6 px-4 rounded-xl bg-[var(--muted)]/20 border border-[var(--border)] shadow-sm"
  >
    <div className="mx-auto h-12 w-12 text-[var(--muted-foreground)]">
      <FontAwesomeIcon icon={icon} className="h-12 w-12" />
    </div>
    <h3 className="mt-3 text-base font-semibold text-[var(--card-foreground)]">{title}</h3>
    <p className="mt-2 text-sm text-[var(--muted-foreground)]">{text}</p>
  </motion.div>
);

export default function AppointmentClient() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('active');
  const [timeFilter, setTimeFilter] = useState('upcoming');
  const [mounted, setMounted] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false });
  const [currentPage, setCurrentPage] = useState(1);
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light'); // บังคับใช้ Light Mode สำหรับ Patient
    setMounted(true);
    fetchAppointments();
  }, [setTheme]);

  useEffect(() => {
    const currentList = selectedTab === 'active' ? categorizedAppointments[timeFilter] : categorizedAppointments[selectedTab];
    const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
    if (totalPages === 0) {
      setCurrentPage(1);
    } else if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [selectedTab, timeFilter, appointments]);

  const showDialog = (options) => setDialog({ isOpen: true, ...options });
  const hideDialog = () => setDialog({ isOpen: false });

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const jwt = sessionStorage.getItem('jwt');
      const userId = sessionStorage.getItem('userId');
      if (!jwt || !userId) {
        throw new Error('กรุณาเข้าสู่ระบบ: ข้อมูลการยืนยันตัวตนไม่ครบ');
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings?populate[vaccine]=*&populate[patient]=*&populate[users_permissions_user]=*&filters[users_permissions_user][id][$eq]=${userId}&sort=bookingDate:desc&pagination[pageSize]=100`,
        { headers: { Authorization: `Bearer ${jwt}` }, cache: 'no-cache' }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`ไม่สามารถโหลดข้อมูลใบนัดได้: ${errorData.error?.message || res.statusText}`);
      }

      const result = await res.json();
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('ข้อมูลใบนัดไม่ถูกต้อง');
      }

      const normalizedData = result.data.map(app => ({
        id: app.id,
        attributes: {
          bookingDate: app.bookingDate || app.attributes?.bookingDate,
          startTime: app.startTime || app.attributes?.startTime,
          endTime: app.endTime || app.attributes?.endTime,
          status: app.booking_status || app.attributes?.booking_status || 'confirmed',
          vaccination_status: app.vaccination_status || app.attributes?.vaccination_status || 'not_started',
          vaccine: app.vaccine
            ? { data: { id: app.vaccine.id, attributes: app.vaccine } }
            : app.attributes?.vaccine || null,
          patient: app.patient
            ? { data: { id: app.patient.id, attributes: app.patient } }
            : app.attributes?.patient || null,
          users_permissions_user: app.users_permissions_user
            ? { data: { id: app.users_permissions_user.id, attributes: app.users_permissions_user } }
            : app.attributes?.users_permissions_user || null,
        },
      }));

      setAppointments(normalizedData);
    } catch (error) {
      showDialog({
        title: 'เกิดข้อผิดพลาด',
        text: error.message.includes('เข้าสู่ระบบ')
          ? 'กรุณาเข้าสู่ระบบใหม่เพื่อดูใบนัดของคุณ'
          : `ไม่สามารถโหลดข้อมูลใบนัดได้: ${error.message}`,
        icon: 'error',
        buttons: [
          {
            text: 'เข้าสู่ระบบ',
            onClick: () => {
              hideDialog();
              sessionStorage.removeItem('jwt');
              sessionStorage.removeItem('userId');
              window.location.href = '/login';
            },
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const proceedWithCancel = async (app) => {
    hideDialog();
    try {
      const jwt = sessionStorage.getItem('jwt');
      if (!jwt) throw new Error('กรุณาเข้าสู่ระบบ');
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: { booking_status: 'cancelled' } }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`ไม่สามารถยกเลิกใบนัดได้: ${errorData.error?.message || res.statusText}`);
      }

      showDialog({
        title: 'ยกเลิกสำเร็จ',
        text: `นัด "${app.attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ'}" วันที่ ${dayjs(app.attributes.bookingDate).format('D MMM BBBB')} ถูกยกเลิก`,
        icon: 'success',
        buttons: [{ text: 'ตกลง', onClick: hideDialog }],
      });
      fetchAppointments();
    } catch (error) {
      showDialog({
        title: 'เกิดข้อผิดพลาด',
        text: `ไม่สามารถยกเลิก: ${error.message}`,
        icon: 'error',
        buttons: [{ text: 'ตกลง', onClick: hideDialog }],
      });
    }
  };

  const handleCancel = (app) => showDialog({
    title: 'ยืนยันการยกเลิก',
    text: `ยกเลิกนัด "${app.attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ'}" วันที่ ${dayjs(app.attributes.bookingDate).format('D MMM BBBB')}?`,
    icon: 'warning',
    buttons: [
      { text: 'ยืนยัน', onClick: () => proceedWithCancel(app), variant: 'destructive' },
      { text: 'ปิด', onClick: hideDialog },
    ],
  });

  const handleTabChange = (tabId) => {
    setSelectedTab(tabId);
    if (tabId === 'active') {
      setTimeFilter('upcoming');
    }
    setCurrentPage(1);
  };

  const categorizedAppointments = useMemo(() => {
    const today = dayjs().tz('Asia/Bangkok').startOf('day');
    const validApps = appointments.filter(app => {
      const attr = app.attributes || {};
      const hasRequiredFields = attr.bookingDate && attr.status;
      const isValidDate = attr.bookingDate ? dayjs(attr.bookingDate).isValid() : false;
      return hasRequiredFields && isValidDate;
    });
    const cancelled = validApps
      .filter(app => app.attributes.status === 'cancelled')
      .sort((a, b) => dayjs(b.attributes.bookingDate).diff(dayjs(a.attributes.bookingDate)));
    const active = validApps.filter(app => app.attributes.status !== 'cancelled');
    return {
      todays: active.filter(app => dayjs(app.attributes.bookingDate).tz('Asia/Bangkok').isSame(today, 'day')),
      upcoming: active
        .filter(app => dayjs(app.attributes.bookingDate).tz('Asia/Bangkok').isAfter(today, 'day'))
        .sort((a, b) => dayjs(a.attributes.bookingDate).diff(dayjs(b.attributes.bookingDate))),
      past: active
        .filter(app => dayjs(app.attributes.bookingDate).tz('Asia/Bangkok').isBefore(today, 'day'))
        .sort((a, b) => dayjs(b.attributes.bookingDate).diff(dayjs(a.attributes.bookingDate))),
      cancelled: cancelled,
    };
  }, [appointments]);

  const timeFilters = [
    { id: 'upcoming', label: 'ใบนัดล่วงหน้า' },
    { id: 'todays', label: 'ใบนัดวันนี้' },
    { id: 'past', label: 'ใบนัดที่ผ่านมา' },
  ];

  const currentList = selectedTab === 'active' ? categorizedAppointments[timeFilter] : categorizedAppointments[selectedTab];
  const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
  const paginatedList = currentList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasActiveAppointments = categorizedAppointments.todays.length > 0 || categorizedAppointments.upcoming.length > 0 || categorizedAppointments.past.length > 0;

  if (!mounted) return <div className="min-h-screen bg-[var(--background)]" />;

  return (
    <main className="min-h-screen bg-[var(--background)] font-prompt overflow-x-hidden">
      <CustomDialog {...dialog} onClose={hideDialog} />
      <div className="w-full max-w-[90vw] sm:max-w-2xl lg:max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <motion.div initial="hidden" animate="visible" variants={containerVariants}>
          <motion.header variants={itemVariants} className="text-left mb-6 sm:mb-8 rounded-xl bg-[var(--muted)]/20 p-4 sm:p-6 shadow-md">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--card-foreground)] tracking-tight">ใบนัดของฉัน</h1>
            <p className="mt-2 text-sm sm:text-base text-[var(--muted-foreground)]">จัดการและตรวจสอบการนัดหมายของคุณอย่างง่ายดาย</p>
          </motion.header>

          <motion.div variants={itemVariants} className="mb-6 sm:mb-8 sticky top-0 z-10 bg-[var(--background)] py-2 sm:py-3">
            <SegmentedControl
              tabs={[
                { id: 'active', label: 'ใบนัดที่ใช้งาน' },
                { id: 'cancelled', label: 'ใบนัดที่ยกเลิก' },
              ]}
              selectedTab={selectedTab}
              onTabChange={handleTabChange}
            />
          </motion.div>

          {selectedTab === 'active' && (
            <motion.div variants={itemVariants} className="mb-6 sm:mb-8 sticky top-[3.5rem] sm:top-[4rem] lg:top-[5rem] z-10 bg-[var(--background)] py-2 sm:py-3">
              <TimeFilterControls
                filters={timeFilters}
                selectedFilter={timeFilter}
                onFilterChange={setTimeFilter}
                disabled={selectedTab !== 'active'}
              />
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedTab}-${timeFilter}`}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4"
            >
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                    <div key={index} className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-md animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-[var(--muted)]/30"></div>
                        <div className="flex-grow space-y-1.5">
                          <div className="h-5 w-3/4 bg-[var(--muted)]/30 rounded"></div>
                          <div className="h-4 w-1/2 bg-[var(--muted)]/30 rounded"></div>
                          <div className="flex gap-2">
                            <div className="h-4 w-24 bg-[var(--muted)]/30 rounded-full"></div>
                            <div className="h-4 w-24 bg-[var(--muted)]/30 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {selectedTab === 'active' && !hasActiveAppointments && (
                    <EmptyState
                      icon={faCalendarDays}
                      title="ไม่มีนัดหมาย"
                      text="คุณยังไม่มีใบนัดที่ใช้งาน กรุณาตรวจสอบการเข้าสู่ระบบหรือสร้างนัดหมายใหม่"
                    />
                  )}
                  {selectedTab === 'cancelled' && categorizedAppointments.cancelled.length === 0 && (
                    <EmptyState icon={faBoxArchive} title="ไม่มีนัดที่ยกเลิก" text="ใบนัดที่ยกเลิกจะแสดงที่นี่" />
                  )}

                  {paginatedList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                      {paginatedList.map(app => (
                        <AppointmentCard
                          key={app.id}
                          appointment={app}
                          onCancel={handleCancel}
                        />
                      ))}
                      <div className="col-span-full">
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                      </div>
                    </div>
                  ) : (
                    selectedTab === 'active' && hasActiveAppointments && (
                      <EmptyState
                        icon={faCalendarDays}
                        title="ไม่พบใบนัด"
                        text={`ไม่มีใบนัด${timeFilters.find(f => f.id === timeFilter)?.label} กรุณาตรวจสอบข้อมูลหรือลองเปลี่ยนตัวกรอง`}
                      />
                    )
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}