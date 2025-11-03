'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import 'dayjs/locale/th';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilter,
  faChevronDown,
  faChevronUp,
  faArrowRotateRight,
  faChild,
  faCalendarDays,
  faClock,
  faVenusMars,
  faMagnifyingGlass,
  faXmark,
  faTriangleExclamation,
  faCalendarWeek,
  faCalendar,
} from '@fortawesome/free-solid-svg-icons';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import axios from 'axios';
import { cn } from '@/lib/utils';

// --- DayJS Setup ---
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.tz.setDefault('Asia/Bangkok');
dayjs.locale('th');

// --- Day Names Array ---
const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 15,
      duration: 0.6,
    },
  },
};

const buttonVariants = {
  hover: { 
    scale: 1.02, 
    boxShadow: '0 4px 12px rgba(178, 123, 110, 0.15)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  tap: { scale: 0.98 },
};

// --- InfoItem Component ---
const InfoItem = ({ icon, label, value, isWarning, warningText, isLongText }) => (
  <motion.div
    variants={itemVariants}
    className={cn(
      "flex items-start gap-2 p-2 rounded-lg bg-[var(--secondary-light)]/50 border border-[var(--border)] hover:bg-[var(--secondary-light)] transition-all duration-300 cursor-pointer group",
      isLongText && "flex-col items-start"
    )}
    whileHover={{ y: -1, scale: 1.01 }}
  >
    <div className={cn(
      "flex-shrink-0 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white p-1.5 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-300",
      isLongText && "w-full flex justify-center"
    )}>
      <FontAwesomeIcon icon={icon} className="w-3 h-3 sm:w-4 sm:h-4" />
    </div>
    <div className={cn(
      "flex-1 min-w-0",
      isLongText && "w-full text-center"
    )}>
      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{label}</p>
      <p className={`text-xs sm:text-sm font-medium ${isWarning ? 'text-red-500' : 'text-[var(--foreground)'} mt-1 ${isLongText ? 'break-words' : ''}`}>
        {value}
      </p>
      {isWarning && warningText && (
        <p className="text-xs text-red-500 mt-1">{warningText}</p>
      )}
    </div>
  </motion.div>
);

// --- VaccineCard Component ---
const VaccineCard = ({ vaccine, onBook, isLoading }) => {
  const remaining = Math.max(vaccine.attributes.maxQuota - vaccine.attributes.booked, 0);
  const progress = vaccine.attributes.maxQuota > 0 ? (vaccine.attributes.booked / vaccine.attributes.maxQuota) * 100 : 0;

  const serviceDays = vaccine.attributes.serviceDays || [];
  const hasValidServiceDays = vaccine.attributes.hasValidServiceDays;
  const uniqueServiceDays = [...new Set(serviceDays)].sort((a, b) => a - b);
  const isEveryDay = uniqueServiceDays.length === 7 && uniqueServiceDays.every((d, i) => d === i);

  const hasValidServiceTime = vaccine.attributes.hasValidServiceTime;
  const serviceTime = hasValidServiceTime ? `${vaccine.attributes.serviceStartTime} - ${vaccine.attributes.serviceEndTime}` : 'ไม่ระบุ';


  const formatShortDate = (date) => date && dayjs(date).isValid() ? dayjs(date).tz('Asia/Bangkok').add(543, 'year').format('D MMM') : 'ไม่ระบุ';
  const formatBookingPeriod = () => {
    const start = formatShortDate(vaccine.attributes.bookingStart);
    const end = formatShortDate(vaccine.attributes.bookingEnd);
    const startYear = vaccine.attributes.bookingStart && dayjs(vaccine.attributes.bookingStart).isValid() ? dayjs(vaccine.attributes.bookingStart).tz('Asia/Bangkok').add(543, 'year').format('YYYY') : '';
    const endYear = vaccine.attributes.bookingEnd && dayjs(vaccine.attributes.bookingEnd).isValid() ? dayjs(vaccine.attributes.bookingEnd).tz('Asia/Bangkok').add(543, 'year').format('YYYY') : '';
    
    if (startYear === endYear) {
      return `${start} - ${end} ${startYear}`;
    }
    return `${start} ${startYear} - ${end} ${endYear}`;
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="relative w-full min-h-[280px] sm:min-h-[320px] flex flex-col overflow-hidden rounded-xl sm:rounded-2xl bg-[var(--card)] border border-[var(--border)] shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
        <CardHeader className="pt-3 px-3 sm:pt-4 sm:px-4 pb-2 sm:pb-3">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base sm:text-lg font-bold text-[var(--card-foreground)] line-clamp-2 leading-tight">
              {vaccine.attributes.name}
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              {(!vaccine.attributes.hasValidServiceDays) && (
                <Badge className="bg-red-50 text-red-600 rounded-lg text-xs font-medium px-2 py-1 flex items-center gap-1">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" />
                  ข้อมูลวันไม่สมบูรณ์
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1 sm:mt-2 line-clamp-2">{vaccine.attributes.description}</p>
        </CardHeader>
        <CardContent className="px-3 py-2 sm:px-4 sm:py-3 flex-grow">
          <div className="mb-3 sm:mb-4">
            <div className="flex justify-between text-xs sm:text-sm text-[var(--card-foreground)] mb-2">
              <span>จองแล้ว {vaccine.attributes.booked.toLocaleString()}</span>
              <span>เหลือ {remaining.toLocaleString()}</span>
            </div>
            <div className="w-full bg-[var(--secondary-light)] rounded-full h-1.5 sm:h-2 overflow-hidden">
              <motion.div
                className="h-1.5 sm:h-2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <InfoItem
              icon={faChild}
              label="ช่วงอายุ"
              value={`${vaccine.attributes.minAge} - ${vaccine.attributes.maxAge} ปี`}
            />
            <InfoItem
              icon={faVenusMars}
              label="เพศ"
              value={vaccine.attributes.gender === 'male' ? 'ชาย' : vaccine.attributes.gender === 'female' ? 'หญิง' : 'ทุกเพศ'}
            />
            <InfoItem
              icon={faClock}
              label="เวลาบริการ"
              value={serviceTime}
            />
            <InfoItem
              icon={faCalendarWeek}
              label="วันบริการ"
              value={isEveryDay ? 'ทุกวัน' : uniqueServiceDays.map(d => dayNames[d]).join(' ') || 'ไม่ระบุ'}
              isWarning={!hasValidServiceDays}
              warningText="ไม่มีข้อมูลวันบริการ"
            />
            <div className="sm:col-span-2">
              <InfoItem
                icon={faCalendarDays}
                label="ช่วงจอง"
                value={formatBookingPeriod()}
                isLongText={true}
              />
            </div>
          </div>
        </CardContent>
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
            <Button
              onClick={() => onBook(vaccine)}
              className={cn(
                'w-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] hover:from-[var(--accent)] hover:to-[var(--primary)] rounded-lg sm:rounded-xl py-2 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300',
                isLoading || remaining === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
              disabled={isLoading || remaining === 0}
              aria-label={`จองวัคซีน ${vaccine.attributes.name}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <motion.div
                    className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full mr-1 sm:mr-2"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  />
                  กำลังโหลด...
                </div>
              ) : (
                'ดำเนินต่อ'
              )}
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};

// --- Main Component ---
export default function VaccineList() {
  const { resolvedTheme, setTheme } = useTheme();
  const [patient, setPatient] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buttonLoading, setButtonLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [ageMinFilter, setAgeMinFilter] = useState('');
  const [ageMaxFilter, setAgeMaxFilter] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [genderFilter, setGenderFilter] = useState('any');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [dateRangeStart, setDateRangeStart] = useState();
  const [dateRangeEnd, setDateRangeEnd] = useState();
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const itemsPerPage = 6;

  const router = useRouter();
  const socketRef = useRef(null);
  const MySwal = withReactContent(Swal);

  useEffect(() => {
    setTheme('light'); 
  }, [setTheme]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const jwt = sessionStorage.getItem('jwt');
      if (!jwt) {
        sessionStorage.clear();
        window.dispatchEvent(new Event('session-updated'));
        router.replace('/login', { scroll: false });
        return;
      }

      const userRes = await axios.get(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
        {
          headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
          timeout: 5000,
        }
      );

      const userData = userRes.data;
      const parsedUserId = userData.id;
      if (!parsedUserId || isNaN(parsedUserId) || parsedUserId <= 0) {
        throw new Error(`Invalid userId from API: ${parsedUserId}`);
      }

      const role = userData.role?.name?.toLowerCase();
      const validRoles = ['patient', 'authenticated'];
      if (!role || !validRoles.includes(role)) {
        throw new Error(`ต้องมีบทบาทเป็นผู้ป่วยเพื่อดูรายการวัคซีน (role พบ: ${role || 'ไม่มี role'})`);
      }

      sessionStorage.setItem('userRole', role);
      sessionStorage.setItem('username', userData.username || 'ผู้ใช้');
      sessionStorage.setItem('userId', parsedUserId.toString());

      const patientRes = await axios.get(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${parsedUserId}&populate=user`,
        {
          headers: { Authorization: `Bearer ${jwt}`, 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
          timeout: 5000,
        }
      );

      const patientData = patientRes.data;
      const patientList = patientData.data || patientData;
      const hasPatient = Array.isArray(patientList) && patientList.length > 0;

      if (!hasPatient) {
        setPatient(null);
        sessionStorage.removeItem('patientId');
        await MySwal.fire({
          icon: 'warning',
          title: 'ไม่พบข้อมูลผู้ป่วย',
          text: `กรุณาลงทะเบียนข้อมูลผู้ป่วยในหน้าโปรไฟล์ก่อนดูรายการวัคซีน (userId: ${parsedUserId})`,
          showConfirmButton: true,
          confirmButtonText: 'ไปที่หน้าโปรไฟล์',
          customClass: {
            popup: 'rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl w-[90vw] sm:w-full max-w-md',
            title: 'text-base sm:text-lg font-bold text-[var(--card-foreground)]',
            htmlContainer: 'text-xs sm:text-sm text-[var(--muted-foreground)]',
            confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:from-[var(--accent)] hover:to-[var(--primary)] shadow-md text-xs sm:text-sm cursor-pointer',
          },
          background: 'var(--card)',
        }).then((result) => {
          if (result.isConfirmed) {
            router.push('/patient', { scroll: false });
          }
        });
        return;
      }

      let pat = patientList[0];

      if (pat && !pat.attributes) {
        pat = {
          id: pat.id,
          attributes: {
            first_name: pat.first_name || '',
            last_name: pat.last_name || '',
            birth_date: pat.birth_date || null,
            phone: pat.phone || '',
            address: pat.address || '',
            gender: pat.gender || '',
            email: pat.email || '',
            status: pat.status || 'pending',
            createdAt: pat.createdAt || new Date().toISOString(),
            updatedAt: pat.updatedAt || new Date().toISOString(),
            user: pat.user || { id: parsedUserId },
          },
        };
      }

      const patientUserId = pat.attributes?.user?.id || pat.attributes?.user?.data?.id;
      if (!patientUserId || patientUserId !== parsedUserId) {
        throw new Error(`Patient data user ID (${patientUserId}) does not match session userId (${parsedUserId})`);
      }

      if (pat.attributes.status === 'cancelled') {
        setPatient(null);
        sessionStorage.removeItem('patientId');
        await MySwal.fire({
          icon: 'error',
          title: 'ข้อมูลถูกลบ',
          text: 'ข้อมูลผู้ป่วยของคุณถูกลบ โปรดติดต่อเจ้าหน้าที่เพื่อดำเนินการต่อ',
          confirmButtonText: 'ตกลง',
          customClass: {
            popup: 'rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl w-[90vw] sm:w-full max-w-md',
            title: 'text-base sm:text-lg font-bold text-[var(--card-foreground)]',
            htmlContainer: 'text-xs sm:text-sm text-[var(--muted-foreground)]',
            confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:from-[var(--accent)] hover:to-[var(--primary)] shadow-md text-xs sm:text-sm cursor-pointer',
          },
          background: 'var(--card)',
        });
        return;
      }

      const requiredFields = ['first_name', 'last_name', 'birth_date', 'gender'];
      const missingFields = requiredFields.filter((field) => !pat.attributes[field]);
      if (missingFields.length > 0) {
        setPatient(null);
        sessionStorage.removeItem('patientId');
        await MySwal.fire({
          icon: 'warning',
          title: 'ข้อมูลผู้ป่วยไม่ครบถ้วน',
          text: `กรุณากรอกข้อมูลที่จำเป็น (${missingFields.join(', ')}) ในหน้าโปรไฟล์ก่อนดูรายการวัคซีน`,
          showConfirmButton: true,
          confirmButtonText: 'ไปที่หน้าโปรไฟล์',
          customClass: {
            popup: 'rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl w-[90vw] sm:w-full max-w-md',
            title: 'text-base sm:text-lg font-bold text-[var(--card-foreground)]',
            htmlContainer: 'text-xs sm:text-sm text-[var(--muted-foreground)]',
            confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:from-[var(--accent)] hover:to-[var(--primary)] shadow-md text-xs sm:text-sm cursor-pointer',
          },
          background: 'var(--card)',
        }).then((result) => {
          if (result.isConfirmed) {
            router.push('/patient', { scroll: false });
          }
        });
        return;
      }

      if (pat.attributes.status !== 'confirmed') {
        setPatient(null);
        sessionStorage.removeItem('patientId');
        await MySwal.fire({
          icon: 'warning',
          title: 'สถานะผู้ป่วยไม่ได้รับการยืนยัน',
          text: 'กรุณายืนยันสถานะผู้ป่วยในหน้าโปรไฟล์ก่อนดูรายการวัคซีน',
          showConfirmButton: true,
          confirmButtonText: 'ไปที่หน้าโปรไฟล์',
          customClass: {
            popup: 'rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl w-[90vw] sm:w-full max-w-md',
            title: 'text-base sm:text-lg font-bold text-[var(--card-foreground)]',
            htmlContainer: 'text-xs sm:text-sm text-[var(--muted-foreground)]',
            confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:from-[var(--accent)] hover:to-[var(--primary)] shadow-md text-xs sm:text-sm cursor-pointer',
          },
          background: 'var(--card)',
        }).then((result) => {
          if (result.isConfirmed) {
            router.push('/patient', { scroll: false });
          }
        });
        return;
      }

      const birthDate = pat.attributes.birth_date;
      const age = birthDate && dayjs(birthDate).isValid() ? Math.floor(dayjs().tz('Asia/Bangkok').diff(dayjs(birthDate), 'year', true)) : 0;
      let gender = (pat.attributes.gender || 'any').toLowerCase();
      if (!['male', 'female'].includes(gender)) gender = 'any';

      setPatient({ id: pat.id, age, gender });

      const vacRes = await axios.get(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?populate[vaccine_service_days]=day_of_week&populate[vaccine_time_slots]=time&populate[booking_settings]=name,max_quota&pagination[pageSize]=50`,
        {
          headers: { Authorization: `Bearer ${jwt}` },
          timeout: 5000,
        }
      );

      const vacJson = vacRes.data;
      const vaccineList = vacJson.data || vacJson;

      if (!Array.isArray(vaccineList)) {
        throw new Error('โครงสร้างข้อมูลวัคซีนที่ได้รับไม่ถูกต้อง');
      }

      const formatTime = (t) => {
        if (!t || typeof t !== 'string') return null;
        const match = t.match(/^([0-1][0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?(\.\d{3})?$/);
        return match ? match[0].slice(0, 5) : null;
      };

      const vacs = vaccineList
        .filter((v) => {
          const a = v.attributes || {};
          const hasValidBookingDates = a.bookingStartDate && a.bookingEndDate && dayjs(a.bookingStartDate).isValid() && dayjs(a.bookingEndDate).isValid();
          const hasValidMinAge = a.minAge != null && !isNaN(a.minAge);
          const hasValidMaxAge = a.maxAge != null && !isNaN(a.maxAge);
          const hasValidGender = ['male', 'female', 'any'].includes((a.gender || '').toLowerCase());
          const hasValidServiceTime = formatTime(a.serviceStartTime) && formatTime(a.serviceEndTime);
          return hasValidBookingDates && hasValidMinAge && hasValidMaxAge && hasValidGender && hasValidServiceTime;
        })
        .map((v) => {
          const a = v.attributes || {};
          const serviceDays = a.vaccine_service_days?.data?.flatMap(d => d.attributes.day_of_week).filter(d => d != null) || [];
          const uniqueServiceDays = [...new Set(serviceDays)].sort((a, b) => a - b);
          const hasValidServiceDays = serviceDays.length > 0;

          let vaccineGender = (a.gender || 'any').toLowerCase();

          const bs = Array.isArray(a.booking_settings?.data) && a.booking_settings.data[0]?.attributes ? a.booking_settings.data[0].attributes : {};

          const timeSlots = Array.isArray(a.vaccine_time_slots?.data)
            ? a.vaccine_time_slots.data.map((slot) => ({
                id: slot.id,
                attributes: {
                  startTime: formatTime(slot.attributes.startTime),
                  endTime: formatTime(slot.attributes.endTime),
                  quota: slot.attributes.quota ?? 0,
                  is_enabled: slot.attributes.is_enabled ?? true,
                },
              }))
            : [];

          return {
            id: v.id,
            attributes: {
              name: a.title || `ไม่มีชื่อ (ID: ${v.id})`,
              description: a.description || 'ไม่มีคำอธิบาย',
              bookingStart: dayjs(a.bookingStartDate),
              bookingEnd: dayjs(a.bookingEndDate),
              minAge: a.minAge,
              maxAge: a.maxAge,
              gender: vaccineGender,
              maxQuota: a.maxQuota ?? Infinity,
              booked: a.booked ?? 0,
              serviceDays,
              serviceStartTime: formatTime(a.serviceStartTime),
              serviceEndTime: formatTime(a.serviceEndTime),
              useTimeSlots: a.useTimeSlots ?? false,
              cutoffMinutesBeforeSlot: bs.preventLastMinuteMinutes ?? 0,
              advanceBookingDays: bs.advanceBookingDays ?? 30,
              vaccine_service_days: a.vaccine_service_days?.data || [],
              vaccine_time_slots: timeSlots,
              booking_settings: Array.isArray(a.booking_settings?.data) && a.booking_settings.data.length ? [{ attributes: { ...bs, is_enabled: bs.is_enabled ?? false } }] : [],
              hasValidServiceDays,
              hasValidServiceTime: true,
              hasValidMinAge: true,
              hasValidMaxAge: true,
              hasValidGender: true,
              hasValidBookingDates: true,
            },
          };
        });

      setVaccines(vacs);
    } catch (error) {
      let errorMessage = 'ไม่สามารถโหลดข้อมูลได้';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error?.message || error.message;
        if (error.response?.status === 401) {
          sessionStorage.clear();
          window.dispatchEvent(new Event('session-updated'));
          router.replace('/login', { scroll: false });
          return;
        }
      }
      await MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: errorMessage,
        confirmButtonText: 'ตกลง',
        customClass: {
          popup: 'rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl w-[90vw] sm:w-full max-w-md',
          title: 'text-base sm:text-lg font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-xs sm:text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:from-[var(--accent)] hover:to-[var(--primary)] shadow-md text-xs sm:text-sm cursor-pointer',
        },
        background: 'var(--card)',
      });
      setError(`เกิดข้อผิดพลาดในการโหลดข้อมูล: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    resetFilters();
    loadData();
  }, [loadData]);

  useEffect(() => {
    const socketUrl = typeof window !== 'undefined' ? 'http://localhost:4000' : 'http://strapi:4000';
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect_error', () => {
      MySwal.fire({
        icon: 'warning',
        title: 'การเชื่อมต่อล้มเหลว',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์อัปเดตข้อมูล กรุณารีเฟรชหน้า',
        confirmButtonText: 'ตกลง',
        customClass: {
          popup: 'rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl w-[90vw] sm:w-full max-w-md',
          title: 'text-base sm:text-lg font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-xs sm:text-sm text-[var(--muted-foreground)]',
          confirmButton: 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium hover:from-[var(--accent)] hover:to-[var(--primary)] shadow-md text-xs sm:text-sm cursor-pointer',
        },
        background: 'var(--card)',
      });
    });

    socketRef.current.on('vaccine_updated', loadData);

    return () => {
      socketRef.current.off('vaccine_updated', loadData);
      socketRef.current.disconnect();
    };
  }, [loadData]);

  useEffect(() => {
    setButtonLoading({});
  }, [currentPage]);

  const filteredVaccines = useMemo(() => {
    if (!patient) return [];
    const term = searchTerm.trim().toLowerCase();
    const minAge = ageMinFilter ? +ageMinFilter : null;
    const maxAge = ageMaxFilter ? +ageMaxFilter : null;
    const now = dayjs().tz('Asia/Bangkok');

    return vaccines.filter((v) => {
      const matchPatientAge = patient.age >= v.attributes.minAge && patient.age <= v.attributes.maxAge;
      const matchPatientGender = v.attributes.gender === 'any' || v.attributes.gender === patient.gender;
      const matchSearch =
        v.attributes.name.toLowerCase().includes(term) || v.attributes.description.toLowerCase().includes(term);
      const ageOverlap =
        minAge !== null && maxAge !== null
          ? !(v.attributes.maxAge < minAge || v.attributes.minAge > maxAge)
          : minAge !== null
          ? v.attributes.maxAge >= minAge
          : maxAge !== null
          ? v.attributes.minAge <= maxAge
          : true;
      const weekdayMatch =
        selectedWeekdays.length === 0 ||
        v.attributes.serviceDays.length === 0 ||
        selectedWeekdays.some((d) => v.attributes.serviceDays.includes(d));
      const genderMatch = genderFilter === 'any' || v.attributes.gender === 'any' || v.attributes.gender === genderFilter;
      
      // Date range filter
      const dateRangeMatch = 
        (!dateRangeStart || v.attributes.bookingStart.isSameOrAfter(dateRangeStart, 'day')) &&
        (!dateRangeEnd || v.attributes.bookingEnd.isSameOrBefore(dateRangeEnd, 'day'));

      return matchPatientAge && matchPatientGender && matchSearch && ageOverlap && weekdayMatch && genderMatch && dateRangeMatch;
    });
  }, [vaccines, patient, searchTerm, ageMinFilter, ageMaxFilter, selectedWeekdays, genderFilter, dateRangeStart, dateRangeEnd]);

  const isAvailable = (v) => {
    const now = dayjs().tz('Asia/Bangkok');
    const bs = v.attributes.booking_settings?.[0]?.attributes || {};
    const remaining = Math.max(v.attributes.maxQuota - v.attributes.booked, 0);

    if (!bs.is_enabled) {
      return false;
    }

    if (remaining <= 0) {
      return false;
    }

    const advanceStartDate = v.attributes.bookingStart.subtract(bs.advanceBookingDays || 0, 'day').startOf('day');
    if (!now.isSameOrAfter(advanceStartDate) || !now.isSameOrBefore(v.attributes.bookingEnd.endOf('day'))) {
      return false;
    }

    if (now.isSameOrAfter(v.attributes.bookingStart.startOf('day'))) {
      const [sh, sm] = v.attributes.serviceStartTime.split(':').map(Number);
      const [eh, em] = v.attributes.serviceEndTime.split(':').map(Number);
      const startTime = now.clone().hour(sh).minute(sm).second(0);
      const endTime = now.clone().hour(eh).minute(em).second(59);
      const preventMins = bs.preventLastMinuteMinutes || 0;
      const lastMinuteCutoff = endTime.subtract(preventMins, 'minute');

      if (!v.attributes.serviceDays.includes(now.day())) {
        return false;
      }

      if (!now.isSameOrAfter(startTime) || !now.isSameOrBefore(endTime)) {
        return false;
      }

      if (now.isAfter(lastMinuteCutoff)) {
        return false;
      }
    }

    return true;
  };

  const handleBookVaccine = (vaccine) => {
    if (buttonLoading[vaccine.id]) return;

    setButtonLoading((prev) => ({ ...prev, [vaccine.id]: true }));
    setTimeout(() => {
      router.push(`/vaccines/${vaccine.id}`);
      setButtonLoading((prev) => ({ ...prev, [vaccine.id]: false }));
    }, 300);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const availableVaccines = useMemo(() => {
    const available = filteredVaccines.filter(isAvailable);
    const sorted = [...available].sort((a, b) => {
      const valA = a.attributes[sortBy];
      const valB = b.attributes[sortBy];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
    return sorted;
  }, [filteredVaccines, sortBy, sortOrder]);

  const pagedVaccines = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return availableVaccines.slice(start, start + itemsPerPage);
  }, [availableVaccines, currentPage]);

  const resetFilters = () => {
    setSearchTerm('');
    setAgeMinFilter('');
    setAgeMaxFilter('');
    setSelectedWeekdays([]);
    setGenderFilter('any');
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
    setShowFilters(false);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(availableVaccines.length / itemsPerPage);
  const activeFiltersCount = [
    searchTerm,
    ageMinFilter,
    ageMaxFilter,
    genderFilter !== 'any',
    selectedWeekdays.length > 0,
    dateRangeStart,
    dateRangeEnd,
  ].filter(Boolean).length;

  if (error) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[var(--secondary-light)] to-[var(--background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-[90vw] sm:max-w-[400px] w-full bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-xl sm:rounded-2xl">
          <CardContent className="text-center py-6 sm:py-8">
            <h3 className="text-base sm:text-lg font-bold text-[var(--card-foreground)]">เกิดข้อผิดพลาด</h3>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-2">{error}</p>
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                onClick={loadData}
                className="mt-3 sm:mt-4 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] hover:from-[var(--accent)] hover:to-[var(--primary)] rounded-lg sm:rounded-xl py-2 sm:py-3 px-4 sm:px-6 font-medium shadow-md text-xs sm:text-sm cursor-pointer"
              >
                ลองใหม่
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!vaccines.length && !loading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[var(--secondary-light)] to-[var(--background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-[90vw] sm:max-w-[400px] w-full bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-xl sm:rounded-2xl">
          <CardContent className="text-center py-6 sm:py-8">
            <h3 className="text-base sm:text-lg font-bold text-[var(--card-foreground)]">ไม่มีวัคซีนในระบบ</h3>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-2">
              ขณะนี้ไม่มีวัคซีนที่สามารถจองได้ กรุณาตรวจสอบอีกครั้งในภายหลัง
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      {loading && (
        <motion.div
          className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[var(--secondary-light)] to-[var(--background)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-8 h-8 sm:w-10 sm:h-10 border-4 rounded-full border-[var(--secondary-light)] border-t-[var(--primary)]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-[var(--foreground)]">กำลังโหลด...</p>
        </motion.div>
      )}
      <motion.main
        className={`max-w-6xl lg:max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 ${loading ? 'hidden' : ''}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="min-h-screen bg-gradient-to-br from-[var(--secondary-light)] to-[var(--background)]">
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="text-center mb-6 sm:mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text">
              รายการวัคซีน
            </h1>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1 sm:mt-2">
              เลือกและจองวัคซีนที่เหมาะสมสำหรับคุณ
            </p>
          </motion.div>

          {/* Search and Filter Section */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8"
          >
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="ค้นหาวัคซีน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-3 text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg sm:rounded-xl focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all duration-200 shadow-sm w-full"
                aria-label="ค้นหาวัคซีน"
              />
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="w-3 h-3 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--primary)] p-1 h-auto"
                  aria-label="ล้างการค้นหา"
                >
                  <FontAwesomeIcon icon={faXmark} className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>

            <div className="relative w-full sm:w-auto">
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button
                  variant="outline"
                  className={cn(
                    'flex justify-between items-center w-full sm:w-28 lg:w-32 bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary-light)] hover:text-[var(--primary)] transition-all duration-200 rounded-lg sm:rounded-xl shadow-sm py-2 sm:py-3 px-3 sm:px-4'
                  )}
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                  aria-controls="filter-panel-content"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FontAwesomeIcon icon={faFilter} className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)]" />
                    <span className="text-xs sm:text-sm font-medium text-[var(--foreground)]">ตัวกรอง</span>
                    {activeFiltersCount > 0 && (
                      <Badge className="bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </div>
                  {showFilters ? (
                    <FontAwesomeIcon icon={faChevronUp} className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)]" />
                  ) : (
                    <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)]" />
                  )}
                </Button>
              </motion.div>

              {showFilters && (
                <motion.div
                  id="filter-panel-content"
                  className="absolute right-0 mt-2 w-full sm:w-80 lg:w-96 bg-[var(--card)] border border-[var(--border)] rounded-lg sm:rounded-xl shadow-lg z-50 overflow-hidden"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1 sm:mb-2">ช่วงอายุ</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="ต่ำสุด"
                          value={ageMinFilter}
                          onChange={(e) => setAgeMinFilter(e.target.value)}
                          min={0}
                          className="text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] py-1.5 sm:py-2 px-2 sm:px-3 shadow-sm"
                          aria-label="อายุต่ำสุด"
                        />
                        <Input
                          type="number"
                          placeholder="สูงสุด"
                          value={ageMaxFilter}
                          onChange={(e) => setAgeMaxFilter(e.target.value)}
                          min={0}
                          className="text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] py-1.5 sm:py-2 px-2 sm:px-3 shadow-sm"
                          aria-label="อายุสูงสุด"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1 sm:mb-2">เพศ</label>
                      <Select value={genderFilter} onValueChange={setGenderFilter}>
                        <SelectTrigger
                          className="text-xs sm:text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] py-1.5 sm:py-2 px-2 sm:px-3 shadow-sm w-full"
                          aria-label="เลือกเพศ"
                        >
                          <SelectValue placeholder="เลือกเพศ" />
                        </SelectTrigger>
                        <SelectContent className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-50">
                          <SelectItem value="any" className="text-xs sm:text-sm">ทุกเพศ</SelectItem>
                          <SelectItem value="male" className="text-xs sm:text-sm">ชาย</SelectItem>
                          <SelectItem value="female" className="text-xs sm:text-sm">หญิง</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1 sm:mb-2">วันให้บริการ</label>
                      <div className="grid grid-cols-4 gap-1 sm:gap-2">
                        {dayNames.map((day, index) => (
                          <label key={index} className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedWeekdays.includes(index)}
                              onChange={() => {
                                setSelectedWeekdays((prev) =>
                                  prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index]
                                );
                              }}
                              className="h-3 w-3 sm:h-4 sm:w-4 text-[var(--primary)] border border-[var(--border)] rounded focus:ring-[var(--primary)]"
                            />
                            <span className="text-[var(--foreground)]">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--foreground)] mb-1 sm:mb-2">ช่วงวันที่</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary-light)] rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 shadow-sm text-xs sm:text-sm",
                                !dateRangeStart && "text-[var(--muted-foreground)]"
                              )}
                            >
                              <FontAwesomeIcon icon={faCalendar} className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                              {dateRangeStart ? dayjs(dateRangeStart).format('D MMM YYYY') : "วันเริ่มต้น"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-[var(--card)] border border-[var(--border)] shadow-lg z-50" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRangeStart}
                              onSelect={(date) => {
                                setDateRangeStart(date);
                                setShowStartCalendar(false);
                              }}
                              initialFocus
                              className="rounded-lg"
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary-light)] rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 shadow-sm text-xs sm:text-sm",
                                !dateRangeEnd && "text-[var(--muted-foreground)]"
                              )}
                            >
                              <FontAwesomeIcon icon={faCalendar} className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                              {dateRangeEnd ? dayjs(dateRangeEnd).format('D MMM YYYY') : "วันสิ้นสุด"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-[var(--card)] border border-[var(--border)] shadow-lg z-50" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRangeEnd}
                              onSelect={(date) => {
                                setDateRangeEnd(date);
                                setShowEndCalendar(false);
                              }}
                              initialFocus
                              className="rounded-lg"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                      <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="w-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--secondary-light)] hover:text-[var(--primary)] rounded-lg sm:rounded-xl py-2 sm:py-3 px-3 sm:px-4 font-medium shadow-sm text-xs sm:text-sm"
                      >
                        <FontAwesomeIcon icon={faArrowRotateRight} className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        รีเซ็ตตัวกรอง
                      </Button>
                    </motion.div>
                  </CardContent>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Sorting and Count */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-[var(--foreground)] mb-6 sm:mb-8"
          >
            <p>พบทั้งหมด {availableVaccines.length} รายการ</p>
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant="ghost"
                onClick={() => toggleSort('name')}
                className="flex items-center gap-2 transition-colors hover:text-[var(--primary)] text-xs sm:text-sm font-medium"
                aria-label={`เรียงตามชื่อ ${sortOrder === 'asc' ? 'จากน้อยไปมาก' : 'จากมากไปน้อย'}`}
              >
                เรียงตามชื่อ {sortOrder === 'asc' ? <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 sm:h-4 sm:w-4" /> : <FontAwesomeIcon icon={faChevronUp} className="h-3 w-3 sm:h-4 sm:w-4" />}
              </Button>
            </motion.div>
          </motion.div>

          {/* Vaccine List */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {pagedVaccines.length === 0 && (
              <Card className="col-span-full bg-[var(--card)] border border-[var(--border)] shadow-lg rounded-lg  sm:rounded-2xl">
                <CardContent className="text-center py-6 sm:py-8">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--card-foreground)]">ไม่มีวัคซีนที่ตรงกับเงื่อนไข</h3>
                  <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-2">
                    กรุณาปรับตัวกรองหรือตรวจสอบข้อมูลผู้ป่วย
                  </p>
                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                    <Button
                      onClick={resetFilters}
                      className="mt-3 sm:mt-4 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] hover:from-[var(--accent)] hover:to-[var(--primary)] rounded-lg sm:rounded-xl py-2 sm:py-3 px-4 sm:px-6 font-medium shadow-md text-xs sm:text-sm cursor-pointer"
                    >
                      รีเซ็ตตัวกรอง
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            )}
            {pagedVaccines.map((vaccine) => (
              <VaccineCard
                key={vaccine.id}
                vaccine={vaccine}
                onBook={handleBookVaccine}
                isLoading={buttonLoading[vaccine.id] || false}
              />
            ))}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              variants={itemVariants}
              className="flex justify-center gap-2 sm:gap-4 mt-6 sm:mt-8"
            >
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    'bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary-light)] hover:text-[var(--primary)] rounded-lg sm:rounded-xl py-2 sm:py-3 px-3 sm:px-4 font-medium shadow-sm text-xs sm:text-sm',
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  )}
                  aria-label="หน้าที่แล้ว"
                >
                  ก่อนหน้า
                </Button>
              </motion.div>
              <span className="flex items-center text-xs sm:text-sm font-medium text-[var(--foreground)]">
                หน้า {currentPage} / {totalPages}
              </span>
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    'bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--secondary-light)] hover:text-[var(--primary)] rounded-lg sm:rounded-xl py-2 sm:py-3 px-3 sm:px-4 font-medium shadow-sm text-xs sm:text-sm',
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  )}
                  aria-label="หน้าถัดไป"
                >
                  ถัดไป
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.main>
    </>
  );
}