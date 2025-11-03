import { Prompt } from 'next/font/google';
import './globals.css';
import ClientWrapper from '@/components/ClientWrapper';
import { ThemeProvider } from 'next-themes';

const prompt = Prompt({
  variable: '--font-prompt',
  subsets: ['latin', 'thai'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata = {
  title: 'Vaccine Booking System',
  description: 'Vaccine Booking System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${prompt.variable} `}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="theme"
        >
          <ClientWrapper>{children}</ClientWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}