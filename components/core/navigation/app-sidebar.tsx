'use client';

import * as React from 'react';
import {
	BookOpen,
	Bot,
	Frame,
	Map,
	PieChart,
	Settings2,
	SquareTerminal
} from 'lucide-react';

import { NavMain } from '@/components/core/navigation/nav-main';
import { NavProjects } from '@/components/core/navigation/nav-projects';
import { NavUser } from '@/components/core/navigation/nav-user';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	useSidebar
} from '@/components/ui/sidebar';
import Link from 'next/link';

// This is sample data.
const data = {
	user: {
		name: 'shadcn',
		email: 'm@example.com',
		avatar: '/avatars/shadcn.jpg'
	},
	navMain: [
		{
			title: 'Playground',
			url: '#',
			icon: SquareTerminal,
			isActive: true,
			items: [
				{
					title: 'Equipments',
					url: '/equipments'
				},
				{
					title: 'Analytics',
					url: '/analytics'
				},
				{
					title: 'Settings',
					url: '#'
				}
			]
		},
		{
			title: 'Models',
			url: '#',
			icon: Bot,
			items: [
				{
					title: 'Genesis',
					url: '#'
				},
				{
					title: 'Explorer',
					url: '#'
				},
				{
					title: 'Quantum',
					url: '#'
				}
			]
		},
		{
			title: 'Documentation',
			url: '#',
			icon: BookOpen,
			items: [
				{
					title: 'Introduction',
					url: '#'
				},
				{
					title: 'Get Started',
					url: '#'
				},
				{
					title: 'Tutorials',
					url: '#'
				},
				{
					title: 'Changelog',
					url: '#'
				}
			]
		},
		{
			title: 'Settings',
			url: '#',
			icon: Settings2,
			items: [
				{
					title: 'General',
					url: '#'
				},
				{
					title: 'Team',
					url: '#'
				},
				{
					title: 'Billing',
					url: '#'
				},
				{
					title: 'Limits',
					url: '#'
				}
			]
		}
	],
	projects: [
		{
			name: 'Design Engineering',
			url: '#',
			icon: Frame
		},
		{
			name: 'Sales & Marketing',
			url: '#',
			icon: PieChart
		},
		{
			name: 'Travel',
			url: '#',
			icon: Map
		}
	]
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { open } = useSidebar();

	return (
		<Sidebar
			collapsible='icon'
			{...props}
		>
			<SidebarHeader className='h-[60px] border-b flex items-center justify-center'>
				<Link href={'/dashboard'}>
					{open ? (
						<p className='text-base font-mono font-extrabold'>NEGO DOIDO</p>
					) : (
						<p className='bg-primary h-[20px] w-[20px] text-xs rounded-sm flex items-center justify-center text-background'>
							ND
						</p>
					)}
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavProjects projects={data.projects} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
