'use client';

import React, { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatisticsTab from './Reports/StatisticsTab';
import ReportTab from './Reports/ReportTab';


export default function VaccineDashboardPage() {
  const [tab, setTab] = useState('statistics');

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-[#30266D] mb-6">รายงานและสถิติการจองวัคซีน</h1>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4  ">
          <TabsTrigger className={'cursor-pointer'} value="statistics">สถิติ</TabsTrigger>
          <TabsTrigger className={'cursor-pointer'} value="report">รายงาน</TabsTrigger>
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
