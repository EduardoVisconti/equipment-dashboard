'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { useUserRole } from '@/hooks/use-user-role';
import type { MaintenanceRecord } from '@/types/maintenance';
import {
	addMaintenanceRecord,
	getMaintenanceHistory
} from '@/data-access/equipments';
import { useAuth } from '@/context/auth-context';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

const schema = z.object({
	date: z.string().min(1, 'Date is required'),
	type: z.enum(['preventive', 'corrective']),
	notes: z.string().optional()
});

type FormValues = z.input<typeof schema>;

function typeLabel(type: MaintenanceRecord['type']) {
	return type === 'preventive' ? 'Preventive' : 'Corrective';
}

function typeBadgeVariant(type: MaintenanceRecord['type']) {
	return type === 'preventive' ? 'secondary' : 'outline';
}

function getErrorMessage(err: unknown) {
	if (err instanceof Error) {
		if (err.message === 'Not authenticated') return 'Sign in to continue.';
		if (err.message === 'Not authorized') return 'Viewer role: read-only.';
		return err.message;
	}
	return 'Unexpected error';
}

export default function MaintenanceHistorySection({
	equipmentId
}: {
	equipmentId: string;
}) {
	const queryClient = useQueryClient();
	const { user, loading } = useAuth();
	const { isAdmin, isLoading: roleLoading } = useUserRole();

	const isAuthBlocked = loading || !user;
	const isRoleBlocked = roleLoading || !isAdmin;
	const isBlocked = isAuthBlocked || isRoleBlocked;

	const [showForm, setShowForm] = useState(false);

	const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			date: today,
			type: 'preventive',
			notes: ''
		},
		mode: 'onSubmit'
	});

	const {
		data = [],
		isLoading,
		isError
	} = useQuery<MaintenanceRecord[]>({
		queryKey: ['equipments', equipmentId, 'maintenance'],
		queryFn: () => getMaintenanceHistory(equipmentId),
		enabled: Boolean(equipmentId)
	});

	const addMutation = useMutation({
		mutationFn: async (values: FormValues) => {
			if (!user) throw new Error('Not authenticated');
			if (!isAdmin) throw new Error('Not authorized');

			const parsed = schema.parse(values);

			await addMaintenanceRecord(
				equipmentId,
				{
					date: parsed.date,
					type: parsed.type,
					notes: parsed.notes?.trim() || undefined
				},
				{ uid: user.uid, email: user.email }
			);
		},
		onSuccess: async () => {
			// Maintenance history (subcollection)
			await queryClient.invalidateQueries({
				queryKey: ['equipments', equipmentId, 'maintenance']
			});

			// Asset details + events
			await queryClient.invalidateQueries({
				queryKey: ['equipments', equipmentId]
			});
			await queryClient.invalidateQueries({
				queryKey: ['equipments', equipmentId, 'events']
			});

			// Lists / dashboards / analytics that depend on lastServiceDate/nextServiceDate
			await queryClient.invalidateQueries({ queryKey: ['equipments'] });
			await queryClient.invalidateQueries({
				queryKey: ['equipments', 'analytics']
			});
			await queryClient.invalidateQueries({
				queryKey: ['equipments', 'dashboard']
			});

			toast.success('Maintenance record added');
			form.reset({ date: today, type: 'preventive', notes: '' });
			setShowForm(false);
		},
		onError: (err) => toast.error(getErrorMessage(err))
	});

	const isSaving = addMutation.isPending;

	function handleToggleForm() {
		if (isBlocked) {
			toast.error(
				isAuthBlocked
					? 'Sign in to add maintenance records.'
					: 'Viewer role: read-only.'
			);
			return;
		}
		setShowForm((v) => !v);
	}

	return (
		<div className='space-y-4'>
			<div className='flex items-center justify-between gap-3'>
				<div>
					<p className='text-sm font-medium'>Maintenance history</p>
					<p className='text-xs text-muted-foreground'>
						Log preventive and corrective maintenance events (v1).
					</p>
				</div>

				<Button
					variant='outline'
					disabled={isBlocked}
					onClick={handleToggleForm}
				>
					{showForm ? 'Cancel' : 'Add record'}
				</Button>
			</div>

			{showForm && (
				<div className='rounded-md border p-4 space-y-4'>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit((v) => {
								if (isBlocked) {
									toast.error(
										isAuthBlocked
											? 'Sign in to continue.'
											: 'Viewer role: read-only.'
									);
									return;
								}
								addMutation.mutate(v);
							})}
							className='space-y-4'
						>
							<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
								<FormField
									control={form.control}
									name='date'
									render={({ field }) => (
										<FormItem>
											<FormLabel>Date</FormLabel>
											<FormControl>
												<Input
													type='date'
													disabled={isSaving || isBlocked}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name='type'
									render={({ field }) => (
										<FormItem>
											<FormLabel>Type</FormLabel>
											<Select
												disabled={isSaving || isBlocked}
												value={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder='Select type' />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value='preventive'>Preventive</SelectItem>
													<SelectItem value='corrective'>Corrective</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name='notes'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Notes (optional)</FormLabel>
										<FormControl>
											<Input
												disabled={isSaving || isBlocked}
												placeholder='e.g. Replaced belt and calibrated sensor'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type='submit'
								disabled={isSaving || isBlocked}
							>
								{isSaving ? 'Saving...' : 'Save record'}
							</Button>

							{isRoleBlocked && !isAuthBlocked && (
								<p className='text-xs text-muted-foreground'>
									Viewer role: you can view records, but cannot add new entries.
								</p>
							)}
						</form>
					</Form>
				</div>
			)}

			<Separator />

			{isLoading ? (
				<div className='space-y-2'>
					<Skeleton className='h-10 w-full' />
					<Skeleton className='h-10 w-full' />
					<Skeleton className='h-10 w-2/3' />
				</div>
			) : isError ? (
				<p className='text-sm text-muted-foreground'>
					Unable to load maintenance history.
				</p>
			) : data.length === 0 ? (
				<div className='rounded-md border border-dashed p-6'>
					<p className='text-sm font-medium'>No maintenance records yet</p>
					<p className='text-xs text-muted-foreground mt-1'>
						Add the first maintenance log to build operational history.
					</p>
				</div>
			) : (
				<div className='space-y-2'>
					{data.map((r) => (
						<div
							key={r.id}
							className='flex items-start justify-between gap-3 rounded-md border px-3 py-2'
						>
							<div className='min-w-0'>
								<div className='flex items-center gap-2'>
									<p className='text-sm font-medium'>{r.date}</p>
									<Badge variant={typeBadgeVariant(r.type)}>
										{typeLabel(r.type)}
									</Badge>
								</div>
								<p className='text-xs text-muted-foreground truncate'>
									{r.notes || '—'}
								</p>
							</div>

							<p className='text-xs text-muted-foreground'>
								by{' '}
								{r.createdByEmail
									? r.createdByEmail
									: r.createdBy
										? `${r.createdBy.slice(0, 6)}…${r.createdBy.slice(-4)}`
										: '—'}
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
