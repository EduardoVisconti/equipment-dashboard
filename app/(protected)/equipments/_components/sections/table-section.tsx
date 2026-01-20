'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
	MoreHorizontal,
	Package,
	Archive,
	ArchiveRestore,
	ArrowUpDown
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

const SORT_LABEL: Record<EquipmentsSort, string> = {
	updated_desc: 'Last updated',
	created_desc: 'Created (newest)',
	name_asc: 'Name (A–Z)',
	status_ops: 'Status (ops priority)',
	next_service_asc: 'Next service (soonest)'
};

export default function EquipmentsTableSection() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user, loading: authLoading } = useAuth();
	const { isAdmin, isLoading: roleLoading } = useUserRole();

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [includeArchived, setIncludeArchived] = useState(false);

	// enterprise default
	const [sort, setSort] = useState<EquipmentsSort>('updated_desc');

	/* ---------------- DATA ---------------- */

	const {
		data = [],
		isLoading,
		isFetching
	} = useQuery<Equipment[]>({
		queryKey: ['equipments', { includeArchived, sort }],
		queryFn: () => getEquipmentsList({ includeArchived, sort })
	});

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

	/* ---------------- TABLE DATA (client filters) ---------------- */

	// We still keep a small local filter for archived when includeArchived false,
	// but note: data-access already tries to filter via Firestore (archivedAt == null).
	// This is extra safety.
	const filteredData = useMemo(() => {
		if (includeArchived) return data;
		return data.filter((e) => !(e as any)?.archivedAt);
	}, [data, includeArchived]);

	/* ---------------- COLUMNS ---------------- */

	const columns: ColumnDef<Equipment>[] = [
		{
			accessorKey: 'name',
			header: 'Asset',
			cell: ({ row }) => {
				const equipment = row.original;
				const archived = Boolean((equipment as any)?.archivedAt);

				return (
					<div className='flex items-center gap-2 min-w-0'>
						<span className='truncate'>{equipment.name}</span>
						{archived && <ArchivedBadge />}
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
		{
			id: 'actions',
			cell: ({ row }) => {
				const equipment = row.original;
				const archived = Boolean((equipment as any)?.archivedAt);

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
								disabled={!canWrite || isMutating || archived}
								onClick={handleEdit}
							>
								Edit
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							{archived ? (
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
				<div className='flex gap-2 flex-wrap'>
					<Input
						placeholder='Search assets...'
						value={
							(columnFilters.find((f) => f.id === 'name')?.value as string) ??
							''
						}
						onChange={(e) =>
							setColumnFilters([{ id: 'name', value: e.target.value }])
						}
						className='max-w-sm'
					/>

					<Select
						onValueChange={(value) =>
							setColumnFilters((prev) => {
								const next = prev.filter((f) => f.id !== 'status');
								if (value === 'all') return next;
								return [...next, { id: 'status', value }];
							})
						}
					>
						<SelectTrigger className='w-[160px]'>
							<SelectValue placeholder='Status' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All</SelectItem>
							<SelectItem value='active'>Active</SelectItem>
							<SelectItem value='maintenance'>Maintenance</SelectItem>
							<SelectItem value='inactive'>Inactive</SelectItem>
						</SelectContent>
					</Select>

					<Select
						value={sort}
						onValueChange={(v) => setSort(v as EquipmentsSort)}
					>
						<SelectTrigger className='w-[210px]'>
							<SelectValue placeholder='Sort by' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='updated_desc'>
								{SORT_LABEL.updated_desc}
							</SelectItem>
							<SelectItem value='created_desc'>
								{SORT_LABEL.created_desc}
							</SelectItem>
							<SelectItem value='name_asc'>{SORT_LABEL.name_asc}</SelectItem>
							<SelectItem value='status_ops'>
								{SORT_LABEL.status_ops}
							</SelectItem>
							<SelectItem value='next_service_asc'>
								{SORT_LABEL.next_service_asc}
							</SelectItem>
						</SelectContent>
					</Select>

					<Button
						variant='outline'
						onClick={() => setIncludeArchived((v) => !v)}
					>
						{includeArchived ? 'Hide archived' : 'Include archived'}
					</Button>
				</div>

				<div className='flex items-center gap-2'>
					{isFetching ? (
						<div className='flex items-center gap-2 text-xs text-muted-foreground'>
							<ArrowUpDown className='h-4 w-4' />
							Refreshing…
						</div>
					) : (
						<div className='text-xs text-muted-foreground'>
							Sorted by: {SORT_LABEL[sort]}
						</div>
					)}

					<Button
						disabled={!canWrite}
						onClick={() => router.push('/equipments/action?action=add')}
					>
						Add asset
					</Button>
				</div>
			</div>

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
					onColumnFiltersChange={setColumnFilters}
				/>
			)}
		</div>
	);
}
