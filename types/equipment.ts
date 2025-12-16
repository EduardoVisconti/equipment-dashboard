export type EquipmentStatus = 'active' | 'inactive' | 'maintenance';

export interface Equipment {
	id: string;
	name: string;
	serialNumber: string;
	status: EquipmentStatus;
	purchaseDate: string;
	lastServiceDate: string;
}
