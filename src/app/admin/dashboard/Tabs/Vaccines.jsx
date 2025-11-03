'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faDownload } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import VaccineFormedit from './Vaccines/VaccineFormedit';
import VaccineFormcreate from './Vaccines/VaccineFormcreate';
import VaccinesList from './Vaccines/VaccinesList';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';

dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

const MySwal = withReactContent(Swal);
const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`;
const axiosInstance = axios.create({ timeout: 30000 });

export default function Vaccines({ searchTerm }) {
  const router = useRouter();
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');

  const fetchVaccines = async (retryCount = 3) => {
    let attempts = 0;
    while (attempts < retryCount) {
      try {
        setLoading(true);
        setError(null);
        const token = sessionStorage.getItem('jwt');
        if (!token || typeof token !== 'string' || token.trim() === '') {
          throw new Error('Unauthorized: No valid token found');
        }
        const res = await axiosInstance.get(`${API_URL}?pagination[pageSize]=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVaccines(res.data.data || []);
        return;
      } catch (error) {
        attempts++;
        console.error(`Fetch vaccines attempt ${attempts} failed:`, {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          stack: error.stack,
        });
        if (attempts >= retryCount) {
          setError(error.message);
          MySwal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.response?.data?.error?.message || error.response?.data?.error?.details || (error.message.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถดึงข้อมูลวัคซีนได้: ${error.message}`),
            customClass: {
              popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
              title: 'text-lg font-semibold text-[var(--card-foreground)]',
              htmlContainer: 'text-base text-[var(--muted-foreground)]',
              confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
            },
          });
          if (error.message.includes('Unauthorized')) router.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchVaccines();
  }, []);

  const handleDelete = async (id, token) => {
    console.log('handleDelete called with ID:', id, 'Token:', token ? 'Token found' : 'No token');
    try {
      const response = await axiosInstance.delete(`${API_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      console.log('Delete response:', response.data);
      setVaccines(vaccines.filter((vaccine) => vaccine.id !== id));
      return response;
    } catch (error) {
      console.error('Error in handleDelete:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack,
      });
      throw error;
    }
  };

  const handleSave = () => {
    setEditingVaccine(null);
    setIsCreating(false);
    fetchVaccines();
    MySwal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ',
      text: isCreating ? 'เพิ่มวัคซีนสำเร็จ' : 'แก้ไขวัคซีนสำเร็จ',
      timer: 1500,
      showConfirmButton: false,
      customClass: {
        popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
        title: 'text-lg font-semibold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)]',
      },
    });
  };

  const exportToExcel = () => {
    const filteredVaccines = vaccines.filter((v) =>
      v.attributes.title?.toLowerCase().includes(localSearchTerm.toLowerCase())
    );
    if (filteredVaccines.length === 0) {
      MySwal.fire({
        icon: 'warning',
        title: 'ไม่มีข้อมูล',
        text: 'ไม่มีข้อมูลสำหรับส่งออก',
        customClass: {
          popup: 'bg-[var(--card)] rounded-[var(--radius)] border border-[var(--border)] shadow-lg p-6 max-w-md w-full',
          title: 'text-lg font-semibold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-2 rounded-[var(--radius)] font-medium hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm',
        },
      });
      return;
    }
    const excelData = filteredVaccines.map(({ attributes }, index) => ({
      ลำดับ: index + 1,
      ชื่อวัคซีน: attributes.title || '-',
      ช่วงอายุ: `${attributes.minAge || 0} - ${attributes.maxAge || 0}`,
      เพศ: attributes.gender === 'male' ? 'ชาย' : attributes.gender === 'female' ? 'หญิง' : 'ทุกเพศ',
      จำนวนสูงสุด: attributes.maxQuota || '-',
      จองไปแล้ว: attributes.booked || 0,
      สถานะ: attributes.booked >= attributes.maxQuota ? 'เต็มแล้ว' : 'ว่าง',
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อวัคซีน');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), `รายชื่อวัคซีน-${dayjs().tz('Asia/Bangkok').format('D MMMM BBBB')}.xlsx`);
  };

  const filteredVaccines = vaccines.filter((v) =>
    v.attributes.title?.toLowerCase().includes(localSearchTerm.toLowerCase())
  );

  return (
    <motion.div
      className="sm:p-2 lg:p-4 "
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {!isCreating && !editingVaccine && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <input
            placeholder="ค้นหาชื่อวัคซีน..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full sm:w-96 px-4 py-3 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--input)] text-[var(--card-foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-all duration-200 placeholder-[var(--muted-foreground)] shadow-sm"
            aria-label="ค้นหาชื่อวัคซีน"
          />
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setIsCreating(true)}
                className="w-full sm:w-auto px-5 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] hover:bg-[var(--primary)]/90 transition-all duration-200 shadow-sm"
                aria-label="เพิ่มวัคซีน"
              >
                <FontAwesomeIcon icon={faPlus} className="w-5 h-5 mr-2" /> เพิ่มวัคซีน
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={exportToExcel}
                className="w-full sm:w-auto px-5 py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] hover:bg-[var(--secondary)]/90 transition-all duration-200 shadow-sm"
                aria-label="ดาวน์โหลด Excel"
              >
                <FontAwesomeIcon icon={faDownload} className="w-5 h-5 mr-2" /> ดาวน์โหลด Excel
              </Button>
            </motion.div>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <motion.div
            className="w-8 h-8 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
        </div>
      ) : error ? (
        <p className="text-center text-[var(--destructive)] py-6 text-lg">เกิดข้อผิดพลาด: {error}</p>
      ) : isCreating ? (
        <VaccineFormcreate onSave={handleSave} onCancel={() => setIsCreating(false)} />
      ) : editingVaccine ? (
        <VaccineFormedit vaccine={editingVaccine} onSave={handleSave} onCancel={() => setEditingVaccine(null)} />
      ) : (
        <VaccinesList vaccines={filteredVaccines} onEdit={setEditingVaccine} onDelete={handleDelete} />
      )}
    </motion.div>
  );
}