import { Equipment } from '@/types/equipment';

let equipmentDB: Equipment[] = Array.from({ length: 75 }).map((_, i) => ({
	id: crypto.randomUUID(),
	name: `Equipment ${i + 1}`,
	serialNumber: `SN-${1000 + i}`,
	status: i % 3 === 0 ? 'maintenance' : i % 2 === 0 ? 'inactive' : 'active',
	purchaseDate: '2023-01-01',
	lastServiceDate: '2024-01-01'
}));

export function listEquipments() {
	return equipmentDB;
}

export function getEquipmentById(id: string) {
	return equipmentDB.find((e) => e.id === id);
}

export function createEquipment(data: Omit<Equipment, 'id'>) {
	const newEquipment: Equipment = { id: crypto.randomUUID(), ...data };
	equipmentDB = [newEquipment, ...equipmentDB];
	return newEquipment;
}

export function updateEquipment(id: string, data: Omit<Equipment, 'id'>) {
	equipmentDB = equipmentDB.map((e) => (e.id === id ? { id, ...data } : e));
	return getEquipmentById(id);
}

export function deleteEquipment(id: string) {
	equipmentDB = equipmentDB.filter((e) => e.id !== id);
}
