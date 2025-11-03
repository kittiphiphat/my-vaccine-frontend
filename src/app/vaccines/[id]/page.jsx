'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarDays, 
  faUsers, 
  faInfoCircle, 
  faArrowLeft,
  faSyringe,
  faClock,
  faUserCheck,
  faCalendarCheck,
  faShieldVirus,
  faPercent,
  faVial
} from '@fortawesome/free-solid-svg-icons';
import { VaccineBooking } from '@/app/booking/page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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
        setLoading(true);
        setError(null);

        const jwt = sessionStorage.getItem('jwt');
        if (!jwt) {
          setError('กรุณาเข้าสู่ระบบเพื่อดูข้อมูลวัคซีน');
          router.push('/login', { scroll: false });
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines/${id}?populate=*`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        );

        if (!res.ok) {
          if (res.status === 401) {
            sessionStorage.removeItem('jwt');
            router.push('/login', { scroll: false });
            throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data?.data) {
          setVaccine(data.data);
        } else {
          throw new Error('ไม่พบข้อมูลวัคซีน');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`เกิดข้อผิดพลาด: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVaccine();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin border-[var(--primary)]"></div>
          <p className="font-medium text-sm text-[var(--foreground)]">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-2">
        <Card className="max-w-sm w-full">
          <CardContent className="p-4 text-center">
            <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full mb-2 bg-[var(--destructive)]/10">
              <FontAwesomeIcon icon={faInfoCircle} className="h-5 w-5 text-[var(--destructive)]" />
            </div>
            <h3 className="text-base font-medium mb-1 text-[var(--card-foreground)]">เกิดข้อผิดพลาด</h3>
            <p className="text-[var(--destructive)] mb-2 text-xs">{error}</p>
            <Button
              onClick={() => router.push('/vaccines')}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] text-xs px-3 py-1.5"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 mr-1" />
              กลับไปยังรายการวัคซีน
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vaccine?.attributes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-2">
        <Card className="max-w-sm w-full">
          <CardContent className="p-4 text-center">
            <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full mb-2 bg-[var(--secondary-light)]">
              <FontAwesomeIcon icon={faInfoCircle} className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <h3 className="text-base font-medium mb-1 text-[var(--card-foreground)]">ไม่พบข้อมูล</h3>
            <p className="text-[var(--muted-foreground)] mb-2 text-xs">ไม่พบข้อมูลวัคซีนที่คุณต้องการ</p>
            <Button
              onClick={() => router.push('/vaccines')}
              className="bg-[var(--primary)] text-[var(--primary-foreground)] text-xs px-3 py-1.5"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 mr-1" />
              กลับไปยังรายการวัคซีน
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attr = vaccine.attributes;
  const serviceDays = Array.isArray(attr.vaccine_service_days?.data)
    ? attr.vaccine_service_days.data.flatMap((d) => {
        const days = d?.attributes?.day_of_week;
        if (Array.isArray(days)) return days.filter((day) => typeof day === 'number' && day >= 0 && day <= 6);
        if (typeof days === 'number' && days >= 0 && days <= 6) return [days];
        return [];
      })
    : [];
  const uniqueServiceDays = Array.from(new Set(serviceDays)).sort();
  const isEveryDay = uniqueServiceDays.length === 7;

  const formatDate = (date) =>
    date && dayjs(date).isValid()
      ? dayjs(date).add(543, 'year').format('D MMMM YYYY')
      : 'ไม่ระบุ';

  const bookingPercentage = attr.maxQuota > 0 
    ? Math.round((attr.booked / attr.maxQuota) * 100) 
    : 0;

  return (
    <div className="min-h-screen py-4 px-2 sm:px-3 bg-[var(--background)]">
      <div className="max-w-3xl mx-auto">
        <div className="mb-3">
          <Button
            variant="outline"
            onClick={() => router.push('/vaccines')}
            className="bg-[var(--card)] border-[var(--border)] text-xs px-2 py-1"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 mr-1" />
            ย้อนกลับ
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="relative p-3 sm:p-4 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--secondary)]/10">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 rounded-full transform translate-x-1/2 -translate-y-1/2 bg-[var(--primary)]"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-24 sm:h-24 rounded-full transform -translate-x-1/2 translate-y-1/2 bg-[var(--accent)]"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="p-2 sm:p-3 rounded-full bg-[var(--primary)]/20 mb-2">
                <FontAwesomeIcon icon={faShieldVirus} className="h-6 w-6 sm:h-8 sm:w-8 text-[var(--primary)]" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-center text-[var(--card-foreground)]">
                {attr.title || 'ไม่ระบุชื่อวัคซีน'}
              </h1>
              <p className="text-center mt-1 max-w-xs mx-auto text-xs text-[var(--muted-foreground)]">
                {attr.description || 'ไม่มีคำอธิบาย'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-4">
            <div className="mb-4 rounded-[var(--radius)] p-2 sm:p-3 bg-[var(--secondary)]/50">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-[var(--secondary-foreground)]">สถานะการจอง</span>
                <span className="text-xs font-medium text-[var(--secondary-foreground)]">
                  {attr.booked != null && attr.maxQuota != null 
                    ? `${attr.booked.toLocaleString()} / ${attr.maxQuota.toLocaleString()} คน` 
                    : 'ไม่ระบุ'}
                </span>
              </div>
              <div className="w-full rounded-full h-1.5 bg-[var(--muted)]">
                <div 
                  className="h-1.5 rounded-full transition-all duration-500 bg-[var(--primary)]" 
                  style={{ width: `${Math.min(bookingPercentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-0.5">
                <p className="text-xs text-[var(--muted-foreground)]">จองแล้ว {bookingPercentage}%</p>
                <p className="text-xs text-[var(--muted-foreground)]">เหลือ {100 - bookingPercentage}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <InfoCard 
                icon={faUsers} 
                title="ช่วงอายุที่รับ" 
                value={attr.minAge != null && attr.maxAge != null
                  ? `${attr.minAge} - ${attr.maxAge} ปี`
                  : 'ไม่ระบุ'}
              />
              
              <InfoCard 
                icon={faUserCheck} 
                title="เพศที่สามารถจอง" 
                value={{
                  any: 'ทุกเพศ',
                  male: 'ชาย',
                  female: 'หญิง',
                }[attr.gender?.toLowerCase()] || 'ไม่ระบุ'}
              />
              
              <InfoCard 
                icon={faCalendarCheck} 
                title="วันที่เปิดจอง" 
                value={attr.bookingStartDate && attr.bookingEndDate
                  ? `${formatDate(attr.bookingStartDate)} - ${formatDate(attr.bookingEndDate)}`
                  : 'ไม่ระบุ'}
              />
              
              <InfoCard 
                icon={faClock} 
                title="วันให้บริการ" 
                value={isEveryDay
                  ? 'เปิดทุกวัน'
                  : uniqueServiceDays.length > 0
                  ? uniqueServiceDays.map((d) => dayNames[d] || 'ไม่ระบุ').join(', ')
                  : 'ไม่ระบุ'}
              />
              
              <InfoCard 
                icon={faVial} 
                title="โควต้าทั้งหมด" 
                value={attr.maxQuota != null ? `${attr.maxQuota.toLocaleString()} คน` : 'ไม่ระบุ'}
              />
              
              <InfoCard 
                icon={faPercent} 
                title="จองแล้ว" 
                value={attr.booked != null ? `${attr.booked.toLocaleString()} คน (${bookingPercentage}%)` : 'ไม่ระบุ'}
              />
            </div>

            <div className="mt-4 text-center">
              <VaccineBooking vaccine={vaccine} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoCard({ icon, title, value }) {
  return (
    <Card className="p-2 sm:p-3 transition-all duration-300 hover:shadow-md bg-[var(--secondary)]/30 border-[var(--border)]">
      <div className="flex items-center mb-1">
        <FontAwesomeIcon icon={icon} className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-[var(--primary)]" />
        <h3 className="text-xs font-medium text-[var(--secondary-foreground)]">{title}</h3>
      </div>
      <p className="text-xs font-medium text-[var(--card-foreground)]">{value}</p>
    </Card>
  );
}