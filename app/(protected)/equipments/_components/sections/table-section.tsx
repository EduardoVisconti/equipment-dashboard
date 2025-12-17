'use client';

import { useState } from 'react';
import { ColumnDef, ColumnFiltersState } from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Package } from 'lucide-react';
import { deleteEquipment, getEquipmentsList } from '@/data-access/equipments';
import { Equipment } from '@/types/equipment';
import { toast } from 'sonner';

import { DataTable } from '@/components/core/tables/data-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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

export default function EquipmentsTableSection() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(
		null
	);

	/* ---------------- DATA ---------------- */

	const {
		data = [],
		isLoading,
		isFetching
	} = useQuery<Equipment[]>({
		queryKey: ['equipments'],
		queryFn: getEquipmentsList
	});

	/* ---------------- MUTATIONS ---------------- */

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEquipment(id),
		onMutate: (id) => setDeletingId(id),
		onSettled: () => setDeletingId(null),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['equipments'] });
			toast.success('Equipment deleted');
		},
		onError: () => {
			toast.error('Failed to delete equipment');
		}
	});

	/* ---------------- HANDLERS ---------------- */

	const handleEdit = (equipment: Equipment) => {
		router.push(`/equipments/action?action=edit&id=${equipment.id}`);
	};

	/* ---------------- COLUMNS ---------------- */

	const columns: ColumnDef<Equipment>[] = [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'serialNumber', header: 'Serial' },
		{ accessorKey: 'status', header: 'Status' },
		{
			id: 'actions',
			cell: ({ row }) => {
				const equipment = row.original;
				const isDeleting = deletingId === equipment.id;

				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant='ghost'
								size='icon'
							>
								<MoreHorizontal className='h-4 w-4' />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuItem
								disabled={isDeleting}
								onClick={() => handleEdit(equipment)}
							>
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								className='text-destructive'
								disabled={isDeleting}
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

	const TableSkeleton = () => (
		<div className='space-y-4'>
			<div className='flex justify-between'>
				<Skeleton className='h-10 w-64' />
				<Skeleton className='h-10 w-32' />
			</div>

			<div className='rounded-md border'>
				<div className='divide-y'>
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className='flex items-center gap-4 p-4'
						>
							<Skeleton className='h-4 w-1/4' />
							<Skeleton className='h-4 w-1/4' />
							<Skeleton className='h-4 w-24' />
							<Skeleton className='ml-auto h-8 w-8 rounded-full' />
						</div>
					))}
				</div>
			</div>
		</div>
	);

	/* ---------------- LOADING ---------------- */

	if (isLoading) {
		return <TableSkeleton />;
	}

	/* ---------------- RENDER ---------------- */

	return (
		<div className='space-y-4'>
			<div className='flex justify-between items-center'>
				<Input
					placeholder='Filter by name...'
					value={
						(columnFilters.find((f) => f.id === 'name')?.value as string) ?? ''
					}
					onChange={(e) =>
						setColumnFilters([{ id: 'name', value: e.target.value }])
					}
					className='max-w-sm'
				/>

				{isFetching && (
					<p className='text-xs text-muted-foreground'>Refreshing...</p>
				)}

				<Button onClick={() => router.push('/equipments/action?action=add')}>
					Add equipment
				</Button>
			</div>

			{data.length === 0 && (
				<div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center'>
					<div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
						<Package className='h-6 w-6 text-muted-foreground' />
					</div>

					<h3 className='mt-4 text-lg font-semibold'>No equipments found</h3>
					<p className='mt-2 text-sm text-muted-foreground max-w-sm'>
						You don&apos;t have any equipments yet. Create your first equipment
						to start managing them here.
					</p>

					<Button
						className='mt-6'
						onClick={() => router.push('/equipments/action?action=add')}
					>
						Add equipment
					</Button>
				</div>
			)}

			{data.length > 0 && (
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
						<AlertDialogTitle>Delete equipment</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{' '}
							<strong>{equipmentToDelete?.name}</strong>? This action cannot be
							undone.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
							disabled={deleteMutation.isPending}
							onClick={() => {
								if (equipmentToDelete) {
									deleteMutation.mutate(equipmentToDelete.id);
									setEquipmentToDelete(null);
								}
							}}
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
