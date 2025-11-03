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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faDownload,
  faSearch,
  faCalendarAlt,
  faSyringe,
  faEdit,
  faTrash,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Input } from '@/components/ui/input';
import VaccineServiceDayForm from './formedit/VaccineServiceDaySectionform';
import VaccineServiceDayFormCreate from './formcreate/VaccineServiceDaySectionformCreate';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);

const dayNamesTH = {
  0: 'วันอาทิตย์',
  1: 'วันจันทร์',
  2: 'วันอังคาร',
  3: 'วันพุธ',
  4: 'วันพฤหัสบดี',
  5: 'วันศุกร์',
  6: 'วันเสาร์',
};

const isEveryDay = (daysArray) =>
  daysArray.length === 7 && [0, 1, 2, 3, 4, 5, 6].every((d) => daysArray.includes(d));

export default function VaccineServiceDaySection({ setParentData }) {
  const router = useRouter();
  const [serviceDays, setServiceDays] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasUnassignedVaccines, setHasUnassignedVaccines] = useState(true);
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
      });
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      const roleName =
        data?.role?.name?.toLowerCase() ||
        data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase() ||
        null;
      if (roleName !== 'admin') throw new Error('Forbidden: Admin access required');
      sessionStorage.setItem('userRole', roleName);
    } catch {
      throw new Error('Forbidden: Admin access required');
    }
  }

  async function fetchVaccines() {
    try {
      const token = sessionStorage.getItem('jwt');
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async function fetchServiceDays() {
    try {
      setIsLoading(true);
      await validateAuth();
      const token = sessionStorage.getItem('jwt');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?populate=vaccine`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const serviceDaysData = data.data || [];
      setServiceDays(serviceDaysData);
      if (setParentData) setParentData(serviceDaysData);

      const vaccines = await fetchVaccines();
      const assignedIds = new Set(
        serviceDaysData
          .filter((d) => d.attributes.vaccine?.data?.id)
          .map((d) => d.attributes.vaccine.data.id)
      );
      setHasUnassignedVaccines(vaccines.some((v) => !assignedIds.has(v.id)));
    } catch (error) {
      await MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: error.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : 'ไม่สามารถดึงข้อมูลได้',
        icon: 'error',
        customClass: {
          popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
          confirmButton: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] px-6 py-3 rounded-[var(--radius)] font-medium hover:bg-[var(--destructive)]/80',
        },
      });
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        sessionStorage.clear();
        router.replace('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบ?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[var(--radius)] shadow-lg border border-[var(--border)] p-6 max-w-md',
        title: 'text-lg font-semibold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)] font-medium mb-4',
        confirmButton: 'bg-[var(--destructive)] text-[var(--destructive-foreground)] px-6 py-3 rounded-[var(--radius)] font-medium hover:bg-[var(--destructive)]/80',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-[var(--radius)] font-medium hover:bg-[var(--secondary)]/80',
      },
    });

    if (!result.isConfirmed) return;

    try {
      await validateAuth();
      const token = sessionStorage.getItem('jwt');
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchServiceDays();
      MySwal.fire({ title: 'ลบสำเร็จ', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      await MySwal.fire({ title: 'เกิดข้อผิดพลาด', text: error.message, icon: 'error' });
      if (error.message.includes('Unauthorized')) {
        sessionStorage.clear();
        router.replace('/login');
      }
    }
  }

  const exportExcel = () => {
    if (!filteredServiceDays.length) {
      MySwal.fire({ title: 'ไม่มีข้อมูล', icon: 'warning' });
      return;
    }

    const data = filteredServiceDays.map((item) => {
      const daysArray = Array.isArray(item.attributes.day_of_week)
        ? item.attributes.day_of_week
        : [];
      const thaiDays = isEveryDay(daysArray)
        ? 'ทุกวัน'
        : daysArray.map((d) => dayNamesTH[d]).join(' ');
      return {
        'ชื่อวัคซีน': item.attributes?.vaccine?.data?.attributes?.title || '-',
        'วันที่ให้บริการ': thaiDays || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'วันที่ให้บริการ');
    saveAs(
      new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]),
      `วันที่ให้บริการ-${dayjs().tz('Asia/Bangkok').format('D MMMM BBBB')}.xlsx`
    );
  };

  useEffect(() => {
    if (mounted) fetchServiceDays();
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="w-16 h-16 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (creatingItem) {
    return <VaccineServiceDayFormCreate onCancel={() => setCreatingItem(false)} onSave={() => { setCreatingItem(false); fetchServiceDays(); }} />;
  }

  if (editingItem !== null) {
    return <VaccineServiceDayForm initialData={editingItem} onCancel={() => setEditingItem(null)} onSave={() => { setEditingItem(null); fetchServiceDays(); }} />;
  }

  const filteredServiceDays = serviceDays.filter(({ attributes }) =>
    (attributes.vaccine?.data?.attributes?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredServiceDays.length / itemsPerPage);
  const paginatedServiceDays = filteredServiceDays.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">จัดการวันให้บริการวัคซีน</h1>
              <p className="text-[var(--muted-foreground)]">กำหนดวันที่ให้บริการสำหรับแต่ละวัคซีน</p>
            </div>
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <FontAwesomeIcon icon={faSyringe} />
              <span>ทั้งหมด: {serviceDays.length} รายการ</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="w-5 h-5 text-[var(--muted-foreground)] 
                              group-focus-within:text-[var(--primary)] 
                              transition-colors duration-200"
                  />
                </div>
                <Input
                  type="text"
                  placeholder="ค้นหาชื่อวัคซีน..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`
                    pl-12 pr-4 py-3 w-full
                    bg-[var(--card)] 
                    border border-[var(--border)] 
                    text-[var(--card-foreground)] 
                    placeholder:text-[var(--muted-foreground)/0.7]
                    rounded-[var(--radius)]
                    focus:outline-none 
                    focus:ring-2 focus:ring-[var(--primary)] 
                    focus:border-[var(--primary)]
                    transition-all duration-200 ease-out
                    hover:border-[var(--primary)/0.5]
                    focus:shadow-[var(--primary)/0.15]
                    text-base
                  `}
                />

                {/* เอฟเฟกต์วงแหวนเมื่อ focus */}
                <div className="absolute inset-0 rounded-[var(--radius)] pointer-events-none 
                  ring-2 ring-transparent 
                  group-focus-within:ring-[var(--primary)/0.3] 
                  transition-all duration-300">
                </div>
              </div>
            {/* ปุ่มต่าง ๆ */}
            <div className="flex gap-3">
              {hasUnassignedVaccines && (
                <motion.button
                  onClick={() => setCreatingItem(true)}
                  className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/80 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span className="hidden sm:inline">สร้างใหม่</span>
                  <span className="sm:hidden">เพิ่ม</span>
                </motion.button>
              )}
              <motion.button
                onClick={exportExcel}
                className="px-6 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--secondary)]/80 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FontAwesomeIcon icon={faDownload} />
                <span className="hidden sm:inline">Excel</span>
                <span className="sm:hidden">ดาวน์โหลด</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ส่วนอื่น ๆ เหมือนเดิม */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin"></div>
              <p className="mt-4 text-[var(--muted-foreground)]">กำลังโหลด...</p>
            </div>
          ) : paginatedServiceDays.length > 0 ? (
            <>
              <AnimatePresence>
                {paginatedServiceDays.map(({ id, attributes }, index) => {
                  const daysArray = Array.isArray(attributes.day_of_week) ? attributes.day_of_week : [];
                  const thaiDays = isEveryDay(daysArray) ? 'ทุกวัน' : daysArray.map((d) => dayNamesTH[d]).join(' ');
                  const vaccine = attributes.vaccine?.data;

                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-6 bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-[var(--secondary-light)] rounded-full flex items-center justify-center flex-shrink-0">
                            <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--primary)] text-xl" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">{thaiDays || '-'}</h3>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-[var(--secondary-light)] rounded-full flex items-center justify-center">
                                <FontAwesomeIcon icon={faSyringe} className="text-[var(--primary)] text-xs" />
                              </div>
                              <p className="text-[var(--card-foreground)]">
                                {vaccine?.attributes?.title || 'ไม่มีวัคซีน'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button
                            onClick={() =>
                              setEditingItem({
                                id,
                                day_of_week: daysArray,
                                vaccine: vaccine ? { id: vaccine.id, attributes: vaccine.attributes } : null,
                              })
                            }
                            className="p-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] hover:bg-[var(--primary)]/80"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </motion.button>
                          <motion.button
                            onClick={() => handleDelete(id)}
                            className="p-2 bg-[var(--destructive)] text-[var(--destructive-foreground)] rounded-[var(--radius)] hover:bg-[var(--destructive)]/80"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                  <motion.button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--secondary)]/80 disabled:opacity-50"
                  >
                    ก่อนหน้า
                  </motion.button>
                  <span className="text-[var(--foreground)]">หน้า {currentPage} / {totalPages}</span>
                  <motion.button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--secondary)]/80 disabled:opacity-50"
                  >
                    ถัดไป
                  </motion.button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-[var(--secondary-light)] rounded-full flex items-center justify-center mb-4">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-[var(--muted-foreground)] text-2xl" />
              </div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">ไม่พบรายการ</h3>
              <p className="text-[var(--muted-foreground)] mb-6">ยังไม่มีข้อมูลวันให้บริการ</p>
              {hasUnassignedVaccines && (
                <motion.button
                  onClick={() => setCreatingItem(true)}
                  className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/80 flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  สร้างวันให้บริการใหม่
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}