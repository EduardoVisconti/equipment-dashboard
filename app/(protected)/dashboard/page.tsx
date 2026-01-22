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
	Wrench,
	ShieldAlert
} from 'lucide-react';

import PageHeader from '@/components/core/headers/page-header';
import { getEquipmentsList } from '@/data-access/equipments';
import type { Equipment } from '@/types/equipment';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ChartContainer } from '@/components/ui/chart';
import { Pie, PieChart, Cell, Tooltip } from 'recharts';

function safeDate(value?: string) {
	if (!value) return null;
	try {
		return parseISO(value);
	} catch {
		return null;
	}
}

function isArchivedAsset(eq: Equipment) {
	// archivedAt pode ser Timestamp | FieldValue | null | undefined
	return Boolean((eq as any)?.archivedAt);
}

function deriveNextServiceDate(eq: Equipment) {
	const anyEq = eq as any;

	// 1) se existir no Firestore, usa
	const next = safeDate(anyEq?.nextServiceDate);
	if (next) return next;

	// 2) senão, calcula: lastServiceDate + interval (default 180)
	const last = safeDate(eq.lastServiceDate);
	if (!last) return null;

	const interval = eq.serviceIntervalDays ?? anyEq?.serviceIntervalDays ?? 180;

	return addDays(last, interval);
}

function StatusTooltip({
	active,
	payload
}: {
	active?: boolean;
	payload?: any[];
}) {
	if (!active || !payload?.length) return null;

	const item = payload[0];
	const label = item?.name ?? '—';
	const value = item?.value ?? '—';

	return (
		<div className='rounded-md border bg-background px-3 py-2 text-xs shadow-sm max-w-[220px]'>
			<div className='font-medium truncate'>{String(label)}</div>
			<div className='text-muted-foreground'>
				<span className='font-medium text-foreground'>{value}</span> assets
			</div>
		</div>
	);
}

export default function DashboardPage() {
	const {
		data: equipments = [],
		isLoading,
		isFetching,
		isError
	} = useQuery<Equipment[]>({
		queryKey: ['equipments', 'dashboard'],
		queryFn: () => getEquipmentsList({ includeArchived: true }),
		staleTime: 60_000
	});

	const today = new Date();
	const in7 = addDays(today, 7);
	const in30 = addDays(today, 30);

	const activeEquipments = useMemo(
		() => equipments.filter((e) => !isArchivedAsset(e)),
		[equipments]
	);

	const metrics = useMemo(() => {
		const total = activeEquipments.length;

		const active = activeEquipments.filter((e) => e.status === 'active').length;
		const inactive = activeEquipments.filter(
			(e) => e.status === 'inactive'
		).length;
		const maintenance = activeEquipments.filter(
			(e) => e.status === 'maintenance'
		).length;

		// Data quality (breakdown)
		const withSerial = activeEquipments.filter((e) =>
			Boolean(e.serialNumber?.trim())
		).length;

		const withLastService = activeEquipments.filter((e) =>
			Boolean(e.lastServiceDate?.trim())
		).length;

		const withOwner = activeEquipments.filter((e) =>
			Boolean((e.owner ?? '').trim())
		).length;

		const withLocation = activeEquipments.filter((e) =>
			Boolean((e.location ?? '').trim())
		).length;

		// next service: conta se tiver nextServiceDate OU se der pra derivar
		const withNextService = activeEquipments.filter((e) => {
			const next = deriveNextServiceDate(e);
			return Boolean(next);
		}).length;

		// Score de qualidade (simples e defensável)
		const quality =
			total === 0
				? 0
				: Math.round(
						((withSerial + withLastService + withNextService) / (total * 3)) *
							100
					);

		let overdue = 0;
		let due7 = 0;
		let due30 = 0;

		const dueSoonList: Array<Equipment & { _nextServiceDate?: Date | null }> =
			[];

		for (const eq of activeEquipments) {
			const next = deriveNextServiceDate(eq);
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

		// Needs Attention (lista operacional)
		type AttentionReason =
			| 'Overdue maintenance'
			| 'Maintenance due (30d)'
			| 'Missing serial'
			| 'Missing last service'
			| 'Missing owner/location';

		type AttentionItem = {
			id: string;
			name: string;
			serialNumber?: string;
			reasons: AttentionReason[];
			score: number;
			nextService?: Date | null;
		};

		const attentionItems: AttentionItem[] = [];

		for (const eq of activeEquipments) {
			const reasons: AttentionReason[] = [];
			let score = 0;

			const next = deriveNextServiceDate(eq);

			const missingSerial = !eq.serialNumber?.trim();
			const missingLast = !eq.lastServiceDate?.trim();
			const missingOwnerOrLocation =
				!(eq.owner ?? '').trim() || !(eq.location ?? '').trim();

			if (missingSerial) {
				reasons.push('Missing serial');
				score += 30;
			}

			if (missingLast) {
				reasons.push('Missing last service');
				score += 25;
			}

			if (missingOwnerOrLocation) {
				reasons.push('Missing owner/location');
				score += 10;
			}

			if (next) {
				if (isBefore(next, today)) {
					reasons.push('Overdue maintenance');
					score += 50;
				} else if (isWithinInterval(next, { start: today, end: in30 })) {
					reasons.push('Maintenance due (30d)');
					score += 20;
				}
			}

			if (reasons.length > 0) {
				attentionItems.push({
					id: eq.id,
					name: eq.name,
					serialNumber: eq.serialNumber,
					reasons,
					score,
					nextService: next
				});
			}
		}

		attentionItems.sort((a, b) => b.score - a.score);

		return {
			total,
			active,
			inactive,
			maintenance,

			overdue,
			due7,
			due30,

			quality,

			// quality breakdown
			withSerial,
			withLastService,
			withNextService,
			withOwner,
			withLocation,

			dueSoonTop: dueSoonList.slice(0, 6),

			needsAttentionTop: attentionItems.slice(0, 8)
		};
	}, [activeEquipments, today, in7, in30]);

	const statusChartData = useMemo(
		() => [
			{ status: 'In Service', count: metrics.active, color: '#22c55e' },
			{ status: 'Maintenance', count: metrics.maintenance, color: '#eab308' },
			{ status: 'Out of Service', count: metrics.inactive, color: '#ef4444' }
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
								footer='Active (excludes archived)'
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
								footer='Serial + last + next service'
							/>
						</>
					)}
				</div>

				{/* Priorities + Chart + Data Quality Breakdown */}
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
										label={`${metrics.needsAttentionTop.length} assets need attention (data/maintenance)`}
										tone={
											metrics.needsAttentionTop.length > 0 ? 'warning' : 'ok'
										}
										href='/equipments'
									/>
								</>
							)}
						</CardContent>
					</Card>

					<Card className='min-w-0'>
						<CardHeader>
							<CardTitle>Assets by Status</CardTitle>
						</CardHeader>
						<CardContent className='overflow-hidden'>
							<ChartContainer
								config={{
									'In Service': { label: 'In Service', color: '#22c55e' },
									Maintenance: { label: 'Maintenance', color: '#eab308' },
									'Out of Service': {
										label: 'Out of Service',
										color: '#ef4444'
									}
								}}
								className='h-[260px] w-full'
							>
								<PieChart>
									<Pie
										data={statusChartData}
										dataKey='count'
										nameKey='status'
										innerRadius={55}
										outerRadius={90}
									>
										{statusChartData.map((d) => (
											<Cell
												key={d.status}
												fill={d.color}
											/>
										))}
									</Pie>

									<Tooltip content={<StatusTooltip />} />
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

				{/* Data Quality Breakdown + Needs Attention */}
				<div className='grid gap-4 lg:grid-cols-2'>
					<Card>
						<CardHeader className='flex flex-row items-center justify-between'>
							<CardTitle>Data Quality</CardTitle>
							<Button
								variant='outline'
								size='sm'
								asChild
							>
								<Link href='/equipments'>Open assets</Link>
							</Button>
						</CardHeader>

						<CardContent className='space-y-3'>
							{isLoading ? (
								<div className='space-y-2'>
									<Skeleton className='h-5 w-2/3' />
									<Skeleton className='h-5 w-1/2' />
									<Skeleton className='h-5 w-3/4' />
								</div>
							) : metrics.total === 0 ? (
								<p className='text-sm text-muted-foreground'>
									Add assets to compute data quality coverage.
								</p>
							) : (
								<div className='space-y-2'>
									<QualityRow
										label='Serial number coverage'
										value={`${metrics.withSerial}/${metrics.total}`}
										tone={
											metrics.withSerial === metrics.total ? 'ok' : 'warning'
										}
									/>
									<QualityRow
										label='Last service coverage'
										value={`${metrics.withLastService}/${metrics.total}`}
										tone={
											metrics.withLastService === metrics.total
												? 'ok'
												: 'warning'
										}
									/>
									<QualityRow
										label='Next service coverage (stored/derived)'
										value={`${metrics.withNextService}/${metrics.total}`}
										tone={
											metrics.withNextService === metrics.total
												? 'ok'
												: 'warning'
										}
									/>
									<QualityRow
										label='Owner coverage'
										value={`${metrics.withOwner}/${metrics.total}`}
										tone={
											metrics.withOwner === metrics.total ? 'ok' : 'warning'
										}
									/>
									<QualityRow
										label='Location coverage'
										value={`${metrics.withLocation}/${metrics.total}`}
										tone={
											metrics.withLocation === metrics.total ? 'ok' : 'warning'
										}
									/>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='flex flex-row items-center justify-between'>
							<CardTitle>Needs Attention</CardTitle>
							<Button
								variant='outline'
								size='sm'
								asChild
							>
								<Link href='/equipments'>View all</Link>
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
							) : metrics.needsAttentionTop.length === 0 ? (
								<p className='text-sm text-muted-foreground'>
									No issues detected. Data and maintenance look healthy.
								</p>
							) : (
								<div className='space-y-2'>
									{metrics.needsAttentionTop.map((item) => (
										<div
											key={item.id}
											className='flex items-start justify-between gap-3 rounded-md border px-3 py-2'
										>
											<div className='min-w-0'>
												<div className='truncate text-sm font-medium'>
													{item.name}
												</div>
												<div className='truncate text-xs text-muted-foreground'>
													Serial: {item.serialNumber?.trim() || '—'}
												</div>

												<div className='mt-2 flex flex-wrap gap-1'>
													{item.reasons.slice(0, 3).map((r) => (
														<Badge
															key={r}
															variant={
																r.includes('Overdue')
																	? 'destructive'
																	: 'secondary'
															}
														>
															{r}
														</Badge>
													))}
												</div>
											</div>

											<div className='flex flex-col items-end gap-2 shrink-0'>
												{item.nextService ? (
													<Badge
														variant={
															isBefore(item.nextService, today)
																? 'destructive'
																: 'secondary'
														}
													>
														{item.nextService.toISOString().slice(0, 10)}
													</Badge>
												) : (
													<Badge variant='outline'>—</Badge>
												)}

												<Button
													size='sm'
													variant='outline'
													asChild
												>
													<Link href={`/equipments/${item.id}`}>Review</Link>
												</Button>
											</div>
										</div>
									))}
								</div>
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
														<Link href={`/equipments/${eq.id}`}>Review</Link>
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
								<RecentActivity equipments={activeEquipments} />
							)}
						</CardContent>
					</Card>
				</div>

				{/* Small enterprise note */}
				{!isLoading && equipments.some((e) => isArchivedAsset(e)) && (
					<div className='rounded-md border bg-muted/30 p-4 flex items-start gap-3'>
						<ShieldAlert className='h-4 w-4 mt-0.5 text-muted-foreground' />
						<div>
							<p className='text-sm font-medium'>Archived assets excluded</p>
							<p className='text-xs text-muted-foreground mt-1'>
								Dashboard KPIs are calculated from active assets only
								(enterprise default).
							</p>
						</div>
					</div>
				)}
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
		<Card className='lg:col-span-1 min-w-0'>
			<CardHeader className='space-y-1'>
				<div className='flex items-center justify-between text-sm text-muted-foreground'>
					<span className='truncate'>{title}</span>
					{icon}
				</div>
				<div className='text-2xl font-semibold'>{value}</div>
			</CardHeader>

			<CardContent className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
				<p className='text-xs text-muted-foreground truncate'>{footer}</p>
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

function QualityRow({
	label,
	value,
	tone
}: {
	label: string;
	value: string;
	tone: 'ok' | 'warning';
}) {
	return (
		<div className='flex items-center justify-between gap-3 rounded-md border px-3 py-2'>
			<div className='min-w-0'>
				<p className='text-sm font-medium truncate'>{label}</p>
				<p className='text-xs text-muted-foreground'>
					Enterprise metric: data completeness
				</p>
			</div>
			<Badge variant={tone === 'ok' ? 'secondary' : 'outline'}>{value}</Badge>
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
						<Link href={`/equipments/${eq.id}`}>Open</Link>
					</Button>
				</div>
			))}
		</div>
	);
}
