import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
	title: 'AssetOps',
	description: 'Asset & Maintenance Operations Dashboard'
};

const inter = Inter({
	subsets: ['latin'],
	// Optional: define a CSS variable name for use with Tailwind CSS or CSS files
	variable: '--font-inter'
});

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en'>
			<body className={`${inter.variable}  antialiased`}>
				<AuthProvider>
					<ThemeProvider
						attribute='class'
						defaultTheme='system'
						enableSystem
						disableTransitionOnChange
					>
						{children}
					</ThemeProvider>
					<Toaster richColors />
				</AuthProvider>
			</body>
		</html>
	);
}
