import { NextResponse } from 'next/server';
import { getAllEquipment, createEquipment } from '@/lib/mock-equipment-db';

export async function GET() {
	return NextResponse.json(getAllEquipment());
}

export async function POST(req: Request) {
	const body = await req.json();
	return NextResponse.json(createEquipment(body), { status: 201 });
}
