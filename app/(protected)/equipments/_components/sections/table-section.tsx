'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Package, Archive, ArchiveRestore } from 'lucide-react';
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

/* ---------------------------------------
   UI helpers
---------------------------------------- */

function StatusBadge({ status }: { status: Equipment['status'] }) {
	// Comentário: essas classes funcionam bem em light mode.
	// Se quiser 100% enterprise/dark-mode-friendly, a gente troca por variantes/sem cores hard-coded.
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
			{status === 'active'
				? 'in service'
				: status === 'maintenance'
					? 'maintenance'
					: 'out of service'}
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
   Main
---------------------------------------- */

export default function EquipmentsTableSection() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { user, loading: authLoading } = useAuth();
	const { isAdmin, isLoading: roleLoading } = useUserRole();

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [includeArchived, setIncludeArchived] = useState(false);

	// Enterprise: “Sort by” (o padrão mais comum é Last updated)
	const [sortBy, setSortBy] = useState<EquipmentsSort>('updated_desc');

	/* ---------------- Permissions ---------------- */

	const canWrite = !roleLoading && isAdmin;
	const isAuthBlocked = authLoading || !user;

	/* ---------------- Data ----------------
	   Nota enterprise:
	   - buscamos sempre "tudo" (incluindo archived) para não perder docs antigos
	     que talvez não tenham archivedAt.
	   - o toggle "Include archived" filtra localmente.
	---------------------------------------- */

	const {
		data = [],
		isLoading,
		isFetching
	} = useQuery<Equipment[]>({
		queryKey: ['equipments', sortBy],
		queryFn: () => getEquipmentsList({ includeArchived: true, sort: sortBy })
	});

	const filteredData = useMemo(() => {
		if (includeArchived) return data;

		// Comentário: "archivedAt" pode ser Timestamp/FieldValue/null/undefined dependendo do histórico.
		// Aqui, qualquer valor truthy em archivedAt significa "archived".
		return data.filter((e) => !(e as any)?.archivedAt);
	}, [data, includeArchived]);

	/* ---------------- Mutations ---------------- */

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

	/* ---------------- Columns ---------------- */

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
						{isArchived ? <ArchivedBadge /> : null}
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
			enableSorting: false,
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

	/* ---------------- Skeleton ---------------- */

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

	/* ---------------- Render ---------------- */

	return (
		<div className='space-y-4'>
			{/* Toolbar: Search / Status / Sort by / Include archived (enterprise padrão) */}
			<div className='flex flex-wrap gap-3 items-center justify-between'>
				<div className='flex flex-wrap items-center gap-2'>
					<Input
						placeholder='Search assets...'
						value={
							(columnFilters.find((f) => f.id === 'name')?.value as string) ??
							''
						}
						onChange={(e) =>
							setColumnFilters([{ id: 'name', value: e.target.value }])
						}
						className='w-[260px] max-w-full'
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
						<SelectTrigger className='w-[180px]'>
							<SelectValue placeholder='Status' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='all'>All statuses</SelectItem>
							<SelectItem value='active'>In service</SelectItem>
							<SelectItem value='maintenance'>Maintenance</SelectItem>
							<SelectItem value='inactive'>Out of service</SelectItem>
						</SelectContent>
					</Select>

					<Select
						value={sortBy}
						onValueChange={(v) => setSortBy(v as EquipmentsSort)}
					>
						<SelectTrigger className='w-[190px]'>
							<SelectValue placeholder='Sort by' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='updated_desc'>Last updated</SelectItem>
							<SelectItem value='created_desc'>Created date</SelectItem>
							<SelectItem value='name_asc'>Name (A–Z)</SelectItem>
							<SelectItem value='next_service_asc'>Next service due</SelectItem>
							<SelectItem value='status_ops'>Ops priority</SelectItem>
						</SelectContent>
					</Select>

					<Button
						variant='outline'
						onClick={() => setIncludeArchived((v) => !v)}
					>
						{includeArchived ? 'Hide archived' : 'Include archived'}
					</Button>
				</div>

				<Button
					disabled={!canWrite}
					onClick={() => router.push('/equipments/action?action=add')}
				>
					Add asset
				</Button>
			</div>

			{isFetching ? (
				<p className='text-xs text-muted-foreground'>Refreshing...</p>
			) : null}

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

					{!canWrite ? (
						<p className='mt-3 text-xs text-muted-foreground'>
							Viewer role: read-only access.
						</p>
					) : null}
				</div>
			) : (
				<DataTable
					columns={columns}
					data={filteredData}
					columnFilters={columnFilters}
					onColumnFiltersChange={setColumnFilters}
					persistKey='equipments_table'
					defaultPageSize={20}
				/>
			)}
		</div>
	);
}
