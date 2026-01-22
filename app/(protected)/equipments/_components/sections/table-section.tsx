'use client';

import { useMemo, useEffect } from 'react';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
	MoreHorizontal,
	Package,
	Archive,
	ArchiveRestore,
	Bookmark,
	Clock
} from 'lucide-react';

import {
	archiveEquipment,
	getEquipmentsList,
	unarchiveEquipment,
	type EquipmentsSort
} from '@/data-access/equipments';

import type { Equipment } from '@/types/equipment';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/use-user-role';
import { useAuth } from '@/context/auth-context';

import { DataTable } from '@/components/core/tables/data-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';

import { useLocalStorage } from '@/hooks/use-local-storage';
import type {
	EquipmentsSavedView,
	EquipmentsSavedViewKey,
	StatusFilterValue,
	MaintenanceWindowValue
} from '@/types/views';

/* ---------------------------------------
   Local helpers (UI-only)
---------------------------------------- */

function safeParseDate(value?: string): Date | null {
	if (!value) return null;
	const d = new Date(`${value}T00:00:00`);
	return Number.isNaN(d.getTime()) ? null : d;
}

function computeNextServiceDate(lastServiceDate: string, intervalDays: number) {
	const base = new Date(`${lastServiceDate}T00:00:00`);
	base.setDate(base.getDate() + intervalDays);
	return base.toISOString().slice(0, 10);
}

/**
 * - Prefer stored nextServiceDate
 * - Else derive from lastServiceDate + serviceIntervalDays (default 180)
 */
function getNextServiceDate(eq: Equipment): string | null {
	const anyEq = eq as any;

	// 1) stored (pode estar em eq.nextServiceDate ou anyEq.nextServiceDate)
	const stored =
		typeof anyEq?.nextServiceDate === 'string'
			? anyEq.nextServiceDate
			: typeof (eq as any)?.nextServiceDate === 'string'
				? (eq as any).nextServiceDate
				: undefined;

	if (stored?.trim()) return stored;

	// 2) derived
	const last = eq.lastServiceDate?.trim();
	if (!last) return null;

	const interval =
		typeof anyEq?.serviceIntervalDays === 'number'
			? anyEq.serviceIntervalDays
			: typeof (eq as any)?.serviceIntervalDays === 'number'
				? (eq as any).serviceIntervalDays
				: 180;

	return computeNextServiceDate(last, interval);
}

function getNextServiceTone(eq: Equipment) {
	const nextStr = getNextServiceDate(eq);
	const next = safeParseDate(nextStr ?? undefined);
	if (!next) return { label: '—', variant: 'outline' as const };

	const today = new Date();
	const startOfToday = new Date(today.toDateString());

	const in30 = new Date(startOfToday);
	in30.setDate(in30.getDate() + 30);

	if (next.getTime() < startOfToday.getTime()) {
		return {
			label: nextStr!,
			variant: 'destructive' as const,
			note: 'Overdue'
		};
	}

	if (next.getTime() <= in30.getTime()) {
		return { label: nextStr!, variant: 'secondary' as const, note: 'Due soon' };
	}

	return { label: nextStr!, variant: 'outline' as const };
}

function matchesMaintenanceWindow(
	eq: Equipment,
	window: MaintenanceWindowValue
) {
	if (window === 'all') return true;

	const nextStr = getNextServiceDate(eq);
	const next = safeParseDate(nextStr ?? undefined);
	if (!next) return false;

	const today = new Date();
	const startOfToday = new Date(today.toDateString());

	if (window === 'overdue') {
		return next.getTime() < startOfToday.getTime();
	}

	// due_30
	const in30 = new Date(startOfToday);
	in30.setDate(in30.getDate() + 30);

	return (
		next.getTime() >= startOfToday.getTime() && next.getTime() <= in30.getTime()
	);
}

/* ---------------------------------------
   Badges
---------------------------------------- */

function StatusBadge({ status }: { status: Equipment['status'] }) {
	const map: Record<Equipment['status'], string> = {
		active: 'bg-green-100 text-green-700',
		maintenance: 'bg-yellow-100 text-yellow-800',
		inactive: 'bg-muted text-muted-foreground'
	};

	return (
		<Badge
			variant='outline'
			className={map[status]}
		>
			{status}
		</Badge>
	);
}

function ArchivedBadge() {
	return (
		<Badge
			variant='outline'
			className='bg-muted text-muted-foreground'
		>
			Archived
		</Badge>
	);
}

/* ---------------------------------------
   Saved Views + Sort
---------------------------------------- */

const SORT_OPTIONS: Array<{ value: EquipmentsSort; label: string }> = [
	{ value: 'updated_desc', label: 'Last updated' },
	{ value: 'created_desc', label: 'Created date' },
	{ value: 'name_asc', label: 'Name (A–Z)' },
	{ value: 'status_ops', label: 'Ops priority (status)' },
	{ value: 'next_service_asc', label: 'Next service (soonest)' }
];

const DEFAULT_VIEWS: EquipmentsSavedView[] = [
	{
		key: 'operational',
		label: 'Operational',
		includeArchived: false,
		sort: 'status_ops',
		status: 'all',
		search: '',
		maintenanceWindow: 'all'
	},
	{
		key: 'maintenance_focus',
		label: 'Maintenance focus',
		includeArchived: false,
		sort: 'next_service_asc',
		status: 'maintenance',
		search: '',
		maintenanceWindow: 'due_30'
	},
	{
		key: 'archived',
		label: 'Archived',
		includeArchived: true,
		sort: 'updated_desc',
		status: 'all',
		search: '',
		maintenanceWindow: 'all'
	}
];

function getViewByKey(key: EquipmentsSavedViewKey): EquipmentsSavedView {
	return DEFAULT_VIEWS.find((v) => v.key === key) ?? DEFAULT_VIEWS[0];
}

function buildColumnFilters(search: string, status: StatusFilterValue) {
	const next: ColumnFiltersState = [];
	if (search.trim()) next.push({ id: 'name', value: search });
	if (status !== 'all') next.push({ id: 'status', value: status });
	return next;
}

/* ---------------------------------------
   Page Section
---------------------------------------- */

export default function EquipmentsTableSection() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { user, loading: authLoading } = useAuth();
	const { isAdmin, isLoading: roleLoading } = useUserRole();

	const [savedViewKey, setSavedViewKey] =
		useLocalStorage<EquipmentsSavedViewKey>(
			'assetops.equipments.savedViewKey',
			'operational'
		);

	const [customState, setCustomState] = useLocalStorage(
		'assetops.equipments.customState',
		{
			sort: 'status_ops' as EquipmentsSort,
			includeArchived: false,
			search: '',
			status: 'all' as StatusFilterValue,
			maintenanceWindow: 'all' as MaintenanceWindowValue
		}
	);

	const sort = customState.sort as EquipmentsSort;
	const includeArchived = Boolean(customState.includeArchived);
	const search = (customState.search ?? '') as string;
	const status = (customState.status ?? 'all') as StatusFilterValue;
	const maintenanceWindow = (customState.maintenanceWindow ??
		'all') as MaintenanceWindowValue;

	const columnFilters = useMemo(
		() => buildColumnFilters(search, status),
		[search, status]
	);

	useEffect(() => {
		const view = getViewByKey(savedViewKey);

		setCustomState({
			sort: view.sort,
			includeArchived: view.includeArchived,
			search: view.search ?? '',
			status: view.status ?? 'all',
			maintenanceWindow: (view.maintenanceWindow ??
				'all') as MaintenanceWindowValue
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [savedViewKey]);

	/* ---------------- DATA ---------------- */

	const {
		data = [],
		isLoading,
		isFetching
	} = useQuery<Equipment[]>({
		queryKey: ['equipments', { includeArchived, sort }],
		queryFn: () => getEquipmentsList({ includeArchived, sort })
	});

	const filteredData = useMemo(() => {
		let list = data;

		// Archived view = somente arquivados
		if (savedViewKey === 'archived') {
			list = list.filter((e) => Boolean((e as any)?.archivedAt));
		} else if (!includeArchived) {
			// default = sem arquivados
			list = list.filter((e) => !Boolean((e as any)?.archivedAt));
		}

		// Maintenance window (stored/derived)
		if (maintenanceWindow !== 'all') {
			list = list.filter((e) => matchesMaintenanceWindow(e, maintenanceWindow));
		}

		return list;
	}, [data, includeArchived, savedViewKey, maintenanceWindow]);

	/* ---------------- PERMISSIONS ---------------- */

	const canWrite = !roleLoading && isAdmin;
	const isAuthBlocked = authLoading || !user;

	/* ---------------- MUTATIONS ---------------- */

	const archiveMutation = useMutation({
		mutationFn: async (equipmentId: string) => {
			if (!user) throw new Error('Not authenticated');
			await archiveEquipment(equipmentId, { uid: user.uid, email: user.email });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['equipments'] });
			toast.success('Asset archived');
		},
		onError: () => toast.error('Failed to archive asset')
	});

	const restoreMutation = useMutation({
		mutationFn: async (equipmentId: string) => {
			if (!user) throw new Error('Not authenticated');
			await unarchiveEquipment(equipmentId, {
				uid: user.uid,
				email: user.email
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['equipments'] });
			toast.success('Asset restored');
		},
		onError: () => toast.error('Failed to restore asset')
	});

	const isMutating = archiveMutation.isPending || restoreMutation.isPending;

	/* ---------------- COLUMNS ---------------- */

	const columns: ColumnDef<Equipment>[] = [
		{
			accessorKey: 'name',
			header: 'Asset',
			cell: ({ row }) => {
				const equipment = row.original;
				const isArchived = Boolean((equipment as any)?.archivedAt);

				return (
					<div className='flex items-center gap-2 min-w-0'>
						<span className='truncate'>{equipment.name}</span>
						{isArchived && <ArchivedBadge />}
					</div>
				);
			}
		},
		{ accessorKey: 'serialNumber', header: 'Serial' },
		{
			accessorKey: 'status',
			header: 'Status',
			filterFn: (row, columnId, filterValue) =>
				row.getValue(columnId) === filterValue,
			cell: ({ row }) => <StatusBadge status={row.original.status} />
		},
		{
			accessorKey: 'lastServiceDate',
			header: 'Last Service'
		},

		// Next Service (stored/derived) + badges ops
		{
			id: 'nextService',
			header: 'Next Service',
			cell: ({ row }) => {
				const eq = row.original;
				const tone = getNextServiceTone(eq);

				return (
					<div className='flex items-center gap-2'>
						<Badge variant={tone.variant}>{tone.label}</Badge>

						{tone.note ? (
							<Badge
								variant={
									tone.variant === 'destructive' ? 'destructive' : 'secondary'
								}
								className='gap-1'
							>
								<Clock className='h-3.5 w-3.5' />
								{tone.note}
							</Badge>
						) : null}
					</div>
				);
			}
		},

		{
			id: 'actions',
			cell: ({ row }) => {
				const equipment = row.original;
				const isArchived = Boolean((equipment as any)?.archivedAt);

				const handleEdit = () => {
					router.push(`/equipments/action?action=edit&id=${equipment.id}`);
				};

				const handleArchive = () => {
					if (!canWrite) {
						toast.error('Read-only access. Admin role required.');
						return;
					}
					archiveMutation.mutate(equipment.id);
				};

				const handleRestore = () => {
					if (!canWrite) {
						toast.error('Read-only access. Admin role required.');
						return;
					}
					restoreMutation.mutate(equipment.id);
				};

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='ghost'
								size='icon'
								disabled={roleLoading}
							>
								<MoreHorizontal className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent align='end'>
							<DropdownMenuItem
								onClick={() => router.push(`/equipments/${equipment.id}`)}
							>
								View
							</DropdownMenuItem>

							<DropdownMenuItem
								disabled={!canWrite || isMutating || isArchived}
								onClick={handleEdit}
							>
								Edit
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							{isArchived ? (
								<DropdownMenuItem
									disabled={!canWrite || isMutating || isAuthBlocked}
									onClick={handleRestore}
								>
									<ArchiveRestore className='h-4 w-4 mr-2' />
									Restore
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									disabled={!canWrite || isMutating || isAuthBlocked}
									onClick={handleArchive}
								>
									<Archive className='h-4 w-4 mr-2' />
									Archive
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				);
			}
		}
	];

	/* ---------------- SKELETON ---------------- */

	if (isLoading) {
		return (
			<div className='space-y-4'>
				<div className='flex justify-between'>
					<Skeleton className='h-10 w-64' />
					<Skeleton className='h-10 w-32' />
				</div>
				<div className='rounded-md border p-4 space-y-2'>
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton
							key={i}
							className='h-6'
						/>
					))}
				</div>
			</div>
		);
	}

	/* ---------------- RENDER ---------------- */

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap gap-4 items-center justify-between'>
				<div className='flex gap-2 flex-wrap items-center'>
					{/* Saved Views */}
					<Select
						value={savedViewKey}
						onValueChange={(v) => setSavedViewKey(v as EquipmentsSavedViewKey)}
					>
						<SelectTrigger className='w-[220px]'>
							<SelectValue placeholder='Saved view' />
						</SelectTrigger>
						<SelectContent>
							{DEFAULT_VIEWS.map((v) => (
								<SelectItem
									key={v.key}
									value={v.key}
								>
									<div className='flex items-center gap-2'>
										<Bookmark className='h-4 w-4' />
										{v.label}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Search */}
					<Input
						placeholder='Search assets...'
						value={search}
						onChange={(e) =>
							setCustomState((prev: any) => ({
								...prev,
								search: e.target.value
							}))
						}
						className='max-w-sm'
					/>

					{/* Status */}
					<Select
						value={status}
						onValueChange={(value) =>
							setCustomState((prev: any) => ({
								...prev,
								status: value as StatusFilterValue
							}))
						}
					>
						<SelectTrigger className='w-[180px]'>
							<SelectValue placeholder='Status' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All statuses</SelectItem>
							<SelectItem value='active'>Active</SelectItem>
							<SelectItem value='maintenance'>Maintenance</SelectItem>
							<SelectItem value='inactive'>Inactive</SelectItem>
						</SelectContent>
					</Select>

					{/* Maintenance Window */}
					<Select
						value={maintenanceWindow}
						onValueChange={(value) =>
							setCustomState((prev: any) => ({
								...prev,
								maintenanceWindow: value as MaintenanceWindowValue
							}))
						}
					>
						<SelectTrigger className='w-[220px]'>
							<SelectValue placeholder='Maintenance window' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>Maintenance window: All</SelectItem>
							<SelectItem value='due_30'>Due soon (≤ 30d)</SelectItem>
							<SelectItem value='overdue'>Overdue</SelectItem>
						</SelectContent>
					</Select>

					{/* Sort */}
					<Select
						value={sort}
						onValueChange={(v) =>
							setCustomState((prev: any) => ({
								...prev,
								sort: v as EquipmentsSort
							}))
						}
					>
						<SelectTrigger className='w-[200px]'>
							<SelectValue placeholder='Sort by' />
						</SelectTrigger>
						<SelectContent>
							{SORT_OPTIONS.map((o) => (
								<SelectItem
									key={o.value}
									value={o.value}
								>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Include archived */}
					<Button
						variant='outline'
						onClick={() =>
							setCustomState((prev: any) => ({
								...prev,
								includeArchived: !prev.includeArchived
							}))
						}
					>
						{includeArchived ? 'Hide archived' : 'Include archived'}
					</Button>

					{/* Reset */}
					<Button
						variant='ghost'
						onClick={() => setSavedViewKey('operational')}
					>
						Reset
					</Button>
				</div>

				<Button
					disabled={!canWrite}
					onClick={() => router.push('/equipments/action?action=add')}
				>
					Add asset
				</Button>
			</div>

			{isFetching && (
				<p className='text-xs text-muted-foreground'>Refreshing...</p>
			)}

			{filteredData.length === 0 ? (
				<div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center'>
					<div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
						<Package className='h-6 w-6 text-muted-foreground' />
					</div>

					<h3 className='mt-4 text-lg font-semibold'>
						{includeArchived ? 'No assets found' : 'No active assets found'}
					</h3>

					<p className='mt-2 text-sm text-muted-foreground'>
						{includeArchived
							? 'Try adjusting filters or add a new asset.'
							: 'Enable “Include archived” to view archived assets, or add a new asset.'}
					</p>

					<Button
						className='mt-6'
						disabled={!canWrite}
						onClick={() => router.push('/equipments/action?action=add')}
					>
						Add asset
					</Button>

					{!canWrite && (
						<p className='mt-3 text-xs text-muted-foreground'>
							Viewer role: read-only access.
						</p>
					)}
				</div>
			) : (
				<DataTable
					columns={columns}
					data={filteredData}
					columnFilters={columnFilters}
					onColumnFiltersChange={() => {
						// TanStack table fica só como render;
						// o estado fonte é o customState.
					}}
				/>
			)}
		</div>
	);
}
