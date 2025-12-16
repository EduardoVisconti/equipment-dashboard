'use client';

import { useForm } from 'react-hook-form';
import { useCreateEquipment, useUpdateEquipment } from '@/hooks/useEquipment';
import { useRouter } from 'next/navigation';

type Props = {
	mode: 'add' | 'edit';
	equipment?: any;
};

export function EquipmentForm({ mode, equipment }: Props) {
	const router = useRouter();

	const form = useForm({
		defaultValues: {
			name: equipment?.name || '',
			status: equipment?.status || ''
		}
	});

	const create = useCreateEquipment();
	const update = useUpdateEquipment(equipment?.id);

	function onSubmit(data: any) {
		if (mode === 'add') {
			create.mutate(data, {
				onSuccess: () => router.push('/equipment')
			});
		}

		if (mode === 'edit') {
			update.mutate(data, {
				onSuccess: () => router.push('/equipment')
			});
		}
	}

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className='space-y-4'
		>
			<input
				placeholder='Name'
				{...form.register('name')}
				className='border p-2 w-full'
			/>

			<input
				placeholder='Status'
				{...form.register('status')}
				className='border p-2 w-full'
			/>

			<button className='px-4 py-2 bg-black text-white rounded'>Save</button>
		</form>
	);
}
