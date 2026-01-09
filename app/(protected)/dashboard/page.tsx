'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, isBefore, isWithinInterval, parseISO } from 'date-fns';
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Package,
	Wrench
} from 'lucide-react';

import PageHeader from '@/components/core/headers/page-header';
import { getEquipmentsList } from '@/data-access/equipments';
import { Equipment } from '@/types/equipment';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';

function safeDate(value?: string) {
	if (!value) return null;
	try {
		return parseISO(value);
	} catch {
		return null;
	}
}

function getNextServiceDate(eq: Equipment) {
	const last = safeDate(eq.lastServiceDate);
	if (!last) return null;
	return addDays(last, 180);
}

export default function DashboardPage() {
	const {
		data: equipments = [],
		isLoading,
		isFetching,
		isError
	} = useQuery<Equipment[]>({
		queryKey: ['equipments'],
		queryFn: getEquipmentsList
	});

	const today = new Date();
	const in7 = addDays(today, 7);
	const in30 = addDays(today, 30);

	const metrics = useMemo(() => {
		const total = equipments.length;

		const active = equipments.filter((e) => e.status === 'active').length;
		const inactive = equipments.filter((e) => e.status === 'inactive').length;
		const maintenance = equipments.filter(
			(e) => e.status === 'maintenance'
		).length;

		// Data Quality (production-friendly, based on existing fields)
		const withSerial = equipments.filter((e) =>
			Boolean(e.serialNumber?.trim())
		).length;
		const withLastService = equipments.filter((e) =>
			Boolean(e.lastServiceDate?.trim())
		).length;
		const quality =
			total === 0
				? 0
				: Math.round((Math.min(withSerial, withLastService) / total) * 100);

		let overdue = 0;
		let due7 = 0;
		let due30 = 0;

		const dueSoonList: Array<Equipment & { _nextServiceDate?: Date | null }> =
			[];

		for (const eq of equipments) {
			const next = getNextServiceDate(eq);
			if (!next) continue;

			if (isBefore(next, today)) overdue += 1;

			if (isWithinInterval(next, { start: today, end: in7 })) due7 += 1;
			if (isWithinInterval(next, { start: today, end: in30 })) due30 += 1;

			if (
				isBefore(next, today) ||
				isWithinInterval(next, { start: today, end: in30 })
			) {
				dueSoonList.push({ ...eq, _nextServiceDate: next });
			}
		}

		dueSoonList.sort((a, b) => {
			const ad = a._nextServiceDate?.getTime() ?? 0;
			const bd = b._nextServiceDate?.getTime() ?? 0;
			return ad - bd;
		});

		return {
			total,
			active,
			inactive,
			maintenance,
			overdue,
			due7,
			due30,
			quality,
			dueSoonTop: dueSoonList.slice(0, 6)
		};
	}, [equipments, today, in7, in30]);

	const statusChartData = useMemo(
		() => [
			{ status: 'active', count: metrics.active },
			{ status: 'maintenance', count: metrics.maintenance },
			{ status: 'inactive', count: metrics.inactive }
		],
		[metrics.active, metrics.maintenance, metrics.inactive]
	);

	if (isError) {
		return (
			<section className='p-6'>
				<PageHeader
					pageTitle='Dashboard'
					pageDescription='Operational overview'
				/>
				<div className='p-4'>
					<Card>
						<CardHeader>
							<CardTitle>Unable to load dashboard</CardTitle>
						</CardHeader>
						<CardContent className='text-sm text-muted-foreground'>
							We couldn&apos;t fetch assets data. Please try again.
						</CardContent>
					</Card>
				</div>
			</section>
		);
	}

	return (
		<section>
			<PageHeader
				pageTitle='Dashboard'
				pageDescription='Operational overview and priorities'
			/>

			<div className='p-4 md:p-6 space-y-6'>
				{/* Top actions */}
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div className='text-sm text-muted-foreground'>
						{isFetching ? 'Refreshing data…' : 'Up-to-date operational view'}
					</div>
					<div className='flex gap-2'>
						<Button asChild>
							<Link href='/equipments/action?action=add'>Add asset</Link>
						</Button>
						<Button
							variant='outline'
							asChild
						>
							<Link href='/equipments'>View assets</Link>
						</Button>
						<Button
							variant='outline'
							asChild
						>
							<Link href='/analytics'>Analytics</Link>
						</Button>
					</div>
				</div>

				{/* KPI cards */}
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-6'>
					{isLoading ? (
						Array.from({ length: 6 }).map((_, i) => (
							<Card key={i}>
								<CardHeader className='space-y-1'>
									<Skeleton className='h-4 w-28' />
									<Skeleton className='h-8 w-16' />
								</CardHeader>
								<CardContent>
									<Skeleton className='h-4 w-24' />
								</CardContent>
							</Card>
						))
					) : (
						<>
							<KpiCard
								title='Total Assets'
								value={metrics.total}
								icon={<Package className='h-4 w-4' />}
								footer='Tracked in the system'
							/>
							<KpiCard
								title='In Service'
								value={metrics.active}
								icon={<CheckCircle2 className='h-4 w-4' />}
								footer='Active operational assets'
							/>
							<KpiCard
								title='Out of Service'
								value={metrics.inactive}
								icon={<AlertTriangle className='h-4 w-4' />}
								footer='Inactive items'
							/>
							<KpiCard
								title='Maintenance Due (30d)'
								value={metrics.due30}
								icon={<Clock className='h-4 w-4' />}
								footer='Due soon (next 30 days)'
								badge={
									metrics.due7 > 0 ? `${metrics.due7} due in 7d` : undefined
								}
								badgeVariant={metrics.due7 > 0 ? 'destructive' : 'secondary'}
							/>
							<KpiCard
								title='Overdue'
								value={metrics.overdue}
								icon={<Wrench className='h-4 w-4' />}
								footer='Past due maintenance'
								badge={metrics.overdue > 0 ? 'Action required' : 'Healthy'}
								badgeVariant={metrics.overdue > 0 ? 'destructive' : 'secondary'}
							/>
							<KpiCard
								title='Data Quality'
								value={`${metrics.quality}%`}
								icon={<CheckCircle2 className='h-4 w-4' />}
								footer='Serial + last service completeness'
							/>
						</>
					)}
				</div>

				{/* Alerts + Chart */}
				<div className='grid gap-4 lg:grid-cols-3'>
					<Card className='lg:col-span-2'>
						<CardHeader>
							<CardTitle>Priorities</CardTitle>
						</CardHeader>
						<CardContent className='space-y-3'>
							{isLoading ? (
								<div className='space-y-2'>
									<Skeleton className='h-5 w-3/4' />
									<Skeleton className='h-5 w-2/3' />
									<Skeleton className='h-5 w-1/2' />
								</div>
							) : (
								<>
									<PriorityRow
										label={`${metrics.overdue} assets overdue maintenance`}
										tone={metrics.overdue > 0 ? 'danger' : 'ok'}
										href='/equipments'
									/>
									<PriorityRow
										label={`${metrics.due7} assets due within 7 days`}
										tone={metrics.due7 > 0 ? 'warning' : 'ok'}
										href='/equipments'
									/>
									<PriorityRow
										label={`Service policy: every 180 days`}
										tone='ok'
										href='/analytics'
									/>
								</>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Assets by Status</CardTitle>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									active: { label: 'In Service', color: '#22c55e' },
									maintenance: { label: 'Maintenance', color: '#eab308' },
									inactive: { label: 'Out of Service', color: '#ef4444' }
								}}
								className='h-[260px]'
							>
								<PieChart>
									<Pie
										data={statusChartData}
										dataKey='count'
										nameKey='status'
										innerRadius={55}
										outerRadius={90}
									>
										<Cell fill='#22c55e' />
										<Cell fill='#eab308' />
										<Cell fill='#ef4444' />
									</Pie>
									<ChartTooltip content={<ChartTooltipContent />} />
								</PieChart>
							</ChartContainer>

							{!isLoading && metrics.total === 0 && (
								<p className='mt-3 text-xs text-muted-foreground'>
									Add your first asset to populate analytics.
								</p>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Quick views */}
				<div className='grid gap-4 lg:grid-cols-2'>
					<Card>
						<CardHeader className='flex flex-row items-center justify-between'>
							<CardTitle>Maintenance Due Soon</CardTitle>
							<Button
								variant='outline'
								size='sm'
								asChild
							>
								<Link href='/equipments'>Open assets</Link>
							</Button>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className='space-y-2'>
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton
											key={i}
											className='h-8 w-full'
										/>
									))}
								</div>
							) : metrics.dueSoonTop.length === 0 ? (
								<p className='text-sm text-muted-foreground'>
									No upcoming maintenance in the next 30 days.
								</p>
							) : (
								<div className='space-y-2'>
									{metrics.dueSoonTop.map((eq) => {
										const next = (eq as any)._nextServiceDate as
											| Date
											| null
											| undefined;
										const isOverdue = next ? isBefore(next, today) : false;

										return (
											<div
												key={eq.id}
												className='flex items-center justify-between rounded-md border px-3 py-2'
											>
												<div className='min-w-0'>
													<div className='truncate text-sm font-medium'>
														{eq.name}
													</div>
													<div className='truncate text-xs text-muted-foreground'>
														Serial: {eq.serialNumber || '—'}
													</div>
												</div>

												<div className='flex items-center gap-2'>
													<Badge
														variant={isOverdue ? 'destructive' : 'secondary'}
													>
														{next ? next.toISOString().slice(0, 10) : '—'}
													</Badge>
													<Button
														size='sm'
														variant='outline'
														asChild
													>
														<Link
															href={`/equipments/action?action=edit&id=${eq.id}`}
														>
															Review
														</Link>
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='flex flex-row items-center justify-between'>
							<CardTitle>Recent Activity</CardTitle>
							<Button
								variant='outline'
								size='sm'
								asChild
							>
								<Link href='/equipments/action?action=add'>Add asset</Link>
							</Button>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className='space-y-2'>
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton
											key={i}
											className='h-8 w-full'
										/>
									))}
								</div>
							) : (
								<RecentActivity equipments={equipments} />
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}

function KpiCard({
	title,
	value,
	footer,
	icon,
	badge,
	badgeVariant
}: {
	title: string;
	value: string | number;
	footer: string;
	icon: React.ReactNode;
	badge?: string;
	badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}) {
	return (
		<Card className='lg:col-span-1'>
			<CardHeader className='space-y-1'>
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span>{title}</span>
					{icon}
				</div>
				<div className='text-2xl font-semibold'>{value}</div>
			</CardHeader>
			<CardContent className='flex items-center justify-between gap-2'>
				<p className='text-xs text-muted-foreground'>{footer}</p>
				{badge ? (
					<Badge variant={badgeVariant ?? 'secondary'}>{badge}</Badge>
				) : null}
			</CardContent>
		</Card>
	);
}

function PriorityRow({
	label,
	tone,
	href
}: {
	label: string;
	tone: 'ok' | 'warning' | 'danger';
	href: string;
}) {
	const variant =
		tone === 'danger'
			? 'destructive'
			: tone === 'warning'
			? 'secondary'
			: 'outline';

	const pill =
		tone === 'danger' ? 'High' : tone === 'warning' ? 'Medium' : 'Low';

	return (
		<div className='flex items-center justify-between gap-3 rounded-md border px-3 py-2'>
			<div className='min-w-0 truncate text-sm'>{label}</div>
			<div className='flex items-center gap-2'>
				<Badge variant={variant}>{pill}</Badge>
				<Button
					variant='outline'
					size='sm'
					asChild
				>
					<Link href={href}>View</Link>
				</Button>
			</div>
		</div>
	);
}

function RecentActivity({ equipments }: { equipments: Equipment[] }) {
	const sorted = [...equipments].sort((a, b) => {
		const ad = safeDate(a.purchaseDate)?.getTime() ?? 0;
		const bd = safeDate(b.purchaseDate)?.getTime() ?? 0;
		return bd - ad;
	});

	const top = sorted.slice(0, 6);

	if (top.length === 0) {
		return (
			<p className='text-sm text-muted-foreground'>
				No activity yet. Create your first asset to start tracking operations.
			</p>
		);
	}

	return (
		<div className='space-y-2'>
			{top.map((eq) => (
				<div
					key={eq.id}
					className='flex items-center justify-between rounded-md border px-3 py-2'
				>
					<div className='min-w-0'>
						<div className='truncate text-sm font-medium'>{eq.name}</div>
						<div className='truncate text-xs text-muted-foreground'>
							Added: {eq.purchaseDate ? eq.purchaseDate.slice(0, 10) : '—'}
						</div>
					</div>
					<Button
						size='sm'
						variant='outline'
						asChild
					>
						<Link href={`/equipments/action?action=edit&id=${eq.id}`}>
							Open
						</Link>
					</Button>
				</div>
			))}
		</div>
	);
}
