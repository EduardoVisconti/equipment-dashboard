import { z } from 'zod';

export const equipmentSchema = z.object({
	name: z.string().min(1),
	serialNumber: z.string().min(1),
	status: z.enum(['active', 'inactive', 'maintenance']),
	purchaseDate: z.string(),
	lastServiceDate: z.string()
});

export type EquipmentFormData = z.infer<typeof equipmentSchema>;
