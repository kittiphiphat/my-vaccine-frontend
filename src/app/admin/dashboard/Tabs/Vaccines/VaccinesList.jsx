'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, faTrash, faUsers, faCalendarAlt, faSyringe,
  faMars, faVenus, faTransgender, faHeartbeat
} from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

export default function VaccinesList({ vaccines, onEdit, onDelete }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const formatDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!vaccines || vaccines.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4 sm:px-6"
      >
        <div className="relative mb-8 sm:mb-10">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[var(--secondary-light)] flex items-center justify-center shadow-inner">
            <FontAwesomeIcon icon={faSyringe} className="h-16 w-16 sm:h-20 sm:w-20 text-[var(--primary)]" />
          </div>
          <motion.div
            className="absolute -bottom-3 -right-3 w-12 h-12 sm:w-14 sm:h-14 bg-[var(--card)] rounded-full flex items-center justify-center shadow-xl border-4 border-[var(--secondary-light)]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FontAwesomeIcon icon={faHeartbeat} className="w-5 h-5 sm:w-7 sm:h-7 text-[var(--primary)]" />
          </motion.div>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold text-[var(--card-foreground)] mb-3 text-center">ไม่มีข้อมูลวัคซีน</h3>
        <p className="text-[var(--muted-foreground)] text-center max-w-md text-base sm:text-lg px-4">
          กรุณาเพิ่มข้อมูลวัคซีนเพื่อเริ่มต้นใช้งานระบบ
        </p>
      </motion.div>
    );
  }

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบวัคซีนนี้? การลบจะยกเลิกการจองทั้งหมดที่เกี่ยวข้อง',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-2xl p-4 sm:p-6 max-w-md border border-[var(--border)]',
        title: 'text-xl sm:text-2xl font-bold text-[var(--card-foreground)]',
        htmlContainer: 'text-sm sm:text-base text-[var(--muted-foreground)] mt-2',
        confirmButton: 'bg-[var(--destructive)] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-4 sm:px-6 py-2.5 sm:py-3 rounded-[var(--radius)] font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base',
      },
    });

    if (result.isConfirmed) {
      try {
        const token = sessionStorage.getItem('jwt');
        if (!token?.trim()) throw new Error('Unauthorized');
        if (!onDelete) throw new Error('onDelete function is not defined');

        const response = await onDelete(id, token);
        if (!response?.data) throw new Error('No response from server');

        MySwal.fire({
          title: 'สำเร็จ',
          text: 'ลบวัคซีนเรียบร้อยแล้ว',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false,
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-xl p-4 sm:p-6 max-w-sm border border-[var(--border)]',
            title: 'text-lg sm:text-xl font-bold text-[var(--card-foreground)]',
          },
        });
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message || 'ไม่สามารถลบวัคซีนได้';
        MySwal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: msg,
          icon: 'error',
          customClass: {
            popup: 'bg-[var(--card)] rounded-[var(--radius)] shadow-xl p-4 sm:p-6 max-w-md border border-[var(--border)]',
            title: 'text-lg sm:text-xl font-bold text-[var(--card-foreground)]',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-4 sm:px-6 py-2.5 sm:py-3 rounded-[var(--radius)] font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base',
          },
        });
      }
    }
  };

  const genderMap = {
    male: { icon: faMars, bg: 'bg-[var(--primary)]/10', text: 'text-[var(--primary)]', ring: 'ring-[var(--ring)]/30' },
    female: { icon: faVenus, bg: 'bg-[var(--destructive)]/10', text: 'text-[var(--destructive)]', ring: 'ring-[var(--destructive)]/30' },
    any: { icon: faTransgender, bg: 'bg-[var(--primary)]/10', text: 'text-[var(--primary)]', ring: 'ring-[var(--ring)]/30' },
  };

  const getGenderInfo = (gender) => {
    const key = (gender || 'any').toLowerCase();
    return genderMap[key] || genderMap.any;
  };

  const totalPages = Math.ceil(vaccines.length / itemsPerPage);
  const paginatedVaccines = vaccines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full space-y-6 sm:space-y-8 px-2 sm:px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedVaccines.map(({ id, attributes }, index) => {
          const gender = getGenderInfo(attributes.gender);
          const isFull = attributes.booked >= attributes.maxQuota;
          const percent = (attributes.booked / attributes.maxQuota) * 100;
          const startDate = attributes.bookingStartDate || attributes.publishedAt;
          const endDate = attributes.bookingEndDate;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group relative  rounded-[var(--radius)] shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-[var(--border)]"
            >
              <div className={`h-2 ${isFull ? 'bg-[var(--destructive)]' : 'bg-[var(--primary)]'}`} />

              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--card-foreground)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors pr-2">
                    {attributes.title}
                  </h3>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${gender.bg} ${gender.text} flex items-center justify-center shadow-sm ring-2 ${gender.ring} flex-shrink-0`}>
                    <FontAwesomeIcon icon={gender.icon} className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="bg-[var(--primary-foreground)]/60 backdrop-blur-sm rounded-[var(--radius)] p-3 sm:p-4 mb-4 sm:mb-5 border border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <FontAwesomeIcon icon={faUsers} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--card-foreground)] flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">ช่วงอายุ</p>
                        <p className="font-bold text-[var(--card-foreground)] text-sm sm:text-sm">
                          {attributes.minAge} - {attributes.maxAge} ปี
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--card-foreground)] flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">จำนวนสูงสุด</p>
                        <p className="font-bold text-[var(--card-foreground)] text-sm sm:text-sm">{attributes.maxQuota} คน</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--card-foreground)] flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-[var(--muted-foreground)]">วันที่เปิดจอง</p>
                          <p className="font-semibold text-[var(--card-foreground)] text-xs sm:text-sm">
                            {formatDate(startDate)} {endDate ? `- ${formatDate(endDate)}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 sm:mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm font-medium text-[var(--muted-foreground)]">สถานะการจอง</span>
                    <span className={`text-xs sm:text-sm font-bold ${isFull ? 'text-[var(--destructive)]' : 'text-[var(--primary)]'}`}>
                      {isFull ? 'เต็ม' : 'ว่าง'}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--secondary)] rounded-full h-3 sm:h-4 overflow-hidden shadow-inner">
                    <motion.div
                      className={`h-full ${isFull ? 'bg-[var(--destructive)]' : 'bg-[var(--primary)]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percent, 100)}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] text-right mt-1.5 font-medium">
                    {attributes.booked} / {attributes.maxQuota} คน ({Math.round(percent)}%)
                  </p>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <motion.button
                    onClick={() => onEdit({ id, ...attributes })}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-[var(--radius)] font-semibold hover:shadow-lg transition-all duration-200 shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FontAwesomeIcon icon={faEdit} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    แก้ไข
                  </motion.button>
                  <motion.button
                    onClick={() => handleDelete(id)}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--destructive)] text-white rounded-[var(--radius)] font-semibold hover:shadow-lg transition-all duration-200 shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    ลบ
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mt-8 sm:mt-10"
        >
          <motion.button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md border border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base"
            whileHover={{ scale: currentPage > 1 ? 1.05 : 1 }}
            whileTap={{ scale: currentPage > 1 ? 0.95 : 1 }}
          >
            ก่อนหน้า
          </motion.button>

          <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <motion.button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[var(--radius)] font-bold transition-all focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base ${
                  currentPage === page
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg'
                    : 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-opacity-80 border border-[var(--border)]'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {page}
              </motion.button>
            ))}
          </div>

          <motion.button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-[var(--radius)] font-medium hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md border border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 text-sm sm:text-base"
            whileHover={{ scale: currentPage < totalPages ? 1.05 : 1 }}
            whileTap={{ scale: currentPage < totalPages ? 0.95 : 1 }}
          >
            ถัดไป
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}