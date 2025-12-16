'use client';

import { useSearchParams } from 'next/navigation';
import { EquipmentForm } from '@/components/equipment/EquipmentForm';
import { useEquipmentById } from '@/hooks/useEquipment';

export default function EquipmentActionPage() {
	const params = useSearchParams();

	const action = params.get('action'); // add | edit
	const id = params.get('id');

	const isEdit = action === 'edit' && id;

	const { data: equipment } = useEquipmentById(isEdit ? id! : null);

	return (
		<div className='p-6 max-w-xl'>
			<h1 className='text-xl font-semibold mb-4'>
				{isEdit ? 'Edit equipment' : 'Add equipment'}
			</h1>

			<EquipmentForm
				mode={isEdit ? 'edit' : 'add'}
				equipment={equipment}
			/>
		</div>
	);
}
