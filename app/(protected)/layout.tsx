'use client';

import { AppSidebar } from '@/components/core/navigation/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import NegoDoidoQueryCLientProvider from '@/components/providers/query-provider';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PrivateLayout = ({ children }: { children: React.ReactNode }) => {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && !user) {
			router.replace('/login');
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className='flex h-screen items-center justify-center'>
				<p className='text-sm text-muted-foreground'>Checking session…</p>
			</div>
		);
	}

	if (!user) return null;

	return (
		<SidebarProvider>
			<NegoDoidoQueryCLientProvider>
				<AppSidebar />
				<SidebarInset>{children}</SidebarInset>
			</NegoDoidoQueryCLientProvider>
		</SidebarProvider>
	);
};

export default PrivateLayout;
