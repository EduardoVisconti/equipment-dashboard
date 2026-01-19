'use client';

import type { Timestamp, FieldValue } from 'firebase/firestore';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import MaintenanceHistorySection from '../_components/sections/maintenance-history-section';

import PageHeader from '@/components/core/headers/page-header';
import { getEquipmentById } from '@/data-access/equipments';
import type { Equipment } from '@/types/equipment';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

function statusBadgeVariant(status: Equipment['status']) {
	if (status === 'active') return 'secondary';
	if (status === 'maintenance') return 'outline';
	return 'destructive';
}

function statusLabel(status: Equipment['status']) {
	if (status === 'active') return 'In Service';
	if (status === 'maintenance') return 'Maintenance';
	return 'Out of Service';
}

function truncateId(value?: string, max = 14) {
	if (!value) return '—';
	if (value.length <= max) return value;
	return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatTimestamp(ts?: Timestamp | FieldValue): string {
	// serverTimestamp() when read should arrive as Timestamp,
	// but keep it defensive for enterprise-grade resiliency.
	if (!ts) return '—';

	const maybe = ts as unknown as { toDate?: () => Date };
	if (typeof maybe.toDate !== 'function') return '—';

	const date = maybe.toDate();

	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: '2-digit',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	}).format(date);
}

export default function AssetDetailsPage({
	params
}: {
	params: { id: string };
}) {
	const router = useRouter();
	const id = params.id;

	const {
		data: asset,
		isLoading,
		isError
	} = useQuery<Equipment | undefined>({
		queryKey: ['equipments', id],
		queryFn: () => getEquipmentById(id),
		enabled: Boolean(id)
	});

	if (isLoading) {
		return (
			<section>
				<PageHeader
					pageTitle='Asset Details'
					pageDescription='View asset overview and maintenance history'
				/>
				<div className='p-4 md:p-6 space-y-4'>
					<Card>
						<CardHeader className='space-y-2'>
							<Skeleton className='h-6 w-48' />
							<Skeleton className='h-4 w-72' />
						</CardHeader>
						<CardContent className='space-y-3'>
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-2/3' />
						</CardContent>
					</Card>
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section>
				<PageHeader
					pageTitle='Asset Details'
					pageDescription='View asset overview and maintenance history'
				/>
				<div className='p-4 md:p-6'>
					<Card>
						<CardHeader>
							<CardTitle>Unable to load asset</CardTitle>
						</CardHeader>
						<CardContent className='text-sm text-muted-foreground space-y-4'>
							<p>
								We couldn&apos;t fetch this asset. Please check your permissions
								and try again.
							</p>
							<div className='flex gap-2'>
								<Button
									variant='outline'
									onClick={() => router.back()}
								>
									<ArrowLeft className='h-4 w-4 mr-2' />
									Go back
								</Button>
								<Button asChild>
									<Link href='/equipments'>Open assets</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</section>
		);
	}

	if (!asset) {
		return (
			<section>
				<PageHeader
					pageTitle='Asset Details'
					pageDescription='View asset overview and maintenance history'
				/>
				<div className='p-4 md:p-6'>
					<Card>
						<CardHeader>
							<CardTitle>Asset not found</CardTitle>
						</CardHeader>
						<CardContent className='text-sm text-muted-foreground space-y-4'>
							<p>This asset does not exist or you no longer have access.</p>
							<Button asChild>
								<Link href='/equipments'>Back to assets</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</section>
		);
	}

	const isArchived = Boolean(asset.archivedAt);

	const createdBy =
		asset.createdByEmail?.trim() ||
		(asset.createdBy ? truncateId(asset.createdBy) : '—');

	const updatedBy =
		asset.updatedByEmail?.trim() ||
		(asset.updatedBy ? truncateId(asset.updatedBy) : '—');

	const archivedBy =
		asset.archivedByEmail?.trim() ||
		(asset.archivedBy ? truncateId(asset.archivedBy) : '—');

	const createdAt = formatTimestamp(asset.createdAt);
	const updatedAt = formatTimestamp(asset.updatedAt);
	const archivedAt = formatTimestamp(asset.archivedAt);

	return (
		<section>
			<PageHeader
				pageTitle='Asset Details'
				pageDescription='Overview, maintenance and activity'
			/>

			<div className='p-4 md:p-6 space-y-4'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div className='flex items-center gap-3 min-w-0'>
						<Button
							variant='outline'
							size='sm'
							asChild
						>
							<Link href='/equipments'>
								<ArrowLeft className='h-4 w-4 mr-2' />
								Back
							</Link>
						</Button>

						<div className='min-w-0'>
							<div className='flex items-center gap-2'>
								<h2 className='text-lg font-semibold truncate'>{asset.name}</h2>

								<Badge variant={statusBadgeVariant(asset.status)}>
									{statusLabel(asset.status)}
								</Badge>

								{isArchived && (
									<Badge
										variant='outline'
										className='bg-muted text-muted-foreground'
									>
										Archived
									</Badge>
								)}
							</div>

							<p className='text-xs text-muted-foreground truncate'>
								Serial: {asset.serialNumber || '—'} • Asset ID: {asset.id}
							</p>
						</div>
					</div>

					<div className='flex gap-2'>
						<Button
							variant='outline'
							asChild
							disabled={isArchived}
						>
							<Link
								aria-disabled={isArchived}
								href={`/equipments/action?action=edit&id=${asset.id}`}
								onClick={(e) => {
									if (isArchived) e.preventDefault();
								}}
							>
								<Pencil className='h-4 w-4 mr-2' />
								{isArchived ? 'Read-only' : 'Edit asset'}
							</Link>
						</Button>
					</div>
				</div>

				{isArchived && (
					<div className='rounded-md border bg-muted/30 p-4'>
						<p className='text-sm font-medium'>This asset is archived</p>
						<p className='text-xs text-muted-foreground mt-1'>
							Archived assets are read-only and cannot be edited in AssetOps v1.
						</p>
					</div>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Asset information</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<Tabs defaultValue='overview'>
							<TabsList>
								<TabsTrigger value='overview'>Overview</TabsTrigger>
								<TabsTrigger value='maintenance'>Maintenance</TabsTrigger>
								<TabsTrigger value='activity'>Activity</TabsTrigger>
							</TabsList>

							<Separator className='my-4' />

							<TabsContent
								value='overview'
								className='space-y-4'
							>
								<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
									<InfoCard
										label='Status'
										value={statusLabel(asset.status)}
									/>
									<InfoCard
										label='Serial Number'
										value={asset.serialNumber || '—'}
									/>
									<InfoCard
										label='Purchase Date'
										value={asset.purchaseDate || '—'}
									/>
									<InfoCard
										label='Last Service'
										value={asset.lastServiceDate || '—'}
									/>
									<InfoCard
										label='Service Policy'
										value='Every 180 days'
									/>
									<InfoCard
										label='Record Source'
										value='Firestore'
									/>

									{/* Audit trail */}
									<InfoCard
										label='Created By'
										value={createdBy}
									/>
									<InfoCard
										label='Created At'
										value={createdAt}
									/>
									<InfoCard
										label='Last Updated By'
										value={updatedBy}
									/>
									<InfoCard
										label='Last Updated'
										value={updatedAt}
									/>

									{/* Archive metadata (only when archived) */}
									{isArchived && (
										<>
											<InfoCard
												label='Archived By'
												value={archivedBy}
											/>
											<InfoCard
												label='Archived At'
												value={archivedAt}
											/>
										</>
									)}
								</div>
							</TabsContent>

							<TabsContent
								value='maintenance'
								className='space-y-3'
							>
								<p className='text-sm text-muted-foreground'>
									This section shows a lightweight maintenance view. Next step:
									add service logs.
								</p>

								<div className='rounded-md border p-4 space-y-2'>
									<div className='flex items-center justify-between'>
										<p className='text-sm font-medium'>Last service date</p>
										<Badge variant='secondary'>
											{asset.lastServiceDate || '—'}
										</Badge>
									</div>
									<p className='text-xs text-muted-foreground'>
										Next service due is computed from the policy (last service +
										180 days).
									</p>
									<div className='pt-2'>
										<MaintenanceHistorySection equipmentId={asset.id} />
									</div>
								</div>
							</TabsContent>

							<TabsContent
								value='activity'
								className='space-y-3'
							>
								<p className='text-sm text-muted-foreground'>
									Lightweight audit trail derived from system metadata (v1).
								</p>

								<div className='space-y-2'>
									<ActivityRow
										title='Asset created'
										subtitle={`Created by: ${createdBy} • ${createdAt}`}
									/>
									<ActivityRow
										title='Last updated'
										subtitle={`Updated by: ${updatedBy} • ${updatedAt}`}
									/>

									{isArchived && (
										<ActivityRow
											title='Asset archived'
											subtitle={`Archived by: ${archivedBy} • ${archivedAt}`}
										/>
									)}

									<ActivityRow
										title='Last serviced'
										subtitle={`Last service date: ${asset.lastServiceDate || '—'}`}
									/>
								</div>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}

function InfoCard({ label, value }: { label: string; value: string }) {
	return (
		<div className='rounded-md border p-4'>
			<p className='text-xs text-muted-foreground'>{label}</p>
			<p className='mt-1 text-sm font-medium'>{value}</p>
		</div>
	);
}

function ActivityRow({ title, subtitle }: { title: string; subtitle: string }) {
	return (
		<div className='flex items-start justify-between gap-3 rounded-md border px-3 py-2'>
			<div className='min-w-0'>
				<p className='text-sm font-medium'>{title}</p>
				<p className='text-xs text-muted-foreground truncate'>{subtitle}</p>
			</div>
		</div>
	);
}
