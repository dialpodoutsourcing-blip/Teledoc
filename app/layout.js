import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'MediConnect',
  description: 'Telemedicine platform powered by Next.js, Supabase, and Prisma.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
