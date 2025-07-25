'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User, Phone, Calendar, Clock, Syringe, MapPin, FileText } from 'lucide-react';

dayjs.locale('th');

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [appointment, setAppointment] = useState(null);
  const [hospitel, setHospitel] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatTime = (time) => (time ? time.substring(0, 5) : '-');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appointmentRes, hospitelRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-bookings/${id}?populate=patient,vaccine`, {
            credentials: 'include',
          }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels?populate=*`, {
            credentials: 'include',
          }),
        ]);

        const appointmentJson = await appointmentRes.json();
        const hospitelJson = await hospitelRes.json();

        setAppointment(appointmentJson.data);
        setHospitel(hospitelJson);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handlePrint = () => {
    const printContent = document.getElementById('printArea');
    const printWindow = window.open('', '', 'width=1024,height=720');

    // ดึง style และ link stylesheet จากหน้าเว็บปัจจุบัน
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    const html = `
      <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ใบนัดฉีดวัคซีน</title>
          ${styles}
          <link href="https://fonts.googleapis.com/css2?family=Sarabun&display=swap" rel="stylesheet">
          <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                margin: 0;
                padding: 0;
                box-shadow: none;
              }
            }
            body {
              background-color: #30266D;
              color: #FAF9FE;
              font-family: 'Sarabun', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 1.5rem;
              min-height: 100vh;
            }
            .rounded-2xl {
              border-radius: 1rem;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (loading) {
    return <div className="p-6 text-center text-[#30266D]">กำลังโหลดข้อมูล...</div>;
  }

  if (!appointment) {
    return <div className="p-6 text-center text-red-600">ไม่พบข้อมูลใบนัด</div>;
  }

  const hospitelData = hospitel?.data?.[0]?.attributes || {};
  const logoUrl =
    hospitelData.logo?.data?.attributes?.url ?? '/medcmu2.png';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sarabun">
      <div
        id="printArea"
        className="bg-[#30266D] border border-gray-300 rounded-2xl shadow-md p-6 w-full max-w-xl text-[#FAF9FE]"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl.startsWith('http') ? logoUrl : `${process.env.NEXT_PUBLIC_STRAPI_URL}${logoUrl}`}
              alt="Hospital Logo"
              className="h-12 w-auto"
            />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-300">เลขที่นัด</p>
            <p className="font-mono font-bold text-lg text-[#F9669D]">#A-{appointment.id}</p>
          </div>
        </div>

        {/* รายละเอียด */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base mt-6">
          {/* ฝั่งซ้าย */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#F9669D]" />
              <span className="font-semibold">ชื่อ:</span>
              <span>
                {appointment.attributes.patient.data.attributes.first_name} {appointment.attributes.patient.data.attributes.last_name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#F9669D]" />
              <span className="font-semibold">โทร:</span>
              <span>{appointment.attributes.patient.data.attributes.phone}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#F9669D]" />
              <span className="font-semibold">วันนัด:</span>
              <span>
                {dayjs(appointment.attributes.bookingDate).locale('th').format('dddd, D MMMM')}{' '}
                {dayjs(appointment.attributes.bookingDate).year() + 543}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#F9669D]" />
              <span className="font-semibold">เวลาที่นัด:</span>
              <span>
                {formatTime(appointment.attributes.startTime)} - {formatTime(appointment.attributes.endTime)} น.
              </span>
            </div>
          </div>

          {/* ฝั่งขวา */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-[#F9669D]" />
              <span className="font-semibold">วัคซีน:</span>
              <span>{appointment.attributes.vaccine.data.attributes.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#F9669D]" />
              <span className="font-semibold">เวลาให้บริการ:</span>
              <span>
                {formatTime(appointment.attributes.vaccine.data.attributes.serviceStartTime)} - {formatTime(appointment.attributes.vaccine.data.attributes.serviceEndTime)} น.
              </span>
            </div>

            {/* สถานที่ */}
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-[#F9669D] mt-1" />
              <div className="leading-tight">
                <p className="font-semibold">สถานที่:</p>
                <p className="break-words">{hospitelData.name || 'โรงพยาบาล'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#F9669D]" />
              <span className="font-semibold">สถานะ:</span>
              <span
                className={`font-bold ml-1 ${
                  appointment.attributes.status === 'cancelled'
                    ? 'text-red-500'
                    : appointment.attributes.status === 'confirmed'
                    ? 'text-green-600'
                    : 'text-yellow-500'
                }`}
              >
                {appointment.attributes.status === 'cancelled'
                  ? 'ยกเลิกแล้ว'
                  : appointment.attributes.status === 'confirmed'
                  ? 'ยืนยันแล้ว'
                  : 'รอการยืนยัน'}
              </span>
            </div>
          </div>
        </div>

        {/* ข้อความเพิ่มเติม */}
        <div className="text-xs text-center text-gray-300 mt-6 leading-snug border-t pt-4">
          <p>{hospitelData.warningtext || 'กรุณามาถึงก่อนเวลานัดอย่างน้อย 10 นาที และนำบัตรประชาชนมาแสดงทุกครั้ง'}</p>
          <p>{hospitelData.subwarningtext || 'หากไม่สามารถมาตามนัด กรุณาโทรแจ้งล่วงหน้า'}</p>
          <p className="mt-1 font-semibold text-[#F9669D]">📞 ติดต่อ: {hospitelData.phone || '0-5393-6150'}</p>
        </div>
      </div>

      {/* ปุ่ม */}
      <div className="mt-6 flex gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="text-[#30266D] border-[#30266D] hover:bg-[#F9669D] hover:border-[#F9669D] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> ย้อนกลับ
        </Button>
        <Button onClick={handlePrint} className="bg-[#30266D] hover:bg-[#251f5a] text-white">
          <Printer className="mr-2 h-5 w-5" /> พิมพ์
        </Button>
      </div>
    </div>
  );
}
