import { db } from '@/lib/firebase';
import { Equipment } from '@/types/equipment';

import {
	collection,
	getDocs,
	getDoc,
	doc,
	addDoc,
	updateDoc,
	deleteDoc,
	serverTimestamp
} from 'firebase/firestore';

const equipmentsCollection = collection(db, 'equipments');

function computeNextServiceDate(
	lastServiceDate: string,
	intervalDays: number
): string {
	// lastServiceDate é yyyy-MM-dd
	// cria data no fuso local e soma dias
	const base = new Date(`${lastServiceDate}T00:00:00`);
	base.setDate(base.getDate() + intervalDays);
	return base.toISOString().slice(0, 10);
}

export const getEquipmentsList = async (): Promise<Equipment[]> => {
	const snapshot = await getDocs(equipmentsCollection);

	return snapshot.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<Equipment, 'id'>)
	}));
};

export const getEquipmentById = async (
	id: string
): Promise<Equipment | undefined> => {
	const ref = doc(db, 'equipments', id);
	const snap = await getDoc(ref);

	if (!snap.exists()) return undefined;

	return {
		id: snap.id,
		...(snap.data() as Omit<Equipment, 'id'>)
	};
};

export const createEquipment = async (
	data: Omit<Equipment, 'id'>
): Promise<void> => {
	const interval = data.serviceIntervalDays ?? 180;

	// se não vier nextServiceDate, calcula automático
	const next =
		data.nextServiceDate?.trim() ||
		(data.lastServiceDate
			? computeNextServiceDate(data.lastServiceDate, interval)
			: undefined);

	const payload: Omit<Equipment, 'id'> & Record<string, any> = {
		...data,
		serviceIntervalDays: interval,
		nextServiceDate: next,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	};

	// limpa undefined
	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	await addDoc(equipmentsCollection, payload);
};

export const updateEquipment = async (
	id: string,
	data: Omit<Equipment, 'id'>
): Promise<void> => {
	const ref = doc(db, 'equipments', id);

	const interval = data.serviceIntervalDays ?? 180;

	// se next vier vazio mas last existir, calcula automático
	const next =
		data.nextServiceDate?.trim() ||
		(data.lastServiceDate
			? computeNextServiceDate(data.lastServiceDate, interval)
			: undefined);

	const payload: Omit<Equipment, 'id'> & Record<string, any> = {
		...data,
		serviceIntervalDays: interval,
		nextServiceDate: next,
		updatedAt: serverTimestamp()
	};

	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	await updateDoc(ref, payload);
};

export const deleteEquipment = async (id: string): Promise<void> => {
	const ref = doc(db, 'equipments', id);
	await deleteDoc(ref);
};
