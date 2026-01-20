import { db } from '@/lib/firebase';
import type { Equipment } from '@/types/equipment';
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
	limit,
	addDoc as addDocToCollection
} from 'firebase/firestore';

const equipmentsCollection = collection(db, 'equipments');

/* ---------------------------------------
   Helpers (datas / ordenação / fallback)
---------------------------------------- */

/**
 * Calcula nextServiceDate (yyyy-MM-dd) baseado em lastServiceDate + intervalDays.
 */
function computeNextServiceDate(lastServiceDate: string, intervalDays: number) {
	const base = new Date(`${lastServiceDate}T00:00:00`);
	base.setDate(base.getDate() + intervalDays);
	return base.toISOString().slice(0, 10);
}

/**
 * Parse seguro para strings yyyy-MM-dd (ou parecidas).
 */
function safeParseDate(value?: string): Date | null {
	if (!value) return null;
	const d = new Date(`${value}T00:00:00`);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Converte Timestamp do Firestore (ou qualquer coisa parecida) para millis.
 * Se não existir, retorna 0.
 */
function getDocTimestampMillis(value: any): number {
	if (!value) return 0;
	if (typeof value?.toMillis === 'function') return value.toMillis();
	if (typeof value?.toDate === 'function') return value.toDate().getTime();
	return 0;
}

/**
 * Usa nextServiceDate se existir, senão deriva de lastServiceDate + interval.
 * Retorna millis para ajudar ordenação.
 */
function getEquipmentNextServiceMillis(eq: Equipment): number {
	const anyEq = eq as any;

	// preferir nextServiceDate que veio do Firestore
	const stored =
		typeof anyEq?.nextServiceDate === 'string'
			? anyEq.nextServiceDate
			: undefined;

	const next = safeParseDate(stored || eq.nextServiceDate);
	if (next) return next.getTime();

	// fallback: lastServiceDate + interval (default 180)
	const last = safeParseDate(eq.lastServiceDate);
	if (!last) return 0;

	const interval =
		typeof anyEq?.serviceIntervalDays === 'number'
			? anyEq.serviceIntervalDays
			: 180;

	last.setDate(last.getDate() + interval);
	return last.getTime();
}

/**
 * Ordenação enterprise para operações:
 * maintenance primeiro, depois inactive, depois active.
 */
function statusPriority(status: Equipment['status']): number {
	if (status === 'maintenance') return 0;
	if (status === 'inactive') return 1;
	return 2;
}

/**
 * Fallback enterprise para "last updated":
 * 1) updatedAt
 * 2) createdAt
 * 3) purchaseDate (se existir)
 * 4) 0
 */
function getEquipmentUpdatedMillis(eq: Equipment): number {
	const anyEq = eq as any;

	const updated = getDocTimestampMillis(anyEq.updatedAt);
	if (updated) return updated;

	const created = getDocTimestampMillis(anyEq.createdAt);
	if (created) return created;

	const purchase = safeParseDate(eq.purchaseDate)?.getTime() ?? 0;
	return purchase;
}

/**
 * Fallback enterprise para "created date":
 * 1) createdAt
 * 2) purchaseDate
 * 3) 0
 */
function getEquipmentCreatedMillis(eq: Equipment): number {
	const anyEq = eq as any;

	const created = getDocTimestampMillis(anyEq.createdAt);
	if (created) return created;

	const purchase = safeParseDate(eq.purchaseDate)?.getTime() ?? 0;
	return purchase;
}

/* ---------------------------------------
   Public API (list)
---------------------------------------- */

export type EquipmentsSort =
	| 'updated_desc'
	| 'created_desc'
	| 'name_asc'
	| 'status_ops'
	| 'next_service_asc';

export interface GetEquipmentsListOptions {
	includeArchived?: boolean;
	sort?: EquipmentsSort;
	limit?: number;
}

/**
 * Enterprise-grade list fetch (sem sumir docs antigos):
 * - NÃO usa orderBy do Firestore, porque docs legados podem não ter createdAt/updatedAt
 * - busca tudo e ordena localmente com fallback
 * - evita aquele efeito de "sumiu equipamento"
 */
export const getEquipmentsList = async (
	options: GetEquipmentsListOptions = {}
): Promise<Equipment[]> => {
	const { includeArchived = true, sort = 'updated_desc', limit: max } = options;

	const snapshot = await getDocs(equipmentsCollection);

	let list = snapshot.docs.map((d) => ({
		id: d.id,
		...(d.data() as Omit<Equipment, 'id'>)
	}));

	// Filtra archived somente se o toggle estiver desligado
	if (!includeArchived) {
		list = list.filter((e) => !(e as any)?.archivedAt);
	}

	// Ordenação local (enterprise fallback)
	if (sort === 'updated_desc') {
		list.sort(
			(a, b) => getEquipmentUpdatedMillis(b) - getEquipmentUpdatedMillis(a)
		);
	}

	if (sort === 'created_desc') {
		list.sort(
			(a, b) => getEquipmentCreatedMillis(b) - getEquipmentCreatedMillis(a)
		);
	}

	if (sort === 'name_asc') {
		list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
	}

	if (sort === 'status_ops') {
		list.sort((a, b) => {
			const ap = statusPriority(a.status);
			const bp = statusPriority(b.status);
			if (ap !== bp) return ap - bp;

			// desempate: próximo service mais cedo
			const an = getEquipmentNextServiceMillis(a);
			const bn = getEquipmentNextServiceMillis(b);
			if (an !== bn) return an - bn;

			return (a.name || '').localeCompare(b.name || '');
		});
	}

	if (sort === 'next_service_asc') {
		list.sort((a, b) => {
			const an = getEquipmentNextServiceMillis(a);
			const bn = getEquipmentNextServiceMillis(b);

			// datas desconhecidas vão pro final
			if (!an && bn) return 1;
			if (an && !bn) return -1;

			if (an !== bn) return an - bn;

			// desempate: updated desc
			return getEquipmentUpdatedMillis(b) - getEquipmentUpdatedMillis(a);
		});
	}

	if (typeof max === 'number') list = list.slice(0, max);

	return list;
};

/* ---------------------------------------
   Single equipment CRUD
---------------------------------------- */

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

	// Importante: manter consistência para o futuro.
	// Aqui eu não obrigo archivedAt: null porque seu type atual não permite null,
	// então simplesmente deixo sem o campo (ou você muda o type depois e normaliza).
	const payload: Omit<Equipment, 'id'> & Record<string, any> = {
		...data,

		serviceIntervalDays: interval,
		nextServiceDate: next,

		createdBy: actor.uid,
		createdByEmail: actor.email ?? undefined,
		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? undefined,

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
		serviceIntervalDays: interval,
		nextServiceDate: next,

		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? undefined,
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

	// Comentário importante:
	// Para remover campos no Firestore de forma correta, o ideal é usar deleteField().
	// Aqui, para manter simples e compatível, nós "zeramos" os campos.
	// Se você quiser o modo enterprise perfeito, eu te mando a versão com deleteField().
	const payload: Record<string, any> = {
		archivedAt: undefined,
		archivedBy: undefined,
		archivedByEmail: undefined,

		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? null,
		updatedAt: serverTimestamp()
	};

	// remove undefined do payload (pra não escrever lixo)
	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	await updateDoc(ref, payload);

	await addEquipmentEvent(id, {
		type: 'equipment.unarchived',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Asset restored'
	});
};

/* ---------------------------------------
   Events
---------------------------------------- */

function eventsCollection(equipmentId: string) {
	return collection(db, 'equipments', equipmentId, 'events');
}

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

	await addDocToCollection(eventsCollection(equipmentId), payload);
}

/* ---------------------------------------
   Maintenance
---------------------------------------- */

function maintenanceCollection(equipmentId: string) {
	return collection(db, 'equipments', equipmentId, 'maintenance');
}

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

	// Event para histórico/auditoria (enterprise)
	await addEquipmentEvent(equipmentId, {
		type: 'maintenance.added',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Maintenance record added',
		metadata: {
			date: data.date,
			maintenanceType: data.type
		}
	});
};
