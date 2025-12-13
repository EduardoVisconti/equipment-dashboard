import { NextResponse } from 'next/server';
import { getEquipmentById, updateEquipment, deleteEquipment } from '@/lib/mock-equipment-db';
import { Equipment } from '@/types/equipment';

type RouteParams = { //tipo para os parâmetros da rota
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const item = getEquipmentById(id);

  if (!item) {
    return NextResponse.json({ message: 'Equipment not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as Partial<Omit<Equipment, 'id'>>;

  const updated = updateEquipment(id, body);

  if (!updated) {
    return NextResponse.json({ message: 'Equipment not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const removed = deleteEquipment(id);

  if (!removed) {
    return NextResponse.json({ message: 'Equipment not found' }, { status: 404 });
  }

  return NextResponse.json(removed);
}
