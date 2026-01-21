'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import PageHeader from '@/components/core/headers/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import EquipmentForm from '../_components/form/equipment-form';
import { getEquipmentById } from '@/data-access/equipments';
import type { Equipment } from '@/types/equipment';

type Action = 'add' | 'edit';

export default function EquipmentActionPage() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const action = (searchParams.get('action') ?? 'add') as Action;
	const id = searchParams.get('id') ?? '';

	const isEdit = action === 'edit';

	// Validação simples (enterprise: não deixa estado “meio quebrado”)
	const isValidAction = action === 'add' || action === 'edit';
	const canLoad = isValidAction && (!isEdit || Boolean(id));

	const {
		data: equipment,
		isLoading,
		isError
	} = useQuery<Equipment | undefined>({
		queryKey: ['equipment', id],
		queryFn: () => getEquipmentById(id),
		enabled: canLoad && isEdit
	});

	const header = useMemo(() => {
		if (!isValidAction) return { title: 'Asset', desc: 'Invalid action' };
		return isEdit
			? {
					title: 'Edit asset',
					desc: 'Update asset information and service plan'
				}
			: { title: 'Add asset', desc: 'Create a new asset in the system' };
	}, [isEdit, isValidAction]);

	// Ação inválida
	if (!isValidAction) {
		return (
			<section className='p-4 md:p-6'>
				<PageHeader
					pageTitle={header.title}
					pageDescription={header.desc}
				/>

				<Card className='mt-4'>
					<CardHeader>
						<CardTitle>Invalid URL</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						<p className='text-sm text-muted-foreground'>
							The action parameter is invalid. Use <code>?action=add</code> or{' '}
							<code>?action=edit&id=...</code>.
						</p>
						<Button onClick={() => router.push('/equipments')}>
							Back to assets
						</Button>
					</CardContent>
				</Card>
			</section>
		);
	}

	// Edit sem id
	if (isEdit && !id) {
		return (
			<section className='p-4 md:p-6'>
				<PageHeader
					pageTitle={header.title}
					pageDescription={header.desc}
				/>

				<Card className='mt-4'>
					<CardHeader>
						<CardTitle>Missing asset id</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						<p className='text-sm text-muted-foreground'>
							To edit an asset, an <code>id</code> is required.
						</p>
						<Button onClick={() => router.push('/equipments')}>
							Back to assets
						</Button>
					</CardContent>
				</Card>
			</section>
		);
	}

	// Loading do edit
	if (isEdit && isLoading) {
		return (
			<section className='p-4 md:p-6'>
				<PageHeader
					pageTitle={header.title}
					pageDescription={header.desc}
				/>
				<div className='mt-4 max-w-xl space-y-4'>
					<Skeleton className='h-10 w-2/3' />
					<Skeleton className='h-10 w-full' />
					<Skeleton className='h-10 w-full' />
					<Skeleton className='h-10 w-full' />
					<Skeleton className='h-10 w-full' />
				</div>
			</section>
		);
	}

	// Erro no fetch
	if (isEdit && isError) {
		return (
			<section className='p-4 md:p-6'>
				<PageHeader
					pageTitle={header.title}
					pageDescription={header.desc}
				/>

				<Card className='mt-4'>
					<CardHeader>
						<CardTitle>Unable to load asset</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						<p className='text-sm text-muted-foreground'>
							We couldn&apos;t fetch this asset. Please try again.
						</p>
						<div className='flex gap-2'>
							<Button
								variant='outline'
								onClick={() => router.refresh()}
							>
								Retry
							</Button>
							<Button onClick={() => router.push('/equipments')}>
								Back to assets
							</Button>
						</div>
					</CardContent>
				</Card>
			</section>
		);
	}

	// Edit: equipamento não existe
	if (isEdit && !equipment) {
		return (
			<section className='p-4 md:p-6'>
				<PageHeader
					pageTitle={header.title}
					pageDescription={header.desc}
				/>

				<Card className='mt-4'>
					<CardHeader>
						<CardTitle>Asset not found</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						<p className='text-sm text-muted-foreground'>
							This asset may have been deleted or you may not have access.
						</p>
						<Button onClick={() => router.push('/equipments')}>
							Back to assets
						</Button>
					</CardContent>
				</Card>
			</section>
		);
	}

	return (
		<section className='p-4 md:p-6'>
			<PageHeader
				pageTitle={header.title}
				pageDescription={header.desc}
			/>

			<div className='mt-4'>
				<EquipmentForm
					action={isEdit ? 'edit' : 'add'}
					equipment={equipment}
				/>
			</div>
		</section>
	);
}
