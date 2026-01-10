'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	addDays,
	differenceInDays,
	isBefore,
	isWithinInterval,
	parseISO,
	subDays
} from 'date-fns';
import {
	AlertTriangle,
	BarChart3,
	CheckCircle2,
	Clock,
	Filter,
	PieChart as PieIcon,
	TrendingUp,
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';

import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart';

import {
	ResponsiveContainer,
	Pie,
	PieChart,
	Bar,
	BarChart,
	Area,
	AreaChart,
	XAxis,
	YAxis,
	CartesianGrid,
	Cell
} from 'recharts';

/* ---------------------------------------
   Types + constants
---------------------------------------- */

type TimeRange = '30' | '90' | '365';
type StatusFilter = 'all' | Equipment['status'];

const STATUS_LABEL: Record<Equipment['status'], string> = {
	active: 'In Service',
	maintenance: 'Maintenance',
	inactive: 'Out of Service'
};

const STATUS_COLORS: Record<Equipment['status'], string> = {
	active: '#22c55e',
	maintenance: '#eab308',
	inactive: '#ef4444'
};

/* ---------------------------------------
   Helpers
---------------------------------------- */

function safeDate(value?: string) {
	if (!value) return null;
	try {
		return parseISO(value);
	} catch {
		return null;
	}
}

/**
 * If nextServiceDate doesn’t exist, derive it from lastServiceDate (+180d).
 * Keeps analytics meaningful without expanding schema right now.
 */
function deriveNextServiceDate(eq: Equipment) {
	const anyEq = eq as any;
	const next = safeDate(anyEq?.nextServiceDate);
	if (next) return next;

	const last = safeDate(eq.lastServiceDate);
	if (last) return addDays(last, 180);

	return null;
}

function StatusPill({ status }: { status: Equipment['status'] }) {
	const classes =
		status === 'active'
			? 'bg-green-100 text-green-700 border-green-200'
			: status === 'maintenance'
			? 'bg-yellow-100 text-yellow-800 border-yellow-200'
			: 'bg-red-100 text-red-700 border-red-200';

	return (
		<Badge
			variant='outline'
			className={classes}
		>
			{STATUS_LABEL[status]}
		</Badge>
	);
}

function KpiCard({
	title,
	value,
	icon,
	footer,
	badge,
	badgeVariant
}: {
	title: string;
	value: string | number;
	icon: React.ReactNode;
	footer?: string;
	badge?: string;
	badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}) {
	return (
		<Card className='min-w-0'>
			<CardHeader className='space-y-1'>
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span className='truncate'>{title}</span>
					{icon}
				</div>
				<div className='text-2xl font-semibold'>{value}</div>
			</CardHeader>
			<CardContent className='flex items-center justify-between gap-2'>
				{footer ? (
					<p className='text-xs text-muted-foreground truncate'>{footer}</p>
				) : (
					<span />
				)}
				{badge ? (
					<Badge
						variant={badgeVariant ?? 'secondary'}
						className='shrink-0'
					>
						{badge}
					</Badge>
				) : null}
			</CardContent>
		</Card>
	);
}

/* ---------------------------------------
   Page
---------------------------------------- */

export default function AnalyticsPage() {
	const [timeRange, setTimeRange] = useState<TimeRange>('90');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
	const rangeStart = useMemo(
		() => subDays(today, Number(timeRange)),
		[today, timeRange]
	);

	const filtered = useMemo(() => {
		return equipments.filter((eq) => {
			// Use purchaseDate as a proxy for createdAt (demo-friendly).
			const created = safeDate(eq.purchaseDate);
			const inRange =
				!created ||
				isWithinInterval(created, { start: rangeStart, end: today });

			const statusOk =
				statusFilter === 'all' ? true : eq.status === statusFilter;

			return inRange && statusOk;
		});
	}, [equipments, rangeStart, today, statusFilter]);

	const kpis = useMemo(() => {
		const total = filtered.length;
		const active = filtered.filter((e) => e.status === 'active').length;
		const maintenance = filtered.filter(
			(e) => e.status === 'maintenance'
		).length;
		const inactive = filtered.filter((e) => e.status === 'inactive').length;

		return { total, active, maintenance, inactive };
	}, [filtered]);

	const statusChartData = useMemo(() => {
		return (['active', 'maintenance', 'inactive'] as const).map((status) => ({
			status,
			label: STATUS_LABEL[status],
			count:
				status === 'active'
					? kpis.active
					: status === 'maintenance'
					? kpis.maintenance
					: kpis.inactive
		}));
	}, [kpis.active, kpis.maintenance, kpis.inactive]);

	const maintenanceMetrics = useMemo(() => {
		let overdue = 0;
		let due7 = 0;
		let due30 = 0;

		const dueSoon: Array<
			Equipment & { _nextServiceDate?: Date | null; _days?: number }
		> = [];

		const in7 = addDays(today, 7);
		const in30 = addDays(today, 30);

		for (const eq of filtered) {
			const next = deriveNextServiceDate(eq);
			if (!next) continue;

			const days = differenceInDays(next, today);

			if (isBefore(next, today)) overdue += 1;
			if (isWithinInterval(next, { start: today, end: in7 })) due7 += 1;
			if (isWithinInterval(next, { start: today, end: in30 })) due30 += 1;

			if (
				isBefore(next, today) ||
				isWithinInterval(next, { start: today, end: in30 })
			) {
				dueSoon.push({ ...eq, _nextServiceDate: next, _days: days });
			}
		}

		dueSoon.sort((a, b) => {
			const ad = a._nextServiceDate?.getTime() ?? 0;
			const bd = b._nextServiceDate?.getTime() ?? 0;
			return ad - bd;
		});

		return { overdue, due7, due30, dueSoonTop: dueSoon.slice(0, 6) };
	}, [filtered, today]);

	const timeSeriesData = useMemo(() => {
		const monthlyCounts = filtered.reduce((acc, eq) => {
			const month = eq.purchaseDate?.slice(0, 7); // YYYY-MM
			if (!month) return acc;
			acc[month] = (acc[month] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);

		return Object.entries(monthlyCounts)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, total]) => ({ month, total }));
	}, [filtered]);

	const insights = useMemo(() => {
		if (kpis.total === 0) return [];

		const lines: string[] = [];

		if (maintenanceMetrics.overdue > 0) {
			lines.push(
				`${maintenanceMetrics.overdue} asset(s) are overdue for maintenance — prioritize reviews and corrective actions.`
			);
		} else {
			lines.push('No overdue maintenance detected in the current filters.');
		}

		if (maintenanceMetrics.due7 > 0) {
			lines.push(
				`${maintenanceMetrics.due7} asset(s) are due within the next 7 days.`
			);
		}

		const activePct = Math.round((kpis.active / Math.max(kpis.total, 1)) * 100);
		lines.push(`${activePct}% of assets are currently in service.`);

		return lines;
	}, [kpis, maintenanceMetrics]);

	if (isError) {
		return (
			<section>
				<PageHeader
					pageTitle='Analytics'
					pageDescription='Operational insights and trends'
				/>
				<div className='p-4 md:p-6'>
					<Card>
						<CardHeader>
							<CardTitle>Unable to load analytics</CardTitle>
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
				pageTitle='Analytics'
				pageDescription='Operational insights, maintenance trends, and status distribution'
			/>

			{/* MATCH SITE PADDING + RHYTHM */}
			<div className='p-4 md:p-6 space-y-6'>
				{/* Toolbar */}
				<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
					<div className='flex flex-col gap-2'>
						<div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
							<div className='inline-flex items-center gap-2'>
								<Filter className='h-4 w-4' />
								<span>Filters</span>
							</div>
							{isFetching ? <span className='text-xs'>Refreshing…</span> : null}
						</div>

						<div className='flex flex-wrap items-center gap-2'>
							<Select
								value={timeRange}
								onValueChange={(v) => setTimeRange(v as TimeRange)}
							>
								<SelectTrigger className='w-[160px]'>
									<SelectValue placeholder='Time range' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='30'>Last 30 days</SelectItem>
									<SelectItem value='90'>Last 90 days</SelectItem>
									<SelectItem value='365'>Last 12 months</SelectItem>
								</SelectContent>
							</Select>

							<Select
								value={statusFilter}
								onValueChange={(v) => setStatusFilter(v as StatusFilter)}
							>
								<SelectTrigger className='w-[180px]'>
									<SelectValue placeholder='Status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>All statuses</SelectItem>
									<SelectItem value='active'>In Service</SelectItem>
									<SelectItem value='maintenance'>Maintenance</SelectItem>
									<SelectItem value='inactive'>Out of Service</SelectItem>
								</SelectContent>
							</Select>
						</div>
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
					</div>
				</div>

				{/* KPI row */}
				<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
					{isLoading ? (
						Array.from({ length: 4 }).map((_, i) => (
							<Card
								key={i}
								className='min-w-0'
							>
								<CardHeader className='space-y-2'>
									<Skeleton className='h-4 w-28' />
									<Skeleton className='h-8 w-20' />
								</CardHeader>
								<CardContent>
									<Skeleton className='h-4 w-32' />
								</CardContent>
							</Card>
						))
					) : (
						<>
							<KpiCard
								title='Assets in scope'
								value={kpis.total}
								icon={<BarChart3 className='h-4 w-4' />}
								footer={`Based on current filters (${timeRange}d)`}
							/>
							<KpiCard
								title='In service'
								value={kpis.active}
								icon={<CheckCircle2 className='h-4 w-4' />}
								footer='Operational availability'
							/>
							<KpiCard
								title='Maintenance due (30d)'
								value={maintenanceMetrics.due30}
								icon={<Clock className='h-4 w-4' />}
								footer='Upcoming service window'
								badge={
									maintenanceMetrics.due7 > 0
										? `${maintenanceMetrics.due7} due in 7d`
										: undefined
								}
								badgeVariant={
									maintenanceMetrics.due7 > 0 ? 'destructive' : 'secondary'
								}
							/>
							<KpiCard
								title='Overdue'
								value={maintenanceMetrics.overdue}
								icon={<Wrench className='h-4 w-4' />}
								footer='Past due maintenance'
								badge={
									maintenanceMetrics.overdue > 0 ? 'Action required' : 'Healthy'
								}
								badgeVariant={
									maintenanceMetrics.overdue > 0 ? 'destructive' : 'secondary'
								}
							/>
						</>
					)}
				</div>

				{/* CHARTS: break earlier (md), and stack on small quickly */}
				<div className='grid gap-6 xl:grid-cols-2'>
					{/* Pie */}
					<Card className='min-w-0'>
						<CardHeader className='flex flex-row items-center justify-between'>
							<CardTitle className='flex items-center gap-2'>
								<PieIcon className='h-4 w-4' />
								Assets by status
							</CardTitle>
							{!isLoading ? (
								<Badge
									variant='outline'
									className='text-muted-foreground'
								>
									{kpis.total} total
								</Badge>
							) : null}
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									active: { label: 'In Service', color: STATUS_COLORS.active },
									maintenance: {
										label: 'Maintenance',
										color: STATUS_COLORS.maintenance
									},
									inactive: {
										label: 'Out of Service',
										color: STATUS_COLORS.inactive
									}
								}}
								className='h-[280px] sm:h-[320px]'
							>
								<ResponsiveContainer
									width='100%'
									height='100%'
								>
									<PieChart>
										<Pie
											data={statusChartData}
											dataKey='count'
											nameKey='label'
											innerRadius={55}
											outerRadius={90}
										>
											{statusChartData.map((entry) => (
												<Cell
													key={entry.status}
													fill={
														STATUS_COLORS[entry.status as Equipment['status']]
													}
												/>
											))}
										</Pie>
										<ChartTooltip content={<ChartTooltipContent />} />
									</PieChart>
								</ResponsiveContainer>
							</ChartContainer>

							{!isLoading && kpis.total === 0 ? (
								<p className='mt-3 text-xs text-muted-foreground'>
									No data for the selected filters. Try expanding the time
									range.
								</p>
							) : null}
						</CardContent>
					</Card>

					{/* Bar */}
					<Card className='min-w-0'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<TrendingUp className='h-4 w-4' />
								Status distribution
							</CardTitle>
						</CardHeader>
						<CardContent>
							<ChartContainer
								config={{
									count: { label: 'Assets', color: '#3b82f6' }
								}}
								className='h-[280px] sm:h-[320px]'
							>
								<ResponsiveContainer
									width='100%'
									height='100%'
								>
									<BarChart data={statusChartData}>
										<CartesianGrid vertical={false} />
										<XAxis
											dataKey='label'
											tickMargin={8}
											interval={0}
											tick={{ fontSize: 12 }}
										/>
										<YAxis allowDecimals={false} />
										<Bar
											dataKey='count'
											radius={6}
										>
											{statusChartData.map((entry) => (
												<Cell
													key={entry.status}
													fill={
														STATUS_COLORS[entry.status as Equipment['status']]
													}
												/>
											))}
										</Bar>
										<ChartTooltip content={<ChartTooltipContent />} />
									</BarChart>
								</ResponsiveContainer>
							</ChartContainer>
						</CardContent>
					</Card>
				</div>

				{/* Area */}
				<Card className='min-w-0'>
					<CardHeader>
						<CardTitle>Assets created over time</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={{
								total: { label: 'Assets', color: '#6366f1' }
							}}
							className='h-[320px] sm:h-[380px]'
						>
							<ResponsiveContainer
								width='100%'
								height='100%'
							>
								<AreaChart data={timeSeriesData}>
									<CartesianGrid vertical={false} />
									<XAxis
										dataKey='month'
										tickMargin={8}
									/>
									<YAxis allowDecimals={false} />
									<Area
										dataKey='total'
										type='monotone'
										stroke='#6366f1'
										fill='#6366f1'
										fillOpacity={0.22}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
								</AreaChart>
							</ResponsiveContainer>
						</ChartContainer>

						{!isLoading && timeSeriesData.length === 0 ? (
							<p className='mt-3 text-xs text-muted-foreground'>
								Not enough creation history in the selected time range.
							</p>
						) : null}
					</CardContent>
				</Card>

				{/* Insights + At-risk */}
				<div className='grid gap-6 md:grid-cols-2'>
					<Card className='min-w-0'>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<AlertTriangle className='h-4 w-4' />
								Insights
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-2'>
							{isLoading ? (
								<div className='space-y-2'>
									<Skeleton className='h-4 w-11/12' />
									<Skeleton className='h-4 w-10/12' />
									<Skeleton className='h-4 w-9/12' />
								</div>
							) : insights.length === 0 ? (
								<p className='text-sm text-muted-foreground'>
									Add assets to generate operational insights.
								</p>
							) : (
								<ul className='space-y-2'>
									{insights.map((line) => (
										<li
											key={line}
											className='text-sm text-muted-foreground'
										>
											• {line}
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>

					<Card className='min-w-0'>
						<CardHeader className='flex flex-row items-center justify-between'>
							<CardTitle className='flex items-center gap-2'>
								<Wrench className='h-4 w-4' />
								At-risk assets
							</CardTitle>
							<Button
								variant='outline'
								size='sm'
								asChild
							>
								<Link href='/equipments'>Open list</Link>
							</Button>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className='space-y-2'>
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton
											key={i}
											className='h-10 w-full'
										/>
									))}
								</div>
							) : maintenanceMetrics.dueSoonTop.length === 0 ? (
								<p className='text-sm text-muted-foreground'>
									No overdue or due-soon assets in the next 30 days.
								</p>
							) : (
								<div className='space-y-2'>
									{maintenanceMetrics.dueSoonTop.map((eq) => {
										const next = (eq as any)._nextServiceDate as
											| Date
											| null
											| undefined;
										const days = (eq as any)._days as number | undefined;
										const overdue = next ? isBefore(next, today) : false;

										return (
											<div
												key={eq.id}
												className='flex items-center justify-between gap-3 rounded-md border px-3 py-2'
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
													<StatusPill status={eq.status} />
													<Badge
														variant={overdue ? 'destructive' : 'secondary'}
														className='shrink-0'
													>
														{next ? next.toISOString().slice(0, 10) : '—'}
														{typeof days === 'number' ? (
															<span className='ml-2 opacity-80'>
																(
																{days < 0
																	? `${Math.abs(days)}d overdue`
																	: `${days}d`}
																)
															</span>
														) : null}
													</Badge>
													<Button
														size='sm'
														variant='outline'
														asChild
														className='shrink-0'
													>
														<Link href={`/equipments/${eq.id}`}>View</Link>
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
