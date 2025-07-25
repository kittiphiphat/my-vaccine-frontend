'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatisticsTab from './Reports/StatisticsTab';
import ReportTab from './Reports/ReportTab';

export default function VaccineDashboardPage() {
  const [tab, setTab] = useState('statistics');

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-[#30266D] mb-6">รายงานและสถิติการจองวัคซีน</h1>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4 rounded-md overflow-hidden ">
          <TabsTrigger
            value="statistics"
            className={`
              cursor-pointer
              bg-[#30266D]
              text-white
              hover:bg-[#F9669D]
              data-[state=active]:bg-[#F9669D]
              data-[state=active]:text-white
              transition-colors duration-300
              text-center
              py-2
            `}
          >
            สถิติ
          </TabsTrigger>

          <TabsTrigger
            value="report"
            className={`
              cursor-pointer
              bg-[#30266D]
              text-white
              hover:bg-[#F9669D]
              data-[state=active]:bg-[#F9669D]
              data-[state=active]:text-white
              transition-colors duration-300
              text-center
              py-2
            `}
          >
            รายงาน
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statistics">
          <StatisticsTab />
        </TabsContent>
        <TabsContent value="report">
          <ReportTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
