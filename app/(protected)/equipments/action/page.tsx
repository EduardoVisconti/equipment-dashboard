import EquipmentForm from '../_components/form/equipment-form';
import { getEquipmentById } from '@/data-access/equipments';

interface PageProps {
	searchParams: {
		action?: 'add' | 'edit';
		id?: string;
	};
}

export default async function EquipmentActionPage({ searchParams }: PageProps) {
	const action = searchParams.action ?? 'add';

	const equipment =
		action === 'edit' && searchParams.id
			? await getEquipmentById(searchParams.id)
			: undefined;

	return (
		<section className='p-4 md:p-6'>
			<div className='mx-auto w-full max-w-2xl'>
				<EquipmentForm
					action={action}
					equipment={equipment}
				/>
			</div>
		</section>
	);
}
