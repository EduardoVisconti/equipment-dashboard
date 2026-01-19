'use client';

import { useMemo, useState } from 'react';
import { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Package } from 'lucide-react';
import {
	archiveEquipment,
	deleteEquipment,
	getEquipmentsList,
	unarchiveEquipment
} from '@/data-access/equipments';
import { Equipment } from '@/types/equipment';
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
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
	AlertDialogAction
} from '@/components/ui/alert-dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function StatusBadge({ status }: { status: Equipment['status'] }) {
	const map = {
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
			archived
		</Badge>
	);
}

export default function EquipmentsTableSection() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { user, loading: authLoading } = useAuth();
	const { isAdmin, isLoading: roleLoading } = useUserRole();

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(
		null
	);

	const [includeArchived, setIncludeArchived] = useState(false);
	const [archivingId, setArchivingId] = useState<string | null>(null);
	const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

	const canWrite = !roleLoading && isAdmin && !authLoading && !!user;

	/* ---------------- DATA ---------------- */

	const {
		data: rawData = [],
		isLoading,
		isFetching
	} = useQuery<Equipment[]>({
		queryKey: ['equipments'],
		queryFn: getEquipmentsList
	});

	const data = useMemo(() => {
		if (includeArchived) return rawData;
		// hide archived by default
		return rawData.filter((e) => !e.archivedAt);
	}, [rawData, includeArchived]);

	/* ---------------- MUTATIONS ---------------- */

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEquipment(id),
		onMutate: (id) => setDeletingId(id),
		onSettled: () => setDeletingId(null),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['equipments'] });
			toast.success('Asset deleted');
		},
		onError: () => toast.error('Failed to delete asset')
	});

	const archiveMutation = useMutation({
		mutationFn: async (equipment: Equipment) => {
			if (!user) throw new Error('Not authenticated');
			await archiveEquipment(equipment.id, {
				uid: user.uid,
				email: user.email
			});
		},
		onMutate: (equipment) => setArchivingId(equipment.id),
		onSettled: () => setArchivingId(null),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['equipments'] });
			toast.success('Asset archived');
		},
		onError: () => toast.error('Failed to archive asset')
	});

	const unarchiveMutation = useMutation({
		mutationFn: async (equipment: Equipment) => {
			if (!user) throw new Error('Not authenticated');
			await unarchiveEquipment(equipment.id, {
				uid: user.uid,
				email: user.email
			});
		},
		onMutate: (equipment) => setUnarchivingId(equipment.id),
		onSettled: () => setUnarchivingId(null),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['equipments'] });
			toast.success('Asset restored');
		},
		onError: () => toast.error('Failed to restore asset')
	});

	/* ---------------- COLUMNS ---------------- */

	const columns: ColumnDef<Equipment>[] = [
		{
			accessorKey: 'name',
			header: 'Asset',
			cell: ({ row }) => {
				const equipment = row.original;
				const isArchived = Boolean(equipment.archivedAt);

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
		{
			id: 'actions',
			cell: ({ row }) => {
				const equipment = row.original;
				const isDeleting = deletingId === equipment.id;
				const isArchiving = archivingId === equipment.id;
				const isUnarchiving = unarchivingId === equipment.id;
				const isArchived = Boolean(equipment.archivedAt);

				const handleEdit = () => {
					router.push(`/equipments/action?action=edit&id=${equipment.id}`);
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
								disabled={!canWrite || isArchived || isDeleting || isArchiving}
								onClick={handleEdit}
							>
								Edit
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							{isArchived ? (
								<DropdownMenuItem
									disabled={!canWrite || isUnarchiving}
									onClick={() => unarchiveMutation.mutate(equipment)}
								>
									{isUnarchiving ? 'Restoring…' : 'Unarchive'}
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									disabled={!canWrite || isArchiving}
									onClick={() => archiveMutation.mutate(equipment)}
								>
									{isArchiving ? 'Archiving…' : 'Archive'}
								</DropdownMenuItem>
							)}

							<DropdownMenuItem
								className='text-destructive'
								disabled={
									!canWrite || isDeleting || isArchiving || isUnarchiving
								}
								onClick={() => setEquipmentToDelete(equipment)}
							>
								Delete
							</DropdownMenuItem>
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
				<div className='flex flex-wrap gap-3 items-center'>
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

					<div className='flex items-center gap-2 rounded-md border px-3 py-2'>
						<Switch
							id='include-archived'
							checked={includeArchived}
							onCheckedChange={setIncludeArchived}
						/>
						<Label
							htmlFor='include-archived'
							className='text-xs text-muted-foreground'
						>
							Include archived
						</Label>
					</div>
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

			{data.length === 0 ? (
				<div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center'>
					<div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
						<Package className='h-6 w-6 text-muted-foreground' />
					</div>
					<h3 className='mt-4 text-lg font-semibold'>No assets found</h3>
					<p className='mt-2 text-sm text-muted-foreground'>
						{includeArchived
							? 'No assets match your current filters.'
							: 'Add your first asset to start managing operations.'}
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
					data={data}
					columnFilters={columnFilters}
					onColumnFiltersChange={setColumnFilters}
				/>
			)}

			<AlertDialog
				open={!!equipmentToDelete}
				onOpenChange={(open) => !open && setEquipmentToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete asset</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete{' '}
							<strong>{equipmentToDelete?.name}</strong>.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className='bg-destructive'
							disabled={!canWrite}
							onClick={() => {
								if (equipmentToDelete) {
									deleteMutation.mutate(equipmentToDelete.id);
									setEquipmentToDelete(null);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
