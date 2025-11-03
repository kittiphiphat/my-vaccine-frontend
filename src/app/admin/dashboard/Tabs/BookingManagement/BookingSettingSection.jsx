'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDownload, faPlus, faEdit, faTrash, faMagnifyingGlass, faTimes, faChevronDown, 
  faChevronUp, faCalendarCheck, faToggleOn, faToggleOff,
  faInfoCircle, faHourglassHalf, faStopwatch, faSyringe
} from '@fortawesome/free-solid-svg-icons';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Input } from '@/components/ui/input';
import BookingSettingFormCreate from './formcreate/bookingfromcreate';
import BookingSettingForm from './formedit/BookingSettingSectionform';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

const buttonVariants = {
  hover: { scale: 1.05, boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.2)' },
  tap: { scale: 0.95 },
};

const accordionVariants = {
  open: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeInOut' }
  }
};

export default function BookingSettingSection({ setParentData }) {
  const router = useRouter();
  const [bookingSettings, setBookingSettings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  async function validateAuth() {
    const token = sessionStorage.getItem('jwt');
    if (!token) throw new Error('Unauthorized');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      if (res.status !== 200) throw new Error('Unauthorized');
      const data = await res.json();
      const roleName = data?.role?.name?.toLowerCase() || data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase() || null;
      const userId = data?.id || data?.data?.id;

      if (!roleName || !userId) throw new Error('Invalid user data');
      if (roleName !== 'admin') throw new Error('Forbidden: Admin access required');

      sessionStorage.setItem('userRole', roleName);
      sessionStorage.setItem('userId', userId);
    } catch (err) {
      throw new Error(err.message === 'Unauthorized' ? 'Unauthorized' : 'Forbidden: Admin access required');
    }
  }

  async function fetchData() {
    try {
      setIsLoading(true);
      await validateAuth();

      const token = sessionStorage.getItem('jwt');
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings?populate=vaccine`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(res.status === 401 ? 'Unauthorized' : res.status === 403 ? `Forbidden: ${message}` : message);
      }
      const data = await res.json();
      setBookingSettings(data.data || []);
      if (setParentData) setParentData(data.data || []);
    } catch (error) {
      console.error('BookingSettingSection - Fetch Error:', error.message, error.stack);
      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: error.message.includes('Forbidden')
          ? 'คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
          : error.message === 'Unauthorized'
          ? 'กรุณาเข้าสู่ระบบใหม่'
          : `ไม่สามารถดึงข้อมูลการตั้งค่าการจองได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
      });
      if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userId');
        setTimeout(() => router.replace('/login', { scroll: false }), 0);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]',
        title: 'text-lg font-semibold text-[var(--foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--secondary)]/80 transition-all duration-300',
      },
    });

    if (!result.isConfirmed) return;

    try {
      await validateAuth();
      const token = sessionStorage.getItem('jwt');
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(res.status === 401 ? 'Unauthorized' : res.status === 403 ? `Forbidden: ${message}` : message);
      }
      await fetchData();
      MySwal.fire({
        title: 'ลบสำเร็จ',
        text: 'ข้อมูลถูกลบเรียบร้อยแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        },
      });
    } catch (error) {
      console.error('BookingSettingSection - Delete Error:', error.message, error.stack);
      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: error.message.includes('Forbidden')
          ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
          : error.message === 'Unauthorized'
          ? 'กรุณาเข้าสู่ระบบใหม่'
          : `ไม่สามารถลบข้อมูลได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
      });
      if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userId');
        setTimeout(() => router.replace('/login', { scroll: false }), 0);
      }
    }
  }

  async function handleSave(data) {
    try {
      await validateAuth();
      const token = sessionStorage.getItem('jwt');
      const method = data.id ? 'PUT' : 'POST';
      const url = data.id
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings/${data.id}`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings`;

      const bodyData = {
        data: {
          advance_booking_days: data.advance_booking_days,
          prevent_last_minute_minutes: data.prevent_last_minute_minutes,
          slotDurationMinutes: data.slotDurationMinutes,
          is_enabled: data.is_enabled,
          vaccine: data.vaccine,
        },
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(res.status === 401 ? 'Unauthorized' : res.status === 403 ? `Forbidden: ${message}` : message);
      }
      setEditing(null);
      setCreating(false);
      await fetchData();
      MySwal.fire({
        title: 'บันทึกสำเร็จ',
        text: 'ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        },
      });
    } catch (error) {
      console.error('BookingSettingSection - Save Error:', error.message, error.stack);
      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: error.message.includes('Forbidden')
          ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
          : error.message === 'Unauthorized'
          ? 'กรุณาเข้าสู่ระบบใหม่'
          : `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
      });
      if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
        sessionStorage.removeItem('jwt');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('userId');
        setTimeout(() => router.replace('/login', { scroll: false }), 0);
      }
    }
  }

  const exportExcel = () => {
    if (!filteredSettings.length) {
      MySwal.fire({
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลสำหรับส่งออก',
        icon: 'warning',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]',
          title: 'text-lg font-semibold text-[var(--foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300',
        },
      });
      return;
    }

    const data = filteredSettings.map((item) => ({
      'ชื่อวัคซีน': item.attributes?.vaccine?.data?.attributes?.title || '-',
      'จองล่วงหน้า (วัน)': item.attributes?.advance_booking_days || 0,
      'เวลาการกั้นการจอง (นาที)': item.attributes?.prevent_last_minute_minutes || 0,
      'ระยะเวลาช่วงเวลา (นาที)': item.attributes?.slotDurationMinutes || 0,
      'สถานะ': item.attributes?.is_enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'การตั้งค่าการจอง');
    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
      `การตั้งค่าการจอง-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`
    );
  };

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <motion.div className="flex items-center justify-center h-screen bg-[var(--background)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="w-12 h-12 border-4 rounded-full border-[var(--border)]/20 border-t-[var(--primary)] animate-spin" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} />
      </motion.div>
    );
  }

  if (creating) {
    return <BookingSettingFormCreate onCancel={() => setCreating(false)} onSave={handleSave} />;
  }

  if (editing !== null) {
    return <BookingSettingForm initialData={editing} onCancel={() => setEditing(null)} onSave={handleSave} />;
  }

  const filteredSettings = bookingSettings.filter((item) => {
    const vaccineTitle = item.attributes.vaccine?.data?.attributes?.title || '';
    return vaccineTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(filteredSettings.length / itemsPerPage);
  const paginatedSettings = filteredSettings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const hasVaccines = bookingSettings.some(item => 
    item.attributes?.vaccine?.data?.id && 
    item.attributes?.vaccine?.data?.attributes?.title
  );

  return (
    <motion.div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-Prompt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} role="main" aria-label="ตั้งค่าการจองล่วงหน้า">
      <div className="max-w-5xl mx-auto">
        {/* Controls */}
        <motion.div className="bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              {/* ไอคอนค้นหา */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <motion.div
                  animate={{ scale: searchTerm ? 1.2 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="text-[var(--primary)] text-lg transition-all duration-300"
                  />
                </motion.div>
              </div>

              {/* ปุ่ม X ล้าง */}
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.6, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.6, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--muted)]/20 transition-colors z-10"
                    aria-label="ล้างการค้นหา"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Input หลัก */}
              <Input
                type="text"
                placeholder="ค้นหาวัคซีน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`
                  w-full h-14 pl-14 pr-14 py-4 text-lg font-medium
                  rounded-full border-2 border-[var(--primary)]/30
                  bg-[var(--card)]/90 text-[var(--foreground)]
                  placeholder:text-[var(--muted-foreground)]/60
                  focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20
                  focus:border-[var(--primary)] focus:shadow-xl
                  focus:shadow-[var(--primary)]/10
                  transition-all duration-300 ease-out
                  backdrop-blur-md
                  [&:focus]:scale-[1.01]
                  [&:focus]:translate-y-[-2px]
                `}
                style={{
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                }}
                aria-label="ค้นหาวัคซีน"
              />

              {/* เอฟเฟกต์ glow ด้านใน */}
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--primary)]/10 to-transparent opacity-0 pointer-events-none"
                initial={false}
                animate={{ opacity: searchTerm ? 1 : 0 }}
                transition={{ duration: 0.4 }}
              />
            </div>

            <div className="flex gap-3">
              {hasVaccines && (
                <motion.button
                  onClick={() => setCreating(true)}
                  className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-semibold text-base hover:bg-[var(--primary)]/80 transition-all duration-300 flex items-center gap-2"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  aria-label="สร้างการจองล่วงหน้าใหม่"
                >
                  <FontAwesomeIcon icon={faPlus} /> เพิ่มการตั้งค่า
                </motion.button>
              )}
              <motion.button
                onClick={exportExcel}
                className="px-6 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-semibold text-base hover:bg-[var(--secondary)]/80 transition-all duration-300 flex items-center gap-2"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                aria-label="ดาวน์โหลด Excel"
              >
                <FontAwesomeIcon icon={faDownload} className="w-5 h-5" /> ดาวน์โหลด Excel
              </motion.button>
            </div>
          </div>
          {!hasVaccines && bookingSettings.length > 0 && (
            <p className="mt-3 text-sm text-[var(--muted-foreground)] italic">
              ยังไม่มีวัคซีนที่ผูกกับการตั้งค่า กรุณาเพิ่มวัคซีนก่อน
            </p>
          )}
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <motion.div className="flex flex-col items-center justify-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="w-12 h-12 border-4 rounded-full border-[var(--border)]/20 border-t-[var(--primary)] animate-spin" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} />
            <p className="mt-4 text-base font-medium text-[var(--muted-foreground)]">กำลังโหลดข้อมูล...</p>
          </motion.div>
        ) : paginatedSettings.length > 0 ? (
          <div className="space-y-4">
            {paginatedSettings.map(({ id, attributes }, index) => (
              <motion.div key={id} className="bg-[var(--card)] rounded-[var(--radius)] shadow-lg border border-[var(--border)] overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                {/* Header */}
                <motion.button onClick={() => toggleExpanded(id)} className="w-full p-6 flex items-center justify-between hover:bg-[var(--secondary)]/20 transition-colors duration-200" whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${attributes.is_enabled ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'bg-[var(--destructive)]/20 text-[var(--destructive)]'}`}>
                      <FontAwesomeIcon icon={attributes.is_enabled ? faToggleOn : faToggleOff} className="text-xl" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-[var(--foreground)]">
                        {attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุชื่อวัคซีน'}
                      </h4>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {attributes.is_enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </p>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={expandedItems.has(id) ? faChevronUp : faChevronDown} className="text-[var(--muted-foreground)] transition-transform duration-300" />
                </motion.button>

                <AnimatePresence>
                  {expandedItems.has(id) && (
                    <motion.div variants={accordionVariants} initial="closed" animate="open" exit="closed" className="border-t border-[var(--border)]">
                      <div className="p-6 bg-[var(--background)]/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon icon={faCalendarCheck} className="text-[var(--primary)]" />
                            </div>
                            <div>
                              <p className="text-sm text-[var(--muted-foreground)] mb-1">จองล่วงหน้า</p>
                              <p className="text-lg font-semibold text-[var(--foreground)]">{attributes.advance_booking_days || 0} วัน</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon icon={faHourglassHalf} className="text-[var(--primary)]" />
                            </div>
                            <div>
                              <p className="text-sm text-[var(--muted-foreground)] mb-1">เวลากั้นการจอง</p>
                              <p className="text-lg font-semibold text-[var(--foreground)]">{attributes.prevent_last_minute_minutes || 0} นาที</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                              <FontAwesomeIcon icon={faStopwatch} className="text-[var(--primary)]" />
                            </div>
                            <div>
                              <p className="text-sm text-[var(--muted-foreground)] mb-1">ระยะเวลาช่วงเวลา</p>
                              <p className="text-lg font-semibold text-[var(--foreground)]">{attributes.slotDurationMinutes || 0} นาที</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                            <FontAwesomeIcon icon={faInfoCircle} />
                            <span>การตั้งค่านี้มีผลกับระบบการจองทั้งหมด</span>
                          </div>
                          <div className="flex gap-3">
                            <motion.button
                              onClick={() => setEditing({ id, ...attributes })}
                              className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-medium text-sm hover:bg-[var(--primary)]/80 transition-all duration-300 flex items-center gap-2"
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <FontAwesomeIcon icon={faEdit} className="w-4 h-4" /> แก้ไข
                            </motion.button>
                            <motion.button
                              onClick={() => handleDelete(id)}
                              className="px-4 py-2 bg-[var(--destructive)] text-[var(--destructive-foreground)] rounded-[var(--radius)] font-medium text-sm hover:bg-[var(--destructive)]/80 transition-all duration-300 flex items-center gap-2"
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" /> ลบ
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div className="flex flex-col items-center justify-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-24 h-24 rounded-full bg-[var(--secondary)]/20 flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faSyringe} className="w-12 h-12 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-center text-lg font-medium text-[var(--muted-foreground)] mb-2">
              ยังไม่มีวัคซีนในระบบ
            </p>
            <p className="text-center text-sm text-[var(--muted-foreground)] mb-6 max-w-md">
              กรุณาสร้างข้อมูลวัคซีนก่อน จึงจะสามารถตั้งค่าการจองได้
            </p>
          </motion.div>
        )}
        {totalPages > 1 && (
          <motion.div className="flex justify-center items-center gap-4 mt-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <motion.button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-[var(--card)] text-[var(--foreground)] rounded-[var(--radius)] font-medium text-sm hover:bg-[var(--secondary)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border)]"
              whileHover="hover"
              whileTap="tap"
            >
              ก่อนหน้า
            </motion.button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-full font-medium transition-all duration-300 ${isActive ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--secondary)] border border-[var(--border)]'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-[var(--muted-foreground)]">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-10 h-10 rounded-full font-medium transition-all duration-300 ${currentPage === totalPages ? 'bg-[var(--primary)] text-[var(--primary-foreground)]' : 'bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--secondary)] border border-[var(--border)]'}`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <motion.button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-[var(--card)] text-[var(--foreground)] rounded-[var(--radius)] font-medium text-sm hover:bg-[var(--secondary)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border)]"
              whileHover="hover"
              whileTap="tap"
            >
              ถัดไป
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}