import { NextResponse } from 'next/server';
import {
	getEquipmentById,
	updateEquipment,
	deleteEquipment
} from '@/lib/mock-equipment-db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
	const item = getEquipmentById(params.id);
	if (!item)
		return NextResponse.json({ message: 'Not found' }, { status: 404 });
	return NextResponse.json(item);
}

export async function PUT(
	req: Request,
	{ params }: { params: { id: string } }
) {
	const body = await req.json();
	const updated = updateEquipment(params.id, body);
	return updated
		? NextResponse.json(updated)
		: NextResponse.json({ message: 'Not found' }, { status: 404 });
}

export async function DELETE(
	_: Request,
	{ params }: { params: { id: string } }
) {
	const deleted = deleteEquipment(params.id);
	return deleted
		? NextResponse.json(deleted)
		: NextResponse.json({ message: 'Not found' }, { status: 404 });
}
