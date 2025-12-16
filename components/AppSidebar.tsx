'use client';

import Link from 'next/link';

export function AppSidebar() {
	return (
		<aside className='w-64 border-r p-4'>
			<nav className='flex flex-col gap-2'>
				<Link
					href='/equipment'
					className='font-medium'
				>
					Equipment
				</Link>
			</nav>
		</aside>
	);
}
