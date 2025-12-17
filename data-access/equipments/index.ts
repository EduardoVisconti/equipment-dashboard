import { Equipment } from '@/types/equipment';
import {
	listEquipments,
	getEquipmentById as getById,
	createEquipment as create,
	updateEquipment as update,
	deleteEquipment as remove
} from './mock-db';

export const getEquipmentsList = async (): Promise<Equipment[]> => {
	await new Promise((r) => setTimeout(r, 200));
	return listEquipments();
};

export const getEquipmentById = async (
	id: string
): Promise<Equipment | undefined> => {
	await new Promise((r) => setTimeout(r, 150));
	return getById(id);
};

export const createEquipment = async (
	data: Omit<Equipment, 'id'>
): Promise<Equipment> => {
	await new Promise((r) => setTimeout(r, 150));
	return create(data);
};

export const updateEquipment = async (
	id: string,
	data: Omit<Equipment, 'id'>
): Promise<Equipment | undefined> => {
	await new Promise((r) => setTimeout(r, 150));
	return update(id, data);
};

export const deleteEquipment = async (id: string): Promise<void> => {
	await new Promise((r) => setTimeout(r, 150));
	remove(id);
};
