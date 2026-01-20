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
	where
} from 'firebase/firestore';

const equipmentsCollection = collection(db, 'equipments');

/* ---------------------------------------
   Helpers (funções auxiliares)
---------------------------------------- */

/**
 * Calcula a próxima data de manutenção:
 * lastServiceDate (yyyy-MM-dd) + intervalDays
 */
function computeNextServiceDate(
	lastServiceDate: string,
	intervalDays: number
): string {
	const base = new Date(`${lastServiceDate}T00:00:00`);
	base.setDate(base.getDate() + intervalDays);
	return base.toISOString().slice(0, 10);
}

/**
 * Converte "yyyy-MM-dd" para Date de forma segura.
 * Observação: cria no fuso local usando T00:00:00.
 */
function safeParseDate(value?: string): Date | null {
	if (!value) return null;
	const d = new Date(`${value}T00:00:00`);
	return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Lê Timestamp/FieldValue do Firestore e transforma em "ms" (number),
 * para ordenar no client com fallback.
 */
function getDocTimestampMillis(value: any): number {
	if (!value) return 0;
	if (typeof value?.toMillis === 'function') return value.toMillis();
	if (typeof value?.toDate === 'function') return value.toDate().getTime();
	return 0;
}

/**
 * Para ordenação enterprise por "próxima manutenção":
 * 1) usa nextServiceDate (se existir)
 * 2) senão calcula usando lastServiceDate + serviceIntervalDays (default 180)
 */
function getEquipmentNextServiceMillis(eq: Equipment): number {
	const anyEq = eq as any;

	// 1) se existir nextServiceDate salvo, usa
	const stored =
		typeof anyEq?.nextServiceDate === 'string'
			? anyEq.nextServiceDate
			: undefined;

	const derived = stored || eq.nextServiceDate;
	const next = safeParseDate(derived);
	if (next) return next.getTime();

	// 2) fallback: lastServiceDate + interval
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
 * Prioridade de status para visão operacional:
 * maintenance primeiro, depois inactive, depois active.
 */
function statusPriority(status: Equipment['status']): number {
	if (status === 'maintenance') return 0;
	if (status === 'inactive') return 1;
	return 2;
}

/* ---------------------------------------
   Public API (Equipments list / CRUD)
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
 * Busca assets com opções “enterprise”:
 * - includeArchived: inclui arquivados ou não
 * - sort: vários modos
 * - fallback local sort se Firestore exigir índice
 *
 * IMPORTANTE:
 * - Este filtro funciona bem se você SEMPRE tiver archivedAt no doc (mesmo null).
 * - Se alguns docs não tiverem archivedAt, o where('archivedAt','==',null) pode não bater.
 *   Por isso, no createEquipment eu seto archivedAt: null explicitamente.
 */
export const getEquipmentsList = async (
	options: GetEquipmentsListOptions = {}
): Promise<Equipment[]> => {
	const {
		includeArchived = false,
		sort = 'updated_desc',
		limit: max
	} = options;

	const clauses: any[] = [];

	// Se não quiser arquivados, filtramos somente archivedAt == null
	if (!includeArchived) {
		clauses.push(where('archivedAt', '==', null));
	}

	// Quando dá pra ordenar no Firestore, melhor (mais escalável)
	// Alguns modos precisam de sort no client (status_ops / next_service_asc)
	try {
		if (sort === 'updated_desc') clauses.push(orderBy('updatedAt', 'desc'));
		else if (sort === 'created_desc')
			clauses.push(orderBy('createdAt', 'desc'));
		else if (sort === 'name_asc') clauses.push(orderBy('name', 'asc'));
		else clauses.push(orderBy('updatedAt', 'desc')); // base estável

		if (typeof max === 'number') clauses.push(limit(max));

		const q = query(equipmentsCollection, ...clauses);
		const snapshot = await getDocs(q);

		const list = snapshot.docs.map((d) => ({
			id: d.id,
			...(d.data() as Omit<Equipment, 'id'>)
		}));

		// Pós-processamento no client para sorts especiais
		if (sort === 'status_ops') {
			return [...list].sort((a, b) => {
				const ap = statusPriority(a.status);
				const bp = statusPriority(b.status);
				if (ap !== bp) return ap - bp;

				const an = getEquipmentNextServiceMillis(a);
				const bn = getEquipmentNextServiceMillis(b);
				if (an !== bn) return an - bn;

				return (a.name || '').localeCompare(b.name || '');
			});
		}

		if (sort === 'next_service_asc') {
			return [...list].sort((a, b) => {
				const an = getEquipmentNextServiceMillis(a);
				const bn = getEquipmentNextServiceMillis(b);

				// se não tem data, manda pro final
				if (!an && bn) return 1;
				if (an && !bn) return -1;
				if (an !== bn) return an - bn;

				// desempate: updatedAt desc
				const au = getDocTimestampMillis((a as any).updatedAt);
				const bu = getDocTimestampMillis((b as any).updatedAt);
				return bu - au;
			});
		}

		return list;
	} catch {
		// Se o Firestore pedir índice, não quebramos o app:
		// buscamos sem query e ordenamos localmente (resiliência enterprise).
		const snapshot = await getDocs(equipmentsCollection);

		let list = snapshot.docs.map((d) => ({
			id: d.id,
			...(d.data() as Omit<Equipment, 'id'>)
		}));

		// filtro local de archived (quando includeArchived = false)
		if (!includeArchived) list = list.filter((e) => !(e as any)?.archivedAt);

		// sort local
		if (sort === 'updated_desc') {
			list.sort(
				(a, b) =>
					getDocTimestampMillis((b as any).updatedAt) -
					getDocTimestampMillis((a as any).updatedAt)
			);
		} else if (sort === 'created_desc') {
			list.sort(
				(a, b) =>
					getDocTimestampMillis((b as any).createdAt) -
					getDocTimestampMillis((a as any).createdAt)
			);
		} else if (sort === 'name_asc') {
			list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
		} else if (sort === 'status_ops') {
			list.sort((a, b) => {
				const ap = statusPriority(a.status);
				const bp = statusPriority(b.status);
				if (ap !== bp) return ap - bp;

				const an = getEquipmentNextServiceMillis(a);
				const bn = getEquipmentNextServiceMillis(b);
				if (an !== bn) return an - bn;

				return (a.name || '').localeCompare(b.name || '');
			});
		} else if (sort === 'next_service_asc') {
			list.sort((a, b) => {
				const an = getEquipmentNextServiceMillis(a);
				const bn = getEquipmentNextServiceMillis(b);

				if (!an && bn) return 1;
				if (an && !bn) return -1;
				if (an !== bn) return an - bn;

				const au = getDocTimestampMillis((a as any).updatedAt);
				const bu = getDocTimestampMillis((b as any).updatedAt);
				return bu - au;
			});
		}

		if (typeof max === 'number') list = list.slice(0, max);

		return list;
	}
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

	// se não vier nextServiceDate, calcula automático
	const next =
		data.nextServiceDate?.trim() ||
		(data.lastServiceDate
			? computeNextServiceDate(data.lastServiceDate, interval)
			: undefined);

	/**
	 * Consistência enterprise:
	 * - archivedAt sempre existe (null quando ativo)
	 * - archivedBy sempre existe (null quando ativo)
	 */
	const payload: Omit<Equipment, 'id'> & Record<string, any> = {
		...data,

		serviceIntervalDays: interval,
		nextServiceDate: next,

		createdBy: actor.uid,
		createdByEmail: actor.email ?? undefined,
		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? undefined,

		// IMPORTANTE: isso exige que o type Equipment aceite null nesses campos
		archivedAt: null,
		archivedBy: null,
		archivedByEmail: null,

		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	};

	// remove undefined
	Object.keys(payload).forEach(
		(k) => payload[k] === undefined && delete payload[k]
	);

	const docRef = await addDoc(equipmentsCollection, payload);

	// registra evento
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

	// atualiza doc
	await updateDoc(ref, payload);

	// registra evento
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

	/**
	 * “Restaurar” = archivedAt volta para null (ativo)
	 * Isso facilita filtro (archivedAt == null).
	 */
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

/* ---------------------------------------
   Events (Activity Feed)
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

/**
 * Cria um evento no feed (subcollection /events).
 * OBS: O type EquipmentEvent precisa aceitar metadata opcional (Record<string, any>).
 */
async function addEquipmentEvent(
	equipmentId: string,
	data: Omit<EquipmentEvent, 'id' | 'createdAt' | 'equipmentId'>
): Promise<void> {
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

	// grava maintenance
	await addDoc(maintenanceCollection(equipmentId), payload);

	// registra evento (activity feed)
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
