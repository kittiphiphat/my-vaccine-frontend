'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { CalendarDays, Users, Info } from 'lucide-react';
import { VaccineBookingDialog } from '@/app/booking/page';


dayjs.locale('th');
dayjs.extend(advancedFormat);

const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];

export default function VaccineDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vaccine, setVaccine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('ไม่พบ ID วัคซีนใน URL');
      setLoading(false);
      return;
    }

    const fetchVaccine = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines/${id}?populate=*`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const data = await res.json();
        if (data?.data) setVaccine(data.data);
        else setError('ไม่พบข้อมูลวัคซีน');
      } catch (err) {
        setError(`เกิดข้อผิดพลาด: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVaccine();
  }, [id]);

  if (loading) return <p className="text-center mt-10 text-gray-500">กำลังโหลดข้อมูล...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;
  if (!vaccine?.attributes) return <p className="text-center mt-10 text-red-500">ไม่พบข้อมูลวัคซีน</p>;

  const attr = vaccine.attributes;
  const serviceDays = Array.isArray(attr.vaccine_service_days?.data)
    ? attr.vaccine_service_days.data.flatMap((d) => {
        const days = d?.attributes?.day_of_week;
        if (Array.isArray(days)) return days.filter((day) => typeof day === 'number');
        if (typeof days === 'number') return [days];
        return [];
      })
    : [];
  const uniqueServiceDays = Array.from(new Set(serviceDays)).sort();
  const formatDate = (date) => (date ? dayjs(date).format('D MMMM YYYY') : '-');
  const isEveryDay = uniqueServiceDays.length === 7;

  return (
    <div className="max-w-3xl mx-auto mt-12 bg-white shadow-xl rounded-3xl border p-8 space-y-8 font-Prompt">
      {/* ปุ่มย้อนกลับ */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push('/vaccines')}
          className="no-print inline-flex items-center text-sm px-4 py-2 text-white bg-[#F9669D] hover:bg-[#e35689] rounded-xl shadow transition"
        >
          ← ย้อนกลับ
        </button>
      </div>


      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[#30266D]">{attr.title || 'ไม่ระบุชื่อวัคซีน'}</h1>
        <p className="text-gray-600 text-base">{attr.description || 'ไม่มีคำอธิบาย'}</p>
        <hr className="border-t border-gray-200 mt-4" />
      </div>

      {/* รายละเอียด */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">

        
        <InfoItem icon={<Users className="w-4 h-4" />} label="ช่วงอายุที่รับ">
          {attr.minAge != null && attr.maxAge != null ? `${attr.minAge} - ${attr.maxAge} ปี` : 'ไม่ระบุ'}
        </InfoItem>

        <InfoItem icon={<Info className="w-4 h-4" />} label="เพศที่สามารถจอง">
          {{
            any: 'ทุกเพศ',
            male: 'ชาย',
            female: 'หญิง',
          }[attr.gender] || 'ไม่ระบุ'}
        </InfoItem>

        <InfoItem icon={<CalendarDays className="w-4 h-4" />} label="วันที่เปิดจอง">
          {attr.bookingStartDate && attr.bookingEndDate
            ? `${formatDate(attr.bookingStartDate)} - ${formatDate(attr.bookingEndDate)}`
            : 'ไม่ระบุ'}
        </InfoItem>

        <InfoItem icon={<CalendarDays className="w-4 h-4" />} label="วันให้บริการ">
          {isEveryDay
            ? 'เปิดทุกวัน'
            : uniqueServiceDays.length > 0
            ? uniqueServiceDays.map((d) => dayNames[d] || 'ไม่ระบุ').join(', ')
            : 'ไม่ระบุ'}
        </InfoItem>

        <InfoItem icon={<Users className="w-4 h-4" />} label="โควตาทั้งหมด">
          {attr.maxQuota != null ? `${attr.maxQuota} คน` : 'ไม่ระบุ'}
        </InfoItem>

        <InfoItem icon={<Users className="w-4 h-4" />} label="จองแล้ว">
          {attr.booked != null ? `${attr.booked} คน` : 'ไม่ระบุ'}
        </InfoItem>
      </div>

      <div className="pt-6 text-center no-print">
        <VaccineBookingDialog vaccine={vaccine} />
      </div>
    </div>
  );
}

function InfoItem({ icon, label, children }) {
  return (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-150">
      <div className="flex items-center gap-2 mb-2 text-[#30266D] font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-gray-800">{children}</div>
    </div>
  );
}