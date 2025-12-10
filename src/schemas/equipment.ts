import { z } from 'zod';

export const equipmentSchema = z.object({ //z. pra acessar os métodos de validação do zod
  name: z.string().min(1, 'Name is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  status: z.enum(['active', 'inactive', 'maintenance']), //deve ser um dos 3 valores
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  lastServiceDate: z.string().min(1, 'Last service date is required'),
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>; //z.infer para criar um tipo TS a partir do schema Zod -- validar dados pra forms/api/etc (react-hook-form, mutations do Tanstack Query, etc)
