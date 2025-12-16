'use client';

import { EquipmentTable } from '@/components/equipment/EquipmentTable';
import { useEquipmentList } from '@/hooks/useEquipment';
import Link from 'next/link';

export default function EquipmentPage() {
	const { data } = useEquipmentList();

	return (
		<div className='p-6'>
			<div className='flex justify-between mb-4'>
				<h1 className='text-xl font-semibold'>Equipment</h1>

				<Link
					href='/equipment/action?action=add'
					className='px-4 py-2 bg-black text-white rounded'
				>
					Add equipment
				</Link>
			</div>

			<EquipmentTable data={data ?? []} />
		</div>
	);
}
