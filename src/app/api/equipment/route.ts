import { NextResponse } from 'next/server'; //necessário do Next para montar as respostas HTTP, definir o status code + devolver objs em JSON
import { getAllEquipment, createEquipment } from '@/lib/mock-equipment-db';
import { equipmentSchema } from '@/schemas/equipment';

export async function GET() {
  const items = getAllEquipment();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  try {

    const raw = await request.json(); //le os dados enviados na requisição

    const parsed = equipmentSchema.parse(raw); //garantir validação dos dados c/ Zod

    const created = createEquipment(parsed);

    return NextResponse.json(created, { status: 201 });

  } catch (err) {

    if (err instanceof Error) { //se for um erro do próprio zod
      return NextResponse.json(
        { message: err.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Unknown server error' },
      { status: 500 }
    );
  }
}

/* export async function POST(request: Request) { //request: request 
  const body = (await request.json()) as Omit<Equipment, 'id'>;

  // Aqui poderíamos validar com Zod, se quisermos
  const created = createEquipment(body);

  return NextResponse.json(created, { status: 201 });
} */
