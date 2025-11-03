'use client';

import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPrint,
  faArrowLeft,
  faUser,
  faCalendarCheck,
  faHourglassHalf,
  faFlask,
  faMapMarkerAlt,
  faPhone,
  faGlobe,
  faTimesCircle,
  faInfoCircle,
  faSyringe,
  faQuestionCircle,
  faHospital,
  faClock,
  faIdCard,
  faCheckCircle,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { cn } from '@/lib/utils';

// DayJS Setup
dayjs.locale('th');
dayjs.extend(buddhistEra);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Bangkok');

// Animation Variants
const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut', staggerChildren: 0.1 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};
const buttonVariants = {
  hover: { scale: 1.05, boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)', transition: { duration: 0.15 } },
  tap: { scale: 0.95 },
};

// Custom Dialog Component
const CustomDialog = ({ isOpen, onClose, title, text, icon, buttons = [] }) => {
  if (!isOpen) return null;
  const icons = {
    error: <FontAwesomeIcon icon={faTimesCircle} className="h-4 w-4 text-[var(--destructive)]" />,
    success: <FontAwesomeIcon icon={faCheckCircle} className="h-4 w-4 text-[var(--primary)]" />,
    warning: <FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4 text-amber-500" />,
  };
  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-2 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[var(--card)] border border-[var(--border)]/50 rounded-[var(--radius)] shadow-sm p-2.5 max-w-[280px] w-full"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="dialog-title"
      >
        <div className="bg-[var(--primary)] h-0.5 rounded-full mb-1.5"></div>
        <div className="text-center">
          {icon && <div className="flex justify-center mb-1">{icons[icon]}</div>}
          <h3 id="dialog-title" className="text-[0.85rem] font-semibold text-[var(--card-foreground)]">{title}</h3>
          {text && <p className="text-[0.7rem] text-[var(--muted-foreground)] mt-1">{text}</p>}
          <div className="mt-2.5 flex flex-col gap-1.5">
            {buttons.map((button, index) => (
              <motion.div
                key={index}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  onClick={button.onClick}
                  variant={button.variant || 'default'}
                  className={cn(
                    'w-full px-5 py-3 text-sm font-medium rounded-[var(--radius)] transition-all duration-200 shadow-sm',
                    button.variant === 'destructive'
                      ? 'bg-[var(--destructive)] text-[var(--primary-foreground)] hover:bg-[var(--destructive)]/90 focus-visible:ring-[var(--destructive)]'
                      : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 focus-visible:ring-[var(--ring)]'
                  )}
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

// Main Component
export default function AppointmentDetailPage() {
  const [appointment, setAppointment] = useState(null);
  const [hospitel, setHospitel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false });
  const [appointmentId, setAppointmentId] = useState(null);

  useEffect(() => {
    setMounted(true);
    const id = window.location.pathname.split('/').pop();
    if (id && !isNaN(id)) setAppointmentId(id);
  }, []);

  const showDialog = (options) => setDialog({ isOpen: true, onClose: hideDialog, ...options });
  const hideDialog = () => setDialog((prev) => ({ ...prev, isOpen: false }));
  const formatTime = (time) => (time && /^\d{2}:\d{2}/.test(time) ? time.substring(0, 5) : '-');

  useEffect(() => {
    const fetchData = async () => {
      if (!appointmentId) return;
      setLoading(true);
      try {
        const jwt = sessionStorage.getItem('jwt');
        const userId = sessionStorage.getItem('userId');
        if (!jwt || !userId) throw new Error('กรุณาเข้าสู่ระบบใหม่');

        const headers = {
          Authorization: `Bearer ${jwt}`,
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0',
        };
        const [appointmentRes, hospitelRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${appointmentId}?populate=*&filters[users_permissions_user][id][$eq]=${userId}`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels?populate=*`, { headers }),
        ]);

        if (!appointmentRes.ok) throw new Error(`HTTP error! status: ${appointmentRes.status}`);
        if (!hospitelRes.ok) throw new Error(`HTTP error! status: ${hospitelRes.status}`);

        const appointmentJson = await appointmentRes.json();
        const hospitelJson = await hospitelRes.json();

        if (!appointmentJson.data) throw new Error('ไม่พบข้อมูลใบนัด');
        if (!hospitelJson.data?.[0]) throw new Error('ไม่พบข้อมูลโรงพยาบาล');

        const normalizedAppointment = {
          id: appointmentJson.data.id,
          attributes: {
            bookingDate: appointmentJson.data.attributes?.bookingDate || appointmentJson.data.bookingDate,
            startTime: appointmentJson.data.attributes?.startTime || appointmentJson.data.startTime,
            endTime: appointmentJson.data.attributes?.endTime || appointmentJson.data.endTime,
            booking_status: appointmentJson.data.attributes?.booking_status || 'confirmed',
            vaccination_status: appointmentJson.data.attributes?.vaccination_status || 'not_started',
            patient: appointmentJson.data.attributes?.patient || appointmentJson.data.patient || { data: null },
            vaccine: appointmentJson.data.attributes?.vaccine || appointmentJson.data.vaccine || { data: null },
          },
        };

        setAppointment(normalizedAppointment);
        setHospitel(hospitelJson.data[0].attributes);
      } catch (error) {
        console.error('Error fetching appointment data:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        showDialog({
          title: 'เกิดข้อผิดพลาด',
          text: errorMessage,
          icon: 'error',
          buttons: [
            { text: 'ปิด', onClick: hideDialog },
            {
              text: 'ตกลง',
              onClick: () => {
                hideDialog();
                if (errorMessage.includes('เข้าระบบ')) window.location.href = '/login';
              },
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    if (appointmentId) fetchData();
  }, [appointmentId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCancel = () => {
    showDialog({
      title: 'ยืนยันการยกเลิก?',
      text: `คุณต้องการยกเลิกใบนัด #${appointment.id} สำหรับวัคซีน ${appointment.attributes.vaccine?.data?.attributes?.title || 'ไม่ระบุ'} วันที่ ${dayjs(appointment.attributes.bookingDate).locale('th').format('D MMM BBBB')} เวลา ${formatTime(appointment.attributes.startTime)} - ${formatTime(appointment.attributes.endTime)} น. หรือไม่?`,
      icon: 'warning',
      buttons: [
        { text: 'ปิด', onClick: hideDialog },
        {
          text: 'ยกเลิก',
          variant: 'destructive',
          onClick: async () => {
            try {
              const jwt = sessionStorage.getItem('jwt');
              if (!jwt) throw new Error('กรุณาเข้าสู่ระบบใหม่');

              await axios.put(
                `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${appointment.id}`,
                { data: { booking_status: 'cancelled' } },
                {
                  headers: {
                    Authorization: `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                    Expires: '0',
                  },
                  timeout: 5000,
                }
              );

              showDialog({
                title: 'ยกเลิกสำเร็จ',
                text: 'ใบนัดถูกยกเลิกเรียบร้อยแล้ว',
                icon: 'success',
                buttons: [
                  {
                    text: 'ไปที่หน้าวัคซีน',
                    onClick: () => {
                      hideDialog();
                      const vaccineId = appointment.attributes.vaccine?.data?.id;
                      window.location.href = vaccineId ? `/vaccines/${vaccineId}` : '/vaccines';
                    },
                  },
                ],
              });

              setAppointment((prev) => ({
                ...prev,
                attributes: { ...prev.attributes, booking_status: 'cancelled' },
              }));
            } catch (error) {
              console.error('Error cancelling appointment:', error);
              const errorMessage = error.response?.data?.error?.message || error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
              if (axios.isAxiosError(error) && error.response?.status === 401) {
                sessionStorage.clear();
                window.dispatchEvent(new Event('session-updated'));
                showDialog({
                  title: 'ต้องเข้าสู่ระบบใหม่',
                  text: 'เซสชันหมดอายุ กรุณาลองอีกครั้ง',
                  icon: 'error',
                  buttons: [
                    { text: 'ปิด', onClick: hideDialog },
                    {
                      text: 'ตกลง',
                      onClick: () => {
                        hideDialog();
                        window.location.href = '/login';
                      },
                    },
                  ],
                });
                return;
              }
              showDialog({
                title: 'เกิดข้อผิดพลาด',
                text: errorMessage,
                icon: 'error',
                buttons: [
                  { text: 'ปิด', onClick: hideDialog },
                  { text: 'ตกลง', onClick: hideDialog },
                ],
              });
            }
          },
        },
      ],
    });
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <motion.div
          className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--primary)] animate-spin rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!appointment?.attributes) {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center p-2.5 bg-[var(--card)] rounded-[var(--radius)] shadow-sm border border-[var(--border)]/50 max-w-[280px] mx-auto"
      >
        <FontAwesomeIcon icon={faTimesCircle} className="h-4 w-4 text-[var(--destructive)] mb-1" />
        <h2 className="text-[0.85rem] font-semibold text-[var(--card-foreground)] mb-1 text-center">ไม่พบข้อมูลใบนัด</h2>
        <p className="text-[0.7rem] text-[var(--muted-foreground)] mb-1.5 text-center">กรุณาตรวจสอบหมายเลขใบนัด</p>
        <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
          <Button
            onClick={() => (window.location.href = '/appointment')}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-5 py-3 text-sm rounded-[var(--radius)] font-medium shadow-sm hover:bg-[var(--primary)]/90 transition-all duration-200"
            aria-label="กลับไปหน้าใบนัด"
          >
            กลับไปหน้าใบนัด
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  const patientData = appointment.attributes.patient?.data?.attributes ?? { first_name: 'ไม่ระบุ', last_name: '' };
  const vaccineData = appointment.attributes.vaccine?.data?.attributes ?? { title: 'ไม่ระบุวัคซีน' };

  const StatusBadge = ({ status }) => {
    const statusStyles = {
      cancelled: { text: 'ยกเลิก', color: 'bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/50', icon: faTimesCircle },
      confirmed: { text: 'ยืนยัน', color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/50', icon: faCheckCircle },
      default: { text: 'รอยืนยัน', color: 'bg-amber-100/10 text-amber-500 border-amber-500/50', icon: faHourglassHalf },
    };
    const { text, color, icon } = statusStyles[status] || statusStyles.default;
    return (
      <motion.div
        variants={itemVariants}
        className={cn('inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[0.6rem] font-medium border', color)}
      >
        <FontAwesomeIcon icon={icon} className="w-2 h-2" />
        <span>{text}</span>
      </motion.div>
    );
  };

  const VaccinationStatusBadge = ({ vaccinationStatus }) => {
    const statusStyles = {
      vaccinated: { text: 'ฉีดแล้ว', color: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/50', icon: faSyringe },
      not_started: { text: 'ยังไม่ฉีด', color: 'bg-amber-100/10 text-amber-500 border-amber-500/50', icon: faSyringe },
      default: { text: 'ไม่ระบุ', color: 'bg-[var(--muted)]/10 text-[var(--muted-foreground)] border-[var(--border)]/50', icon: faQuestionCircle },
    };
    const { text, color, icon } = statusStyles[vaccinationStatus] || statusStyles.default;
    return (
      <motion.div
        variants={itemVariants}
        className={cn('inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[0.6rem] font-medium border', color)}
      >
        <FontAwesomeIcon icon={icon} className="w-2 h-2" />
        <span>{text}</span>
      </motion.div>
    );
  };

  return (
    <>
      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: var(--primary);
          border-radius: 9999px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background-color: rgba(243, 244, 246, 0.2);
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            margin: 0 !important;
          }
          .print-hidden, nav, header, footer {
            display: none !important;
          }
          main {
            padding: 0.15rem !important;
            background: white !important;
          }
          .print-card {
            border: 1px solid var(--border) !important;
            margin: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          .card-header, .card-content, .card-footer {
            padding: 0.15rem !important;
          }
          p, span {
            font-size: 7px !important;
          }
          .text-[0.6rem] {
            font-size: 6px !important;
          }
          .text-[0.7rem] {
            font-size: 7px !important;
          }
          .text-[0.85rem] {
            font-size: 8px !important;
          }
          svg {
            width: 6px !important;
            height: 6px !important;
          }
        }
      `}</style>
      <main className="min-h-screen bg-[var(--background)] py-2 px-2 font-prompt">
        <CustomDialog {...dialog} />
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="max-w-[280px] mx-auto"
        >
          <Card id="appointment-card" className="bg-[var(--card)] border border-[var(--border)]/50 shadow-sm rounded-[var(--radius)] overflow-hidden print-card">
            <CardHeader className="p-1.5 bg-[var(--secondary)]/10">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-start gap-1">
                  <motion.div variants={itemVariants} className="flex flex-col gap-0.5">
                    <h1 className="text-[0.85rem] font-semibold text-[var(--card-foreground)]">
                      ใบนัดฉีดวัคซีน #{appointment.id}
                    </h1>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={appointment.attributes.booking_status} />
                      <VaccinationStatusBadge vaccinationStatus={appointment.attributes.vaccination_status} />
                    </div>
                  </motion.div>
                  <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="print-hidden">
                    <Button
                      variant="outline"
                      onClick={() => window.history.back()}
                      className="px-5 py-3 text-sm font-medium text-[var(--primary)] border-[var(--primary)]/50 hover:bg-[var(--primary)]/10 rounded-[var(--radius)] transition-all duration-200 shadow-sm"
                      aria-label="ย้อนกลับ"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">ย้อนกลับ</span>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-1.5 space-y-1">
              {/* Patient Information Card */}
              <motion.div variants={itemVariants} className="bg-[var(--secondary)]/10 rounded-[var(--radius)] p-1.5 border border-[var(--border)]/30">
                <div className="flex items-center gap-1 mb-1">
                  <div className="bg-[var(--primary)] text-[var(--primary-foreground)] p-1 rounded-full">
                    <FontAwesomeIcon icon={faUser} className="w-2 h-2" />
                  </div>
                  <h2 className="text-[0.75rem] font-semibold text-[var(--card-foreground)]">ผู้ป่วย</h2>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faIdCard} className="w-2 h-2 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[0.6rem] text-[var(--muted-foreground)]">ชื่อ</p>
                      <p className="text-[0.7rem] font-medium text-[var(--card-foreground)]">
                        {patientData.first_name} {patientData.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faFlask} className="w-2 h-2 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[0.6rem] text-[var(--muted-foreground)]">วัคซีน</p>
                      <p className="text-[0.7rem] font-medium text-[var(--card-foreground)]">{vaccineData.title}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Appointment Details Card */}
              <motion.div variants={itemVariants} className="bg-[var(--secondary)]/10 rounded-[var(--radius)] p-1.5 border border-[var(--border)]/30">
                <div className="flex items-center gap-1 mb-1">
                  <div className="bg-[var(--primary)] text-[var(--primary-foreground)] p-1 rounded-full">
                    <FontAwesomeIcon icon={faCalendarCheck} className="w-2 h-2" />
                  </div>
                  <h2 className="text-[0.75rem] font-semibold text-[var(--card-foreground)]">การนัด</h2>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendarCheck} className="w-2 h-2 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[0.6rem] text-[var(--muted-foreground)]">วันที่</p>
                      <p className="text-[0.7rem] font-medium text-[var(--card-foreground)]">
                        {dayjs(appointment.attributes.bookingDate).locale('th').format('D MMM BBBB')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faClock} className="w-2 h-2 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[0.6rem] text-[var(--muted-foreground)]">เวลา</p>
                      <p className="text-[0.7rem] font-medium text-[var(--card-foreground)]">
                        {formatTime(appointment.attributes.startTime)} - {formatTime(appointment.attributes.endTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="w-2 h-2 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[0.6rem] text-[var(--muted-foreground)]">สถานที่</p>
                      <p className="text-[0.7rem] font-medium text-[var(--card-foreground)]">
                        {hospitel?.name || 'โรงพยาบาล'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Hospital Information Card */}
              <motion.div variants={itemVariants} className="bg-[var(--secondary)]/10 rounded-[var(--radius)] p-1.5 border border-[var(--border)]/30">
                <div className="flex items-center gap-1 mb-1">
                  <div className="bg-[var(--primary)] text-[var(--primary-foreground)] p-1 rounded-full">
                    <FontAwesomeIcon icon={faHospital} className="w-2 h-2" />
                  </div>
                  <h2 className="text-[0.75rem] font-semibold text-[var(--card-foreground)]">โรงพยาบาล</h2>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faPhone} className="w-2 h-2 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[0.6rem] text-[var(--muted-foreground)]">โทร</p>
                      <p className="text-[0.7rem] font-medium text-[var(--card-foreground)]">
                        {hospitel?.phone || 'ไม่ระบุ'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faGlobe} className="w-2 h-2 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[0.6rem] text-[var(--muted-foreground)]">เว็บ</p>
                      {hospitel?.website ? (
                        <a
                          href={hospitel.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[0.7rem] font-medium text-[var(--primary)] hover:underline"
                        >
                          {hospitel.website}
                        </a>
                      ) : (
                        <p className="text-[0.7rem] font-medium text-[var(--card-foreground)]">ไม่ระบุ</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Important Information Card */}
              <motion.div variants={itemVariants} className="bg-[var(--secondary)]/10 rounded-[var(--radius)] p-1.5 border border-[var(--border)]/30">
                <div className="flex items-start gap-1">
                  <div className="bg-[var(--primary)] text-[var(--primary-foreground)] p-1 rounded-full mt-0.5">
                    <FontAwesomeIcon icon={faInfoCircle} className="w-2 h-2" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-[0.75rem] font-semibold text-[var(--card-foreground)] mb-1">คำแนะนำ</h2>
                    <ul className="space-y-0.5">
                      {hospitel?.warningtext && (
                        <li className="flex items-start gap-0.5">
                          <span className="text-[var(--primary)] mt-0.5 text-[0.6rem]">•</span>
                          <p className="text-[0.7rem] text-[var(--card-foreground)]">{hospitel.warningtext}</p>
                        </li>
                      )}
                      {hospitel?.subwarningtext && (
                        <li className="flex items-start gap-0.5">
                          <span className="text-[var(--primary)] mt-0.5 text-[0.6rem]">•</span>
                          <p className="text-[0.7rem] text-[var(--card-foreground)]">{hospitel.subwarningtext}</p>
                        </li>
                      )}
                      {!hospitel?.warningtext && !hospitel?.subwarningtext && (
                        <li className="flex items-start gap-0.5">
                          <span className="text-[var(--primary)] mt-0.5 text-[0.6rem]">•</span>
                          <p className="text-[0.7rem] text-[var(--card-foreground)]">ไม่มีคำแนะนำเพิ่มเติม</p>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </CardContent>

            <CardFooter className="p-1.5 bg-[var(--secondary)]/10 border-t border-[var(--border)]/50 flex flex-col gap-1 print-hidden">
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="flex-1">
                <Button
                  onClick={handlePrint}
                  className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] px-5 py-3 text-sm rounded-[var(--radius)] font-medium shadow-sm hover:bg-[var(--primary)]/90 transition-all duration-200"
                  aria-label="พิมพ์ใบนัด"
                >
                  <FontAwesomeIcon icon={faPrint} className="h-4 w-4 mr-1" />
                  พิมพ์
                </Button>
              </motion.div>
              {appointment.attributes.booking_status !== 'cancelled' && (
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="flex-1">
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    className="w-full bg-[var(--destructive)] text-[var(--primary-foreground)] px-4 py-3 text-sm rounded-[var(--radius)] font-medium shadow-sm hover:bg-[var(--destructive)]/90 transition-all duration-200"
                    aria-label="ยกเลิกใบนัด"
                  >
                    <FontAwesomeIcon icon={faTimesCircle} className="h-4 w-4 mr-1" />
                    ยกเลิก
                  </Button>
                </motion.div>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </main>
    </>
  );
}