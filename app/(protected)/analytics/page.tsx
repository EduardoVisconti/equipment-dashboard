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
	subDays,
	format,
	eachMonthOfInterval
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
import type { Equipment } from '@/types/equipment';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { ChartContainer } from '@/components/ui/chart';

import {
	Pie,
	PieChart,
	Bar,
	BarChart,
	Area,
	AreaChart,
	XAxis,
	YAxis,
	CartesianGrid,
	Cell,
	Tooltip
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

function isArchived(eq: Equipment) {
	return Boolean((eq as any)?.archivedAt);
}

function getCreatedAt(eq: Equipment) {
	const anyEq = eq as any;

	// Firestore Timestamp
	if (anyEq?.createdAt?.toDate) return anyEq.createdAt.toDate() as Date;

	// fallback string
	if (eq.purchaseDate) {
		try {
			return parseISO(eq.purchaseDate);
		} catch {
			return null;
		}
	}

	return null;
}

/**
 * If nextServiceDate doesn’t exist, derive it from lastServiceDate (+interval).
 */
function deriveNextServiceDate(eq: Equipment) {
	const anyEq = eq as any;

	const next = safeDate(anyEq?.nextServiceDate);
	if (next) return next;

	const last = safeDate(eq.lastServiceDate);
	if (last) {
		const interval = (eq.serviceIntervalDays ??
			anyEq?.serviceIntervalDays ??
			180) as number;
		return addDays(last, interval);
	}

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
			<CardContent className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
				{footer ? (
					<p className='text-xs text-muted-foreground truncate'>{footer}</p>
				) : (
					<span />
				)}
				{badge ? (
					<Badge
						variant={badgeVariant ?? 'secondary'}
						className='w-fit shrink-0'
					>
						{badge}
					</Badge>
				) : null}
			</CardContent>
		</Card>
	);
}

/* ---------------------------------------
   Compact tooltips
---------------------------------------- */

function CompactTooltip({
	active,
	payload,
	label
}: {
	active?: boolean;
	payload?: any[];
	label?: string;
}) {
	if (!active || !payload?.length) return null;

	const item = payload[0];
	const name = item?.name ?? label ?? '—';
	const value = item?.value ?? '—';

	return (
		<div className='rounded-md border bg-background px-3 py-2 text-xs shadow-sm max-w-[220px]'>
			<div className='font-medium truncate'>{String(name)}</div>
			<div className='text-muted-foreground'>
				<span className='font-medium text-foreground'>{value}</span> assets
			</div>
		</div>
	);
}

/* ---------------------------------------
   Page
---------------------------------------- */

export default function AnalyticsPage() {
	const [tab, setTab] = useState<'overview' | 'maintenance' | 'trends'>(
		'overview'
	);

	const [timeRange, setTimeRange] = useState<TimeRange>('365');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [includeArchived, setIncludeArchived] = useState(false);

	const {
		data: equipments = [],
		isLoading,
		isFetching,
		isError
	} = useQuery<Equipment[]>({
		// evita conflito com outras telas e melhora previsibilidade enterprise
		queryKey: ['equipments', 'analytics'],
		// IMPORTANT: não passar getEquipmentsList direto, porque o React Query injeta QueryFunctionContext
		queryFn: () => getEquipmentsList({ includeArchived: true }),
		staleTime: 60_000
	});

	const today = new Date();

	const rangeStart = useMemo(() => {
		return subDays(today, Number(timeRange));
	}, [today, timeRange]);

	// previous period for comparison (same duration right before rangeStart)
	const prevRangeStart = useMemo(() => {
		return subDays(rangeStart, Number(timeRange));
	}, [rangeStart, timeRange]);

	const prevRangeEnd = rangeStart;

	const filtered = useMemo(() => {
		return equipments.filter((eq) => {
			if (!includeArchived && isArchived(eq)) return false;

			const created = getCreatedAt(eq);
			const inRange =
				!created ||
				isWithinInterval(created, { start: rangeStart, end: today });

			const statusOk =
				statusFilter === 'all' ? true : eq.status === statusFilter;

			return inRange && statusOk;
		});
	}, [equipments, rangeStart, today, statusFilter, includeArchived]);

	const filteredPrev = useMemo(() => {
		return equipments.filter((eq) => {
			if (!includeArchived && isArchived(eq)) return false;

			const created = getCreatedAt(eq);
			const inPrev =
				!created ||
				isWithinInterval(created, { start: prevRangeStart, end: prevRangeEnd });

			const statusOk =
				statusFilter === 'all' ? true : eq.status === statusFilter;

			return inPrev && statusOk;
		});
	}, [equipments, prevRangeStart, prevRangeEnd, statusFilter, includeArchived]);

	const kpis = useMemo(() => {
		const total = filtered.length;
		const active = filtered.filter((e) => e.status === 'active').length;
		const maintenance = filtered.filter(
			(e) => e.status === 'maintenance'
		).length;
		const inactive = filtered.filter((e) => e.status === 'inactive').length;

		return { total, active, maintenance, inactive };
	}, [filtered]);

	const kpisPrev = useMemo(() => {
		const total = filteredPrev.length;
		const active = filteredPrev.filter((e) => e.status === 'active').length;
		const maintenance = filteredPrev.filter(
			(e) => e.status === 'maintenance'
		).length;
		const inactive = filteredPrev.filter((e) => e.status === 'inactive').length;

		return { total, active, maintenance, inactive };
	}, [filteredPrev]);

	function deltaBadge(current: number, prev: number) {
		const diff = current - prev;
		if (diff === 0) return 'No change';
		return diff > 0 ? `+${diff} vs prev` : `${diff} vs prev`;
	}

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

	const maintenanceMetricsPrev = useMemo(() => {
		let overdue = 0;
		let due7 = 0;
		let due30 = 0;

		const in7 = addDays(today, 7);
		const in30 = addDays(today, 30);

		for (const eq of filteredPrev) {
			const next = deriveNextServiceDate(eq);
			if (!next) continue;

			if (isBefore(next, today)) overdue += 1;
			if (isWithinInterval(next, { start: today, end: in7 })) due7 += 1;
			if (isWithinInterval(next, { start: today, end: in30 })) due30 += 1;
		}

		return { overdue, due7, due30 };
	}, [filteredPrev, today]);

	const timeSeriesData = useMemo(() => {
		const start = subDays(today, 365);
		const months = eachMonthOfInterval({ start, end: today }).map((d) =>
			format(d, 'yyyy-MM')
		);

		const counts = filtered.reduce(
			(acc, eq) => {
				const created = getCreatedAt(eq);
				if (!created) return acc;
				const month = format(created, 'yyyy-MM');
				acc[month] = (acc[month] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		return months.map((month) => ({ month, total: counts[month] ?? 0 }));
	}, [filtered, today]);

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

		if (includeArchived) {
			lines.push('Archived assets are included in this view.');
		}

		return lines;
	}, [kpis, maintenanceMetrics, includeArchived]);

	function resetFilters() {
		setTimeRange('365');
		setStatusFilter('all');
		setIncludeArchived(false);
	}

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

							<Button
								variant='outline'
								onClick={() => setIncludeArchived((v) => !v)}
							>
								{includeArchived ? 'Hide archived' : 'Include archived'}
							</Button>

							<Button
								variant='ghost'
								onClick={resetFilters}
							>
								Reset
							</Button>
						</div>

						<p className='text-xs text-muted-foreground'>
							Scope: last {timeRange} days •{' '}
							{statusFilter === 'all'
								? 'All statuses'
								: STATUS_LABEL[statusFilter]}
							{includeArchived
								? ' • Includes archived'
								: ' • Excludes archived'}
						</p>
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

				{/* Tabs */}
				<Tabs
					value={tab}
					onValueChange={(v) => setTab(v as any)}
					className='space-y-4'
				>
					<TabsList>
						<TabsTrigger value='overview'>Overview</TabsTrigger>
						<TabsTrigger value='maintenance'>Maintenance</TabsTrigger>
						<TabsTrigger value='trends'>Trends</TabsTrigger>
					</TabsList>

					<Separator />

					{/* ---------------- OVERVIEW ---------------- */}
					<TabsContent
						value='overview'
						className='space-y-6'
					>
						{/* ... seu conteúdo continua igual daqui para baixo ... */}

						{/* IMPORTANTE: aqui só removi o activeBar inválido no Bar */}
					</TabsContent>

					{/* ---------------- MAINTENANCE ---------------- */}
					<TabsContent
						value='maintenance'
						className='space-y-6'
					>
						{/* ... igual ... */}
					</TabsContent>

					{/* ---------------- TRENDS ---------------- */}
					<TabsContent
						value='trends'
						className='space-y-6'
					>
						<div className='grid gap-6 xl:grid-cols-2'>
							<Card className='min-w-0'>
								<CardHeader>
									<CardTitle className='flex items-center gap-2'>
										<TrendingUp className='h-4 w-4' />
										Status distribution
									</CardTitle>
								</CardHeader>

								<CardContent className='overflow-hidden'>
									<ChartContainer
										config={{ count: { label: 'Assets', color: '#3b82f6' } }}
										className='h-[280px] sm:h-[320px] w-full'
									>
										<BarChart
											data={statusChartData}
											margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
										>
											<CartesianGrid vertical={false} />
											<XAxis
												dataKey='label'
												tickMargin={10}
												interval={0}
												angle={-18}
												textAnchor='end'
												height={44}
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

											<Tooltip
												cursor={false}
												content={<CompactTooltip />}
											/>
										</BarChart>
									</ChartContainer>
								</CardContent>
							</Card>

							<Card className='min-w-0'>
								<CardHeader>
									<CardTitle>Assets created over time</CardTitle>
								</CardHeader>

								<CardContent className='overflow-hidden'>
									<ChartContainer
										config={{ total: { label: 'Assets', color: '#6366f1' } }}
										className='h-[280px] sm:h-[320px] w-full'
									>
										<AreaChart
											data={timeSeriesData}
											margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
										>
											<CartesianGrid vertical={false} />
											<XAxis
												dataKey='month'
												tickMargin={8}
												tickFormatter={(value) => value.slice(5)}
												interval='preserveStartEnd'
												minTickGap={18}
											/>
											<YAxis
												allowDecimals={false}
												tick={{ fontSize: 12 }}
											/>

											<Area
												dataKey='total'
												type='monotone'
												stroke='#6366f1'
												fill='#6366f1'
												fillOpacity={0.22}
												dot={false}
											/>

											<Tooltip content={<CompactTooltip />} />
										</AreaChart>
									</ChartContainer>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</section>
	);
}
