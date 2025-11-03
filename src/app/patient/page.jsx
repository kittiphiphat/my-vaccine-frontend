'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import withReactContent from 'sweetalert2-react-content';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, 
  faCalendarAlt, 
  faPhone, 
  faHome, 
  faVenusMars, 
  faEnvelope,
  faCheck,
  faExclamationTriangle,
  faSave,
  faNotesMedical
} from '@fortawesome/free-solid-svg-icons';

const MySwal = withReactContent(Swal);

const inputVariants = {
  focus: { scale: 1.02, transition: { duration: 0.2 } },
};

const buttonVariants = {
  hover: { scale: 1.03, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
};

const cardVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.1 } 
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function PatientInfo() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
  });
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAndLoadData() {
      const jwt = sessionStorage.getItem('jwt');
      const userIdFromSession = sessionStorage.getItem('userId');

      if (!jwt || !userIdFromSession) {
        router.push('/login');
        return;
      }

      try {
        const patientRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${userIdFromSession}`,
          { method: 'GET', headers: { Authorization: `Bearer ${jwt}` } }
        );

        if (!patientRes.ok) throw new Error('เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ป่วย');
        const patientData = await patientRes.json();
        const hasPatient = Array.isArray(patientData.data) && patientData.data.length > 0;

        if (hasPatient) {
          router.replace('/welcome');
          return;
        }

        const userRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!userRes.ok) throw new Error('ไม่สามารถดึงข้อมูลผู้ใช้ได้');
        const userData = await userRes.json();

        setCurrentUserId(userIdFromSession);
        setFormData(prev => ({ ...prev, email: userData.email || '' }));
      } catch (error) {
        await MySwal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: `ไม่สามารถโหลดข้อมูลได้: ${error.message}`,
          confirmButtonText: 'กลับไปหน้า Login',
          customClass: {
            popup: 'shadow-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-md',
            title: 'text-xl font-bold text-[var(--card-foreground)]',
            htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
            confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 shadow-md',
          },
          background: 'transparent',
        });
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    checkAndLoadData();
  }, [router]);

  const validateForm = () => {
    const newErrors = {};
    const thaiEnglishRegex = /^[ก-๙a-zA-Z\s-]+$/;
    const phoneRegex = /^0[6-9][0-9]{8}$/;
    const today = dayjs();

    if (!formData.first_name.trim()) newErrors.first_name = 'กรุณากรอกชื่อ';
    else if (!thaiEnglishRegex.test(formData.first_name)) newErrors.first_name = 'ชื่อต้องประกอบด้วยตัวอักษรไทยหรืออังกฤษเท่านั้น';
    else if (formData.first_name.length > 50) newErrors.first_name = 'ชื่อต้องไม่เกิน 50 ตัวอักษร';

    if (!formData.last_name.trim()) newErrors.last_name = 'กรุณากรอกนามสกุล';
    else if (!thaiEnglishRegex.test(formData.last_name)) newErrors.last_name = 'นามสกุลต้องประกอบด้วยตัวอักษรไทยหรืออังกฤษเท่านั้น';
    else if (formData.last_name.length > 50) newErrors.last_name = 'นามสกุลต้องไม่เกิน 50 ตัวอักษร';

    if (!formData.birth_date) newErrors.birth_date = 'กรุณากรอกวันเกิด';
    else {
      const birthDate = dayjs(formData.birth_date);
      if (!birthDate.isValid()) newErrors.birth_date = 'วันเกิดไม่ถูกต้อง';
      else if (birthDate.isAfter(today)) newErrors.birth_date = 'วันเกิดต้องไม่เป็นวันที่ในอนาคต';
      else if (today.diff(birthDate, 'year') < 1) newErrors.birth_date = 'ต้องมีอายุอย่างน้อย 1 ปี';
    }

    if (!formData.phone.trim()) newErrors.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!phoneRegex.test(formData.phone)) newErrors.phone = 'เบอร์โทรศัพท์ต้องเป็น 10 หลัก เริ่มต้นด้วย 06, 08, หรือ 09';

    if (!formData.address.trim()) newErrors.address = 'กรุณากรอกที่อยู่';
    else if (formData.address.length < 10) newErrors.address = 'ที่อยู่ต้องมีอย่างน้อย 10 ตัวอักษร';
    else if (formData.address.length > 200) newErrors.address = 'ที่อยู่ต้องไม่เกิน 200 ตัวอักษร';

    if (!formData.gender) newErrors.gender = 'กรุณาเลือกเพศ';
    else if (!['male', 'female'].includes(formData.gender)) newErrors.gender = 'เพศต้องเป็น ชาย หรือ หญิง';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'first_name' || name === 'last_name' ? value.trimStart() : value,
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUserId) {
      await MySwal.fire({
        icon: 'warning',
        title: 'Session ไม่ถูกต้อง',
        text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        customClass: {
          popup: 'shadow-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 shadow-md',
        },
        background: 'transparent',
      });
      router.push('/login');
      return;
    }

    if (!validateForm()) {
      await MySwal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง',
        text: 'กรุณาตรวจสอบข้อมูลในช่องที่มีข้อผิดพลาด',
        customClass: {
          popup: 'shadow-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 shadow-md',
        },
        background: 'transparent',
      });
      return;
    }

    const result = await MySwal.fire({
      title: 'ยืนยันการบันทึกข้อมูล?',
      html: `
        <div class="text-left text-base text-[var(--muted-foreground)]">
          <p><strong>ชื่อ-สกุล:</strong> ${formData.first_name} ${formData.last_name}</p>
          <p><strong>วันเกิด:</strong> ${dayjs(formData.birth_date).format('DD MMMM YYYY')}</p>
          <p><strong>เบอร์โทร:</strong> ${formData.phone}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'shadow-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-md',
        title: 'text-xl font-bold text-[var(--card-foreground)]',
        htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
        confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 shadow-md',
        cancelButton: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-all duration-300 shadow-md',
      },
      background: 'transparent',
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);
    const jwt = sessionStorage.getItem('jwt');
    const payload = { data: { ...formData, is_verified: true, user: currentUserId } };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'เกิดข้อผิดพลาดขณะบันทึกข้อมูล');
      }

      await MySwal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ!',
        text: 'ข้อมูลผู้ป่วยของคุณถูกบันทึกเรียบร้อยแล้ว',
        customClass: {
          popup: 'shadow-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 shadow-md',
        },
        background: 'transparent',
      });

      router.push('/welcome');
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
        customClass: {
          popup: 'shadow-xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-md',
          title: 'text-xl font-bold text-[var(--card-foreground)]',
          htmlContainer: 'text-base text-[var(--muted-foreground)] mb-4',
          confirmButton: 'bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-300 shadow-md',
        },
        background: 'transparent',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        className="min-h-screen flex items-center justify-center bg-[var(--background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center">
          <motion.div
            className="w-16 h-16 border-4 border-[var(--secondary)] border-t-[var(--primary)] rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
          <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            กำลังตรวจสอบข้อมูล...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] font-[var(--font-base)]">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2326A69A' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
          }}
        />
      </div>

      <motion.div
        className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="max-w-2xl w-full"
        >
          <Card className="shadow-2xl rounded-[var(--radius)] p-6 md:p-8 border border-[var(--border)] bg-[var(--card)] relative overflow-hidden">
            {/* Gradient Header */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] opacity-90" />
            
            <CardHeader className="flex flex-col items-center gap-4 pb-6 relative z-10">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg bg-white border-4 border-white"
              >
                <FontAwesomeIcon icon={faNotesMedical} className="w-10 h-10 text-[var(--primary)]" />
              </motion.div>
              <div className="text-center">
                <CardTitle className="text-3xl font-bold text-white drop-shadow-md">
                  กรอกข้อมูลผู้ป่วย
                </CardTitle>
                <p className="text-base mt-2 text-white/90 drop-shadow">
                  กรุณากรอกข้อมูลให้ครบถ้วนเพื่อดำเนินการต่อ
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10 mt-4">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <motion.div variants={itemVariants}>
                  <label className="block text-base font-semibold mb-2 text-[var(--card-foreground)]">
                    ชื่อ
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faUser} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors"
                      style={{ color: focusedField === 'first_name' ? 'var(--primary)' : 'var(--muted-foreground)' }}
                    />
                    <Input
                      type="text"
                      name="first_name"
                      placeholder="กรอกชื่อจริง"
                      value={formData.first_name}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('first_name')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 py-3 rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--secondary-light)] ${
                        errors.first_name ? 'ring-2 ring-[var(--destructive)]' : ''
                      }`}
                      style={{ 
                        borderColor: focusedField === 'first_name' ? 'var(--primary)' : 'var(--border)',
                        ringColor: focusedField === 'first_name' ? 'var(--primary)' : 'transparent'
                      }}
                    />
                    {formData.first_name && !errors.first_name && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.first_name && (
                      <motion.p className="flex items-center mt-1 text-xs text-[var(--destructive)]">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 mr-1" />
                        {errors.first_name}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Last Name */}
                <motion.div variants={itemVariants}>
                  <label className="block text-base font-semibold mb-2 text-[var(--card-foreground)]">
                    นามสกุล
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faUser} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors"
                      style={{ color: focusedField === 'last_name' ? 'var(--primary)' : 'var(--muted-foreground)' }}
                    />
                    <Input
                      type="text"
                      name="last_name"
                      placeholder="กรอกนามสกุล"
                      value={formData.last_name}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('last_name')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 py-3 rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--secondary-light)] ${
                        errors.last_name ? 'ring-2 ring-[var(--destructive)]' : ''
                      }`}
                      style={{ 
                        borderColor: focusedField === 'last_name' ? 'var(--primary)' : 'var(--border)',
                        ringColor: focusedField === 'last_name' ? 'var(--primary)' : 'transparent'
                      }}
                    />
                    {formData.last_name && !errors.last_name && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.last_name && (
                      <motion.p className="flex items-center mt-1 text-xs text-[var(--destructive)]">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 mr-1" />
                        {errors.last_name}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Birth Date */}
                <motion.div variants={itemVariants}>
                  <label className="block text-base font-semibold mb-2 text-[var(--card-foreground)]">
                    วันเกิด
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faCalendarAlt} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors"
                      style={{ color: focusedField === 'birth_date' ? 'var(--primary)' : 'var(--muted-foreground)' }}
                    />
                    <Input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('birth_date')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 py-3 rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--secondary-light)] ${
                        errors.birth_date ? 'ring-2 ring-[var(--destructive)]' : ''
                      }`}
                      style={{ 
                        borderColor: focusedField === 'birth_date' ? 'var(--primary)' : 'var(--border)',
                        ringColor: focusedField === 'birth_date' ? 'var(--primary)' : 'transparent'
                      }}
                    />
                    {formData.birth_date && !errors.birth_date && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.birth_date && (
                      <motion.p className="flex items-center mt-1 text-xs text-[var(--destructive)]">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 mr-1" />
                        {errors.birth_date}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Phone */}
                <motion.div variants={itemVariants}>
                  <label className="block text-base font-semibold mb-2 text-[var(--card-foreground)]">
                    เบอร์โทรศัพท์
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faPhone} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors"
                      style={{ color: focusedField === 'phone' ? 'var(--primary)' : 'var(--muted-foreground)' }}
                    />
                    <Input
                      type="tel"
                      name="phone"
                      placeholder="เช่น 0812345678"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-12 py-3 rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--secondary-light)] ${
                        errors.phone ? 'ring-2 ring-[var(--destructive)]' : ''
                      }`}
                      style={{ 
                        borderColor: focusedField === 'phone' ? 'var(--primary)' : 'var(--border)',
                        ringColor: focusedField === 'phone' ? 'var(--primary)' : 'transparent'
                      }}
                    />
                    {formData.phone && !errors.phone && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.phone && (
                      <motion.p className="flex items-center mt-1 text-xs text-[var(--destructive)]">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 mr-1" />
                        {errors.phone}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Address */}
                <motion.div variants={itemVariants} className="md:col-span-2">
                  <label className="block text-base font-semibold mb-2 text-[var(--card-foreground)]">
                    ที่อยู่
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faHome} 
                      className="absolute left-4 top-4 h-5 w-5 transition-colors"
                      style={{ color: focusedField === 'address' ? 'var(--primary)' : 'var(--muted-foreground)' }}
                    />
                    <Textarea
                      name="address"
                      placeholder="กรอกที่อยู่ปัจจุบัน"
                      value={formData.address}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('address')}
                      onBlur={() => setFocusedField(null)}
                      rows={4}
                      className={`w-full pl-12 py-3 rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--secondary-light)] ${
                        errors.address ? 'ring-2 ring-[var(--destructive)]' : ''
                      }`}
                      style={{ 
                        borderColor: focusedField === 'address' ? 'var(--primary)' : 'var(--border)',
                        ringColor: focusedField === 'address' ? 'var(--primary)' : 'transparent'
                      }}
                    />
                    {formData.address && !errors.address && (
                      <div className="absolute right-4 top-4">
                        <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.address && (
                      <motion.p className="flex items-center mt-1 text-xs text-[var(--destructive)]">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 mr-1" />
                        {errors.address}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Gender */}
                <motion.div variants={itemVariants}>
                  <label className="block text-base font-semibold mb-2 text-[var(--card-foreground)]">
                    เพศ
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faVenusMars} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-colors"
                      style={{ color: focusedField === 'gender' ? 'var(--primary)' : 'var(--muted-foreground)' }}
                    />
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, gender: value }));
                        setErrors(prev => ({ ...prev, gender: '' }));
                      }}
                      onOpenChange={(open) => setFocusedField(open ? 'gender' : null)}
                    >
                      <SelectTrigger
                        className={`w-full pl-12 py-3 rounded-[var(--radius)] focus:outline-none focus:ring-2 transition-all duration-300 bg-[var(--secondary-light)] ${
                          errors.gender ? 'ring-2 ring-[var(--destructive)]' : ''
                        }`}
                        style={{ 
                          borderColor: focusedField === 'gender' ? 'var(--primary)' : 'var(--border)',
                          ringColor: focusedField === 'gender' ? 'var(--primary)' : 'transparent'
                        }}
                      >
                        <SelectValue placeholder="-- เลือกเพศ --" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[var(--radius)] shadow-lg bg-[var(--card)] border-[var(--border)] text-[var(--card-foreground)]">
                        <SelectItem value="male">ชาย</SelectItem>
                        <SelectItem value="female">หญิง</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.gender && !errors.gender && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <FontAwesomeIcon icon={faCheck} className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.gender && (
                      <motion.p className="flex items-center mt-1 text-xs text-[var(--destructive)]">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="h-4 w-4 mr-1" />
                        {errors.gender}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Email (Read-only) */}
                <motion.div variants={itemVariants}>
                  <label className="block text-base font-semibold mb-2 text-[var(--card-foreground)]">
                    อีเมล
                  </label>
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faEnvelope} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)]"
                    />
                    <Input
                      type="email"
                      value={formData.email}
                      readOnly
                      className="w-full pl-12 py-3 rounded-[var(--radius)] cursor-not-allowed bg-[var(--secondary)] text-[var(--card-foreground)]"
                      style={{ borderColor: 'var(--border)' }}
                    />
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap" className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3 rounded-[var(--radius)] font-semibold shadow-md transition-all duration-300 relative overflow-hidden ${
                      submitting 
                        ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed' 
                        : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full animate-spin mr-2" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faSave} className="w-5 h-5 mr-2" />
                          บันทึกข้อมูล
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}