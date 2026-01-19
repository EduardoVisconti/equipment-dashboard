import { db } from '@/lib/firebase';
import { Equipment } from '@/types/equipment';
import type { MaintenanceRecord } from '@/types/maintenance';
import type { EquipmentEvent } from '@/types/events';

import {
	collection,
	getDocs,
	getDoc,
	doc,
	addDoc,
	updateDoc,
	deleteDoc,
	serverTimestamp,
	query,
	orderBy,
	limit
} from 'firebase/firestore';

const equipmentsCollection = collection(db, 'equipments');

/* ---------------- HELPERS ---------------- */

function computeNextServiceDate(lastServiceDate: string, intervalDays: number) {
	const base = new Date(`${lastServiceDate}T00:00:00`);
	base.setDate(base.getDate() + intervalDays);
	return base.toISOString().slice(0, 10);
}

function maintenanceCollection(equipmentId: string) {
	return collection(db, 'equipments', equipmentId, 'maintenance');
}

function eventsCollection(equipmentId: string) {
	return collection(db, 'equipments', equipmentId, 'events');
}

async function addEquipmentEvent(
	equipmentId: string,
	data: Omit<EquipmentEvent, 'id' | 'createdAt' | 'equipmentId'>
) {
	const payload: Omit<EquipmentEvent, 'id'> & Record<string, any> = {
		...data,
		equipmentId,
		createdAt: serverTimestamp()
	};

	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	await addDoc(eventsCollection(equipmentId), payload);
}

/* ---------------- EQUIPMENTS ---------------- */

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
	data: Omit<Equipment, 'id'>,
	actor: { uid: string; email?: string | null }
): Promise<void> => {
	const interval = data.serviceIntervalDays ?? 180;

	const next =
		data.nextServiceDate?.trim() ||
		(data.lastServiceDate
			? computeNextServiceDate(data.lastServiceDate, interval)
			: undefined);

	const payload: Omit<Equipment, 'id'> & Record<string, any> = {
		...data,
		createdBy: actor.uid,
		createdByEmail: actor.email ?? undefined,
		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? undefined,

		serviceIntervalDays: interval,
		nextServiceDate: next,

		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	};

	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	const docRef = await addDoc(equipmentsCollection, payload);

	await addEquipmentEvent(docRef.id, {
		type: 'equipment.created',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Asset created'
	});
};

export const updateEquipment = async (
	id: string,
	data: Omit<Equipment, 'id'>,
	actor: { uid: string; email?: string | null }
): Promise<void> => {
	const ref = doc(db, 'equipments', id);

	const interval = data.serviceIntervalDays ?? 180;

	const next =
		data.nextServiceDate?.trim() ||
		(data.lastServiceDate
			? computeNextServiceDate(data.lastServiceDate, interval)
			: undefined);

	const payload: Omit<Equipment, 'id'> & Record<string, any> = {
		...data,
		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? undefined,
		serviceIntervalDays: interval,
		nextServiceDate: next,
		updatedAt: serverTimestamp()
	};

	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	await updateDoc(ref, payload);

	await addEquipmentEvent(id, {
		type: 'equipment.updated',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Asset updated'
	});
};

export const deleteEquipment = async (id: string): Promise<void> => {
	const ref = doc(db, 'equipments', id);
	await deleteDoc(ref);
};

export const archiveEquipment = async (
	id: string,
	actor: { uid: string; email?: string | null }
): Promise<void> => {
	const ref = doc(db, 'equipments', id);

	const payload: Record<string, any> = {
		archivedAt: serverTimestamp(),
		archivedBy: actor.uid,
		archivedByEmail: actor.email ?? null,
		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? null,
		updatedAt: serverTimestamp()
	};

	await updateDoc(ref, payload);

	await addEquipmentEvent(id, {
		type: 'equipment.archived',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Asset archived'
	});
};

export const unarchiveEquipment = async (
	id: string,
	actor: { uid: string; email?: string | null }
): Promise<void> => {
	const ref = doc(db, 'equipments', id);

	const payload: Record<string, any> = {
		archivedAt: null,
		archivedBy: null,
		archivedByEmail: null,
		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? null,
		updatedAt: serverTimestamp()
	};

	await updateDoc(ref, payload);

	await addEquipmentEvent(id, {
		type: 'equipment.unarchived',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Asset restored'
	});
};

/* ---------------- EVENTS ---------------- */

export const getEquipmentEvents = async (
	equipmentId: string,
	max = 25
): Promise<EquipmentEvent[]> => {
	const q = query(
		eventsCollection(equipmentId),
		orderBy('createdAt', 'desc'),
		limit(max)
	);

	const snapshot = await getDocs(q);

	return snapshot.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<EquipmentEvent, 'id'>)
	}));
};

/* ---------------- MAINTENANCE ---------------- */

export const getMaintenanceHistory = async (
	equipmentId: string
): Promise<MaintenanceRecord[]> => {
	const q = query(maintenanceCollection(equipmentId), orderBy('date', 'desc'));

	const snapshot = await getDocs(q);

	return snapshot.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<MaintenanceRecord, 'id'>)
	}));
};

export const addMaintenanceRecord = async (
	equipmentId: string,
	data: Omit<
		MaintenanceRecord,
		'id' | 'createdAt' | 'createdBy' | 'createdByEmail'
	>,
	actor: { uid: string; email?: string | null }
): Promise<void> => {
	const payload: Omit<MaintenanceRecord, 'id'> & Record<string, any> = {
		...data,
		notes: data.notes?.trim() || undefined,
		createdBy: actor.uid,
		createdByEmail: actor.email ?? null,
		createdAt: serverTimestamp()
	};

	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	await addDoc(maintenanceCollection(equipmentId), payload);

	await addEquipmentEvent(equipmentId, {
		type: 'maintenance.added',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Maintenance record added',
		metadata: {
			date: data.date,
			type: data.type
		}
	});
};
