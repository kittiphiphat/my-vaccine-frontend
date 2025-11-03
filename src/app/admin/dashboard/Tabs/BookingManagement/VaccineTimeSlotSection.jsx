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
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Input } from '@/components/ui/input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faClock, faMagnifyingGlass, 
  faTimes, faEdit, faTrash, faChevronDown ,faToggleOn, faToggleOff ,
  faDownload, faSyringe
} from '@fortawesome/free-solid-svg-icons';
import VaccineTimeSlotForm from './formedit/VaccineTimeSlotform';
import VaccineTimeSlotFormCreate from './formcreate/VaccineTimeSlotformCreate';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isTimeOverlap(startTime, endTime, allSlots, currentId) {
  if (!startTime || !endTime || !/^\d{2}:\d{2}(?::\d{2})?$/.test(startTime) || !/^\d{2}:\d{2}(?::\d{2})?$/.test(endTime)) {
    return { isOverlap: false, conflicts: [] };
  }
  const startMinutes = timeToMinutes(startTime.slice(0, 5));
  const endMinutes = timeToMinutes(endTime.slice(0, 5));
  const conflicts = [];

  allSlots.forEach((slot) => {
    if (slot.id === currentId) return;
    const slotStart = timeToMinutes(slot.attributes.startTime?.slice(0, 5) || '00:00');
    const slotEnd = timeToMinutes(slot.attributes.endTime?.slice(0, 5) || '00:00');
    if (
      (startMinutes < slotEnd && endMinutes > slotStart) &&
      !(startMinutes === slotEnd || endMinutes === slotStart)
    ) {
      conflicts.push({
        startTime: slot.attributes.startTime?.slice(0, 5) || '-',
        endTime: slot.attributes.endTime?.slice(0, 5) || '-',
      });
    }
  });

  return { isOverlap: conflicts.length > 0, conflicts };
}

function calculateRemainingQuota(slots, maxQuota) {
  const usedQuota = slots.reduce((sum, slot) => sum + (slot.attributes?.quota || 0), 0);
  return Math.max(0, maxQuota - usedQuota);
}

export default function VaccineTimeSlotSection({ setParentData }) {
  const router = useRouter();
  const [timeSlots, setTimeSlots] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isQuotaFull, setIsQuotaFull] = useState(false);
  const [expandedVaccines, setExpandedVaccines] = useState({});
  const itemsPerPage = 10;

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

  async function fetchVaccinesAndSlots() {
    try {
      setLoading(true);
      await validateAuth();

      const token = sessionStorage.getItem('jwt');
      const [slotsRes, vaccinesRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots?populate[vaccine][fields][0]=title&populate[vaccine][fields][1]=serviceStartTime&populate[vaccine][fields][2]=serviceEndTime&populate[vaccine][fields][3]=maxQuota`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache',
            },
          }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?filters[useTimeSlots][$eq]=true&fields[0]=title&fields[1]=maxQuota`,
          {
            headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
          }
        ),
      ]);

      if (!slotsRes.ok || !vaccinesRes.ok) {
        const errorRes = !slotsRes.ok ? slotsRes : vaccinesRes;
        const errorData = await errorRes.json().catch(() => null);
        const message = errorData?.error?.message || errorRes.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(errorRes.status === 401 ? 'Unauthorized' : errorRes.status === 403 ? `Forbidden: ${message}` : message);
      }

      const slotsData = await slotsRes.json();
      const vaccinesData = await vaccinesRes.json();

      const fetchedSlots = Array.isArray(slotsData.data) ? slotsData.data : [];
      const fetchedVaccines = Array.isArray(vaccinesData.data) ? vaccinesData.data : [];

      setTimeSlots(fetchedSlots);

      const vaccineQuotaStatus = fetchedVaccines.map((vaccine) => {
        const maxQuota = vaccine.attributes?.maxQuota ?? 0;
        const filteredSlots = fetchedSlots.filter(
          (slot) => slot.attributes?.vaccine?.data?.id === vaccine.id
        );
        const remainingQuota = calculateRemainingQuota(filteredSlots, maxQuota);
        return { id: vaccine.id, remainingQuota };
      });

      setVaccines(vaccineQuotaStatus);
      const allQuotasFull = vaccineQuotaStatus.every((vaccine) => vaccine.remainingQuota === 0);
      setIsQuotaFull(allQuotasFull);
    } catch (error) {
      console.error('VaccineTimeSlotSection - Fetch Error:', error.message, error.stack);
      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: error.message.includes('Forbidden')
          ? 'คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
          : error.message === 'Unauthorized'
          ? 'กรุณาเข้าสู่ระบบใหม่'
          : `ไม่สามารถโหลดข้อมูลช่วงเวลาให้บริการได้: ${error.message}`,
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
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted) fetchVaccinesAndSlots();
  }, [mounted]);

  useEffect(() => {
    if (setParentData) setParentData({ filteredSlots: timeSlots, searchTerm });
  }, [timeSlots, searchTerm, setParentData]);

  async function handleDelete(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบช่วงเวลานี้?',
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(res.status === 401 ? 'Unauthorized' : res.status === 403 ? `Forbidden: ${message}` : message);
      }
      fetchVaccinesAndSlots();
      MySwal.fire({
        title: 'ลบสำเร็จ',
        text: 'ช่วงเวลาถูกลบเรียบร้อยแล้ว',
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
      console.error('VaccineTimeSlotSection - Delete Error:', error.message, error.stack);
      await MySwal.fire({
        title: error.message.includes('Forbidden') ? 'ไม่มีสิทธิ์' : 'เกิดข้อผิดพลาด',
        text: error.message.includes('Forbidden')
          ? 'คุณไม่มีสิทธิ์ในการดำเนินการนี้ กรุณาตรวจสอบบทบาทผู้ใช้'
          : error.message === 'Unauthorized'
          ? 'กรุณาเข้าสู่ระบบใหม่'
          : `ไม่สามารถลบช่วงเวลาได้: ${error.message}`,
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

  const handleCancelEdit = () => setEditingSlot(null);
  const handleSaveEdit = () => {
    setEditingSlot(null);
    fetchVaccinesAndSlots();
  };

  const handleCancelCreate = () => setCreatingSlot(false);
  const handleSaveCreate = () => {
    setCreatingSlot(false);
    fetchVaccinesAndSlots();
  };

  // จัดกลุ่มตามวัคซีน
  const groupedSlots = timeSlots.reduce((acc, slot) => {
    const vaccineId = slot.attributes.vaccine?.data?.id;
    const vaccineName = slot.attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ';
    if (!acc[vaccineId]) {
      acc[vaccineId] = { id: vaccineId, name: vaccineName, slots: [] };
    }
    acc[vaccineId].slots.push(slot);
    return acc;
  }, {});

  // กรองเฉพาะการค้นหาชื่อวัคซีน (ไม่กรองสถานะอีกต่อไป)
  const filteredVaccines = Object.values(groupedSlots).filter(vaccine =>
    vaccine.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleVaccineExpansion = (vaccineId) => {
    setExpandedVaccines(prev => ({ ...prev, [vaccineId]: !prev[vaccineId] }));
  };

  const exportToExcel = (filteredData, searchTerm) => {
    if (!filteredData?.length) {
      MySwal.fire({ 
        title: 'ไม่มีข้อมูล', 
        text: 'ไม่มีข้อมูลช่วงเวลาให้บริการสำหรับส่งออก', 
        icon: 'warning', 
        customClass: { 
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)]/20 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10 backdrop-blur-xl p-6 max-w-[90vw]', 
          title: 'text-lg font-semibold text-[var(--foreground)]', 
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4', 
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius)] font-semibold hover:bg-[var(--primary)]/80 transition-all duration-300' 
        } 
      });
      return;
    }

    const excelData = filteredData.flatMap(vaccine =>
      vaccine.slots.map((slot, i) => ({
        ลำดับ: i + 1,
        วัคซีน: vaccine.name,
        เวลาเริ่ม: slot.attributes.startTime?.slice(0, 5) || '-',
        เวลาสิ้นสุด: slot.attributes.endTime?.slice(0, 5) || '-',
        จำนวนที่รับ: slot.attributes.quota || '-',
        สถานะ: slot.attributes.is_enabled ? 'เปิดใช้งาน' : 'ปิด',
      }))
    );

    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.sheet_add_aoa(ws, [['ลำดับ', 'วัคซีน', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'จำนวนที่รับ', 'สถานะ']], { origin: 'A1' });
    ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ช่วงเวลาให้บริการ');
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/octet-stream' }), `ช่วงเวลาให้บริการ${searchTerm ? `-${searchTerm}` : ''}-${dayjs().tz('Asia/Bangkok').locale('th').format('D MMMM BBBB')}.xlsx`);
  };

  if (!mounted) {
    return (
      <motion.div className="flex items-center justify-center h-screen bg-[var(--background)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="w-12 h-12 border-4 rounded-full border-[var(--border)]/20 border-t-[var(--primary)] animate-spin" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} />
      </motion.div>
    );
  }

  if (editingSlot !== null) {
    const vaccineId = editingSlot.vaccine?.data?.id;
    const allSlotsForVaccine = timeSlots.filter(slot => slot.attributes.vaccine?.data?.id === vaccineId);
    return <VaccineTimeSlotForm initialData={editingSlot} onCancel={handleCancelEdit} onSave={handleSaveEdit} allSlots={allSlotsForVaccine} isTimeOverlap={isTimeOverlap} />;
  }

  if (creatingSlot) {
    return <VaccineTimeSlotFormCreate onCancel={handleCancelCreate} onSave={handleSaveCreate} />;
  }

  return (
    <motion.div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 font-Prompt bg-gradient-to-br from-[var(--background)] to-[var(--muted)]/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="main" aria-label="จัดการช่วงเวลาให้บริการ">
      <div className="max-w-7xl mx-auto">
        <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)] flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                  <FontAwesomeIcon icon={faClock} className="text-white text-xl" />
                </div>
                จัดการช่วงเวลาให้บริการ
              </h1>
              <p className="text-[var(--muted-foreground)] mt-2">จัดการช่วงเวลาที่เปิดให้บริการสำหรับแต่ละวัคซีน</p>
            </div>
            <div className="flex gap-3">
              {!isQuotaFull && (
                <motion.button onClick={() => setCreatingSlot(true)} className="px-6 py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <FontAwesomeIcon icon={faPlus} /> สร้างช่วงเวลาใหม่
                </motion.button>
              )}
              <motion.button onClick={() => exportToExcel(filteredVaccines, searchTerm)} className="px-6 py-3 bg-gradient-to-r from-[var(--secondary)] to-[var(--secondary-dark)] text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <FontAwesomeIcon icon={faDownload} /> ดาวน์โหลด Excel
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <motion.div className="w-6 h-6 flex items-center justify-center" animate={{ scale: searchTerm ? 1.1 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[var(--muted-foreground)] transition-all duration-300 group-focus-within:text-[var(--primary)] group-focus-within:scale-125" />
                </motion.div>
              </div>

              <AnimatePresence>
                {searchTerm && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--muted)]/20 transition-colors z-10" aria-label="ล้างการค้นหา">
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </motion.button>
                )}
              </AnimatePresence>

              <Input
                type="text"
                placeholder="ค้นหาชื่อวัคซีน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 text-base font-medium rounded-xl border border-[var(--border)] bg-[var(--input)]/90 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/70 focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] focus:outline-none transition-all duration-300 ease-out backdrop-blur-sm"
                aria-label="ค้นหาชื่อวัคซีน"
              />
            </div>
          </div>
        </motion.div>
      
        {loading ? (
          <motion.div className="flex flex-col items-center justify-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="w-16 h-16 border-4 rounded-full border-[var(--border)]/20 border-t-[var(--primary)] animate-spin" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} />
            <p className="mt-4 text-base font-medium text-[var(--muted-foreground)]">กำลังโหลดข้อมูล...</p>
          </motion.div>
        ) : filteredVaccines.length === 0 ? (
          <motion.div className="flex flex-col items-center justify-center py-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="w-24 h-24 rounded-full bg-[var(--muted)]/20 flex items-center justify-center mb-4">
              <FontAwesomeIcon icon={faClock} className="text-4xl text-[var(--muted-foreground)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">ไม่พบข้อมูลช่วงเวลาให้บริการ</h3>
            <p className="text-[var(--muted-foreground)] max-w-md">
              {searchTerm ? `ไม่พบข้อมูลที่ตรงกับการค้นหา "${searchTerm}"` : 'ยังไม่มีข้อมูลช่วงเวลาให้บริการ กรุณาสร้างช่วงเวลาใหม่'}
            </p>
            {!searchTerm && !isQuotaFull && (
              <motion.button onClick={() => setCreatingSlot(true)} className="mt-6 px-6 py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <FontAwesomeIcon icon={faPlus} /> สร้างช่วงเวลาใหม่
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--primary)] to-[var(--secondary)]"></div>
            
            <div className="space-y-8">
              {filteredVaccines.map((vaccine, vaccineIndex) => (
                <motion.div key={vaccine.id} className="relative" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: vaccineIndex * 0.1 }}>
                  {/* Timeline Node */}
                  <div className="absolute left-6 w-5 h-5 rounded-full bg-[var(--background)] border-4 border-[var(--primary)] z-10"></div>
                  
                  <div className="ml-16">
                    <motion.div 
                      className="p-6 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-2xl border border-[var(--border)]/20 backdrop-blur-sm cursor-pointer"
                      onClick={() => toggleVaccineExpansion(vaccine.id)}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(var(--primary), 0.1)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                            <FontAwesomeIcon icon={faSyringe} className="text-white text-xl" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-[var(--foreground)]">{vaccine.name}</h3>
                            <p className="text-[var(--muted-foreground)]">{vaccine.slots.length} ช่วงเวลา</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            {vaccine.slots.some(s => s.attributes.is_enabled) && (
                              <span className="px-3 py-1 rounded-full bg-[var(--success)]/20 text-[var(--success)] text-sm font-medium">เปิดใช้งาน</span>
                            )}
                            {vaccine.slots.some(s => !s.attributes.is_enabled) && (
                              <span className="px-3 py-1 rounded-full bg-[var(--destructive)]/20 text-[var(--destructive)] text-sm font-medium">ปิดใช้งาน</span>
                            )}
                          </div>
                          <motion.div animate={{ rotate: expandedVaccines[vaccine.id] ? 180 : 0 }} transition={{ duration: 0.3 }}>
                            <FontAwesomeIcon icon={faChevronDown} className="text-[var(--foreground)]" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>

                    <AnimatePresence>
                      {expandedVaccines[vaccine.id] && (
                        <motion.div 
                          className="mt-4 ml-4 relative"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--primary)]/50 to-[var(--secondary)]/50"></div>
                          <div className="space-y-4">
                            {vaccine.slots.map((slot, slotIndex) => (
                              <motion.div key={slot.id} className="relative pl-10" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: slotIndex * 0.05 }}>
                                {/* Sub-timeline Node */}
                                <div className="absolute left-2 w-3 h-3 rounded-full bg-[var(--background)] border-2 border-[var(--primary)]/70 z-10"></div>
                                
                                {/* Sub-timeline Content */}
                                <div className="p-4 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--secondary)]/5 rounded-xl border border-[var(--border)]/20 backdrop-blur-sm">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)]/20 to-[var(--secondary)]/20 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faClock} className="text-[var(--primary)]" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg font-semibold text-[var(--foreground)]">
                                            {slot.attributes.startTime?.slice(0, 5)} - {slot.attributes.endTime?.slice(0, 5)}
                                          </span>
                                          {slot.attributes.is_enabled ? (
                                            <FontAwesomeIcon icon={faToggleOn} className="text-[var(--success)] text-xl" />
                                          ) : (
                                            <FontAwesomeIcon icon={faToggleOff} className="text-[var(--muted-foreground)] text-xl" />
                                          )}
                                        </div>
                                        <p className="text-[var(--muted-foreground)]">จำนวนที่รับ: {slot.attributes.quota} คน</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <motion.button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSlot({ id: slot.id, ...slot.attributes });
                                        }} 
                                        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium text-sm hover:bg-[var(--primary)]/80 transition-all duration-300 flex items-center gap-2" 
                                        whileHover={{ scale: 1.05 }} 
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <FontAwesomeIcon icon={faEdit} /> แก้ไข
                                      </motion.button>
                                      <motion.button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(slot.id);
                                        }} 
                                        className="px-4 py-2 bg-[var(--destructive)] text-white rounded-lg font-medium text-sm hover:bg-[var(--destructive)]/80 transition-all duration-300 flex items-center gap-2" 
                                        whileHover={{ scale: 1.05 }} 
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <FontAwesomeIcon icon={faTrash} /> ลบ
                                      </motion.button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}