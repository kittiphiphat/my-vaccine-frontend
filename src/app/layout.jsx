import { Prompt } from 'next/font/google';
import './globals.css';
import ClientWrapper from '@/components/ClientWrapper';

const prompt = Prompt({
  variable: '--font-prompt',
  subsets: ['latin', 'thai'],
  weight: ['100','200','300','400','500','600','700','800','900'],
});

export const metadata = {
  title: 'MedCMU Hospital',
  description: 'Hospital Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head />
      <body className={`${prompt.variable} antialiased`}>
        
        <ClientWrapper>{children}</ClientWrapper>

      </body>
    </html>
  );
}
