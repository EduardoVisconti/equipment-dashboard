import { Equipment } from '@/types/equipment';
import { v4 as uuid } from 'uuid';

const equipmentDB: Equipment[] = [];

export function getAllEquipment() {
	return equipmentDB;
}

export function getEquipmentById(id: string) {
	return equipmentDB.find((e) => e.id === id);
}

export function createEquipment(data: Omit<Equipment, 'id'>) {
	const item: Equipment = { id: uuid(), ...data };
	equipmentDB.push(item);
	return item;
}

export function updateEquipment(
	id: string,
	data: Partial<Omit<Equipment, 'id'>>
) {
	const index = equipmentDB.findIndex((e) => e.id === id);
	if (index === -1) return null;
	equipmentDB[index] = { ...equipmentDB[index], ...data };
	return equipmentDB[index];
}

export function deleteEquipment(id: string) {
	const index = equipmentDB.findIndex((e) => e.id === id);
	if (index === -1) return null;
	return equipmentDB.splice(index, 1)[0];
}
