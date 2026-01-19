'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { getEquipmentEvents } from '@/data-access/equipments';
import type { EquipmentEvent } from '@/types/events';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function typeLabel(type: EquipmentEvent['type']) {
	if (type === 'equipment.created') return 'Created';
	if (type === 'equipment.updated') return 'Updated';
	if (type === 'equipment.archived') return 'Archived';
	if (type === 'equipment.unarchived') return 'Restored';
	if (type === 'maintenance.added') return 'Maintenance';
	return type;
}

function typeVariant(type: EquipmentEvent['type']) {
	if (type === 'equipment.archived') return 'destructive';
	if (type === 'maintenance.added') return 'secondary';
	return 'outline';
}

function formatEventTime(value: any) {
	if (!value || typeof value?.toDate !== 'function') return '—';
	const d = value.toDate();
	return format(d, 'MMM dd, yyyy • h:mm a');
}

export default function ActivityFeedSection({
	equipmentId
}: {
	equipmentId: string;
}) {
	const {
		data = [],
		isLoading,
		isError
	} = useQuery<EquipmentEvent[]>({
		queryKey: ['equipments', equipmentId, 'events'],
		queryFn: () => getEquipmentEvents(equipmentId, 25),
		enabled: Boolean(equipmentId)
	});

	if (isLoading) {
		return (
			<div className='space-y-2'>
				<Skeleton className='h-10 w-full' />
				<Skeleton className='h-10 w-full' />
				<Skeleton className='h-10 w-2/3' />
			</div>
		);
	}

	if (isError) {
		return (
			<p className='text-sm text-muted-foreground'>
				Unable to load activity feed.
			</p>
		);
	}

	if (data.length === 0) {
		return (
			<div className='rounded-md border border-dashed p-6'>
				<p className='text-sm font-medium'>No activity yet</p>
				<p className='text-xs text-muted-foreground mt-1'>
					This asset has no recorded activity events.
				</p>
			</div>
		);
	}

	return (
		<div className='space-y-2'>
			{data.map((e) => (
				<div
					key={e.id}
					className='flex items-start justify-between gap-3 rounded-md border px-3 py-2'
				>
					<div className='min-w-0'>
						<div className='flex items-center gap-2'>
							<Badge variant={typeVariant(e.type)}>{typeLabel(e.type)}</Badge>
							<p className='text-sm font-medium truncate'>{e.message || '—'}</p>
						</div>

						<p className='text-xs text-muted-foreground'>
							{formatEventTime(e.createdAt)}
						</p>
					</div>

					<p className='text-xs text-muted-foreground'>{e.actorEmail || '—'}</p>
				</div>
			))}
		</div>
	);
}
