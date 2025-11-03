'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faPencil, faPhone, faGlobe, 
  faExclamationTriangle, faHospital, faMapMarkerAlt 
} from '@fortawesome/free-solid-svg-icons';
import HospitelEdit from './Hospitel/Hospiteledit';
import { Button } from '@/components/ui/button';

const MySwal = withReactContent(Swal);
const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels`;

export default function Hospitels() {
  const router = useRouter();
  const [hospitels, setHospitels] = useState([]);
  const [editingHospitel, setEditingHospitel] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHospitels = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('jwt');
      if (!token) throw new Error('Unauthorized: No token found');
      const res = await fetch(`${API_URL}?pagination[pageSize]=100&sort=name:asc&populate=*`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP Error: ${res.status} ${errorText || res.statusText}`);
      }
      const data = await res.json();
      setHospitels(data.data || []);
    } catch (error) {
      const errorMessage = error.message || 'ไม่สามารถดึงข้อมูลโรงพยาบาลได้';
      MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: errorMessage.includes('Unauthorized') ? 'กรุณาเข้าสู่ระบบใหม่' : errorMessage,
        customClass: {
          popup: 'bg-[var(--card)] rounded-xl shadow-xl p-6 max-w-md w-full',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)]',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-all duration-200 shadow-md',
        },
      });
      if (errorMessage.includes('Unauthorized')) router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitels();
  }, []);

  const handleEdit = (hospitel) => {
    setEditingHospitel(hospitel);
    setCreatingNew(false);
  };

  const handleCreateNew = () => {
    setEditingHospitel(null);
    setCreatingNew(true);
  };

  const handleSave = () => {
    setEditingHospitel(null);
    setCreatingNew(false);
    fetchHospitels();
    MySwal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ',
      text: creatingNew ? 'เพิ่มโรงพยาบาลสำเร็จ' : 'แก้ไขโรงพยาบาลสำเร็จ',
      timer: 1500,
      showConfirmButton: false,
      customClass: {
        popup: 'bg-[var(--card)] rounded-xl shadow-xl p-6 max-w-md w-full',
        title: 'text-xl font-bold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)]',
      },
    });
  };

  const handleCancel = () => {
    setEditingHospitel(null);
    setCreatingNew(false);
  };

  const formatPhoneNumber = (phone) => (phone ? phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') : '-');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const hasData = hospitels.length > 0;

  return (
    <div className="min-h-screen bg-[var(--background)] relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          className="bg-[var(--card)] rounded-2xl shadow-lg p-6 mb-8 border border-[var(--border)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-md">
              <FontAwesomeIcon icon={faHospital} className="text-[var(--primary-foreground)] text-xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--card-foreground)]">จัดการโรงพยาบาล</h1>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[var(--muted-foreground)]/30 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-[var(--primary)] border-t-transparent rounded-full absolute top-0 animate-spin"></div>
            </div>
          </div>
        ) : editingHospitel || creatingNew ? (
          <HospitelEdit hospitel={editingHospitel} onSave={handleSave} onCancel={handleCancel} isNew={creatingNew} />
        ) : hospitels.length === 0 ? (
          <motion.div 
            className="bg-[var(--card)] rounded-2xl shadow-lg p-10 text-center border border-[var(--border)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-24 h-24 bg-[var(--secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <FontAwesomeIcon icon={faHospital} className="text-[var(--muted-foreground)] text-4xl" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--card-foreground)] mb-3">ยังไม่มีข้อมูลโรงพยาบาล</h3>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-md mx-auto">
              เริ่มต้นโดยการเพิ่มโรงพยาบาลแรกของคุณ
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <AnimatePresence>
              {hospitels.map(({ id, attributes }) => (
                <motion.div
                  key={id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, x: -50 }}
                  className="bg-[var(--card)] rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-[var(--border)] overflow-hidden"
                  whileHover={{ y: -4 }}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FontAwesomeIcon icon={faHospital} className="text-[var(--primary)] text-lg" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl sm:text-2xl font-bold text-[var(--card-foreground)]">
                                {attributes.name}
                              </h3>
                              {attributes.warningtext && (
                                <div className="bg-[var(--destructive)]/10 px-3 py-1 rounded-full flex items-center gap-1">
                                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-[var(--destructive)] text-xs" />
                                  <span className="text-xs font-medium text-[var(--destructive)]">แจ้งเตือน</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {attributes.warningtext && (
                          <div className="mb-5 p-4 bg-[var(--destructive)]/10 rounded-xl border border-[var(--destructive)]/20">
                            <p className="text-sm font-medium text-[var(--destructive)]">
                              {attributes.warningtext}
                            </p>
                            {attributes.subwarningtext && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                                {attributes.subwarningtext}
                              </p>
                            )}
                          </div>
                        )}


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          {attributes.phone && (
                            <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                              <FontAwesomeIcon icon={faPhone} className="w-4 h-4 text-[var(--primary)]" />
                              <span>{formatPhoneNumber(attributes.phone)}</span>
                            </div>
                          )}
                          {attributes.website && (
                            <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                              <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 text-[var(--primary)]" />
                              <a 
                                href={attributes.website.startsWith('http') ? attributes.website : `https://${attributes.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--primary)] hover:underline truncate"
                              >
                                {attributes.website.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          )}
                          {attributes.address && (
                            <div className="flex items-start gap-3 text-[var(--muted-foreground)] sm:col-span-2">
                              <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-[var(--primary)] mt-0.5" />
                              <span className="leading-relaxed">{attributes.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Action */}
                      <div className="flex lg:flex-col gap-3 lg:items-end">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={() => handleEdit({ id, ...attributes })}
                            className="px-6 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl font-medium shadow-md hover:bg-opacity-90 transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                          >
                            <FontAwesomeIcon icon={faPencil} className="w-4 h-4" />
                            แก้ไขข้อมูล
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {!editingHospitel && !creatingNew && (
          <motion.button
            onClick={handleCreateNew}
            className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-10"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            aria-label="เพิ่มโรงพยาบาลใหม่"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xl" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}