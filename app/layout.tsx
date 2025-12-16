import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import QueryClientProvider from '@/providers/QueryClientProvider';
import './globals.css';

export default function RootLayout({
	children
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang='en'>
			<body>
				<QueryClientProvider>
					<SidebarProvider>
						<div className='flex min-h-screen'>
							<AppSidebar />
							<main className='flex-1'>{children}</main>
						</div>
					</SidebarProvider>
				</QueryClientProvider>
			</body>
		</html>
	);
}
