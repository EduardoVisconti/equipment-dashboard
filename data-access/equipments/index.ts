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
   Helpers
---------------------------------------- */

// lastServiceDate: "yyyy-MM-dd"
function computeNextServiceDate(
	lastServiceDate: string,
	intervalDays: number
): string {
	const base = new Date(`${lastServiceDate}T00:00:00`);
	base.setDate(base.getDate() + intervalDays);
	return base.toISOString().slice(0, 10);
}

function safeParseDate(value?: string): Date | null {
	if (!value) return null;
	const d = new Date(`${value}T00:00:00`);
	return Number.isNaN(d.getTime()) ? null : d;
}

function getDocTimestampMillis(value: any): number {
	if (!value) return 0;
	if (typeof value?.toMillis === 'function') return value.toMillis();
	if (typeof value?.toDate === 'function') return value.toDate().getTime();
	return 0;
}

function getEquipmentNextServiceMillis(eq: Equipment): number {
	const anyEq = eq as any;

	// 1) se tiver nextServiceDate salvo, usa
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

function statusPriority(status: Equipment['status']): number {
	// visão de operações (enterprise): maintenance primeiro, depois inactive, depois active
	if (status === 'maintenance') return 0;
	if (status === 'inactive') return 1;
	return 2;
}

/* ---------------------------------------
   Public API
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
 * Lista enterprise:
 * - sort default: updated_desc
 * - includeArchived: true/false
 *
 * Nota importante:
 * - NÃO usamos where('archivedAt','==',null) porque isso NÃO inclui docs antigos
 *   que não possuem o campo archivedAt (campo ausente != null no Firestore).
 * - Para resiliência (e para seu volume atual), filtramos archived no client.
 */
export const getEquipmentsList = async (
	options: GetEquipmentsListOptions = {}
): Promise<Equipment[]> => {
	const {
		includeArchived = false,
		sort = 'updated_desc',
		limit: max
	} = options;

	// Base query com orderBy quando possível
	const clauses: any[] = [];

	// orderBy: tentamos usar Firestore pra performance e consistência
	if (sort === 'updated_desc') {
		clauses.push(orderBy('updatedAt', 'desc'));
	} else if (sort === 'created_desc') {
		clauses.push(orderBy('createdAt', 'desc'));
	} else if (sort === 'name_asc') {
		clauses.push(orderBy('name', 'asc'));
	} else {
		// status_ops e next_service_asc exigem sort custom -> base estável
		clauses.push(orderBy('updatedAt', 'desc'));
	}

	if (typeof max === 'number') clauses.push(limit(max));

	let list: Equipment[] = [];

	try {
		const q = query(equipmentsCollection, ...clauses);
		const snapshot = await getDocs(q);

		list = snapshot.docs.map((d) => ({
			id: d.id,
			...(d.data() as Omit<Equipment, 'id'>)
		}));
	} catch (err) {
		// fallback resiliente (ex: índice faltando)
		const snapshot = await getDocs(equipmentsCollection);
		list = snapshot.docs.map((d) => ({
			id: d.id,
			...(d.data() as Omit<Equipment, 'id'>)
		}));
	}

	// Filtra archived no client (resiliente: campo pode ser inexistente)
	if (!includeArchived) {
		list = list.filter((e) => !Boolean((e as any)?.archivedAt));
	}

	// Post-sort local para modos “enterprise”
	if (sort === 'status_ops') {
		list.sort((a, b) => {
			const ap = statusPriority(a.status);
			const bp = statusPriority(b.status);
			if (ap !== bp) return ap - bp;

			// tie-breaker: next service (mais urgente primeiro)
			const an = getEquipmentNextServiceMillis(a);
			const bn = getEquipmentNextServiceMillis(b);
			if (an !== bn) return an - bn;

			return (a.name || '').localeCompare(b.name || '');
		});
	} else if (sort === 'next_service_asc') {
		list.sort((a, b) => {
			const an = getEquipmentNextServiceMillis(a);
			const bn = getEquipmentNextServiceMillis(b);

			// datas desconhecidas por último
			if (!an && bn) return 1;
			if (an && !bn) return -1;
			if (an !== bn) return an - bn;

			// tie-breaker: updatedAt desc
			const au = getDocTimestampMillis((a as any).updatedAt);
			const bu = getDocTimestampMillis((b as any).updatedAt);
			return bu - au;
		});
	}

	if (typeof max === 'number') list = list.slice(0, max);

	return list;
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
	const serial = data.serialNumber?.trim();

	if (serial) {
		const snapshot = await getDocs(
			query(
				equipmentsCollection,
				where('serialNumber', '==', serial)
				// Observação:
				// Não filtramos archivedAt aqui com where('archivedAt','==',null)
				// porque seus docs antigos podem NÃO ter esse campo.
				// Então a regra fica: se achar qualquer doc com esse serial
				// e ele NÃO estiver archived, bloqueia.
			)
		);

		const serialExistsInActiveAsset = snapshot.docs.some((d) => {
			const existing = d.data() as any;
			// se não tem archivedAt, tratamos como "não arquivado"
			const isArchived = Boolean(existing?.archivedAt);
			return !isArchived;
		});

		if (serialExistsInActiveAsset) {
			// padrão enterprise: erro previsível pra UI tratar
			throw new Error('SERIAL_ALREADY_EXISTS');
		}
	}
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

		// Mantém consistência: já cria com campos de archive presentes
		// (Se você preferir, pode deixar “undefined” e limpar, mas eu prefiro explícito.)
		archivedAt: null,
		archivedBy: null,
		archivedByEmail: null,

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

	// Observação: Firestore aceita null no payload (é um valor válido para o documento),
	// mesmo que seu type do front não goste. Aqui a gente escreve null de propósito
	// pra padronizar o schema.
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
	// 1) cria o maintenance record (subcollection)
	const recordPayload: Omit<MaintenanceRecord, 'id'> & Record<string, any> = {
		...data,
		notes: data.notes?.trim() || undefined,
		createdBy: actor.uid,
		createdByEmail: actor.email ?? null,
		createdAt: serverTimestamp()
	};

	Object.keys(recordPayload).forEach(
		(k) => recordPayload[k] === undefined && delete recordPayload[k]
	);

	await addDoc(maintenanceCollection(equipmentId), recordPayload);

	// 2) Atualiza o equipamento: lastServiceDate + nextServiceDate (+ audit)
	//    - pega o doc para saber serviceIntervalDays atual (fallback 180)
	const equipmentRef = doc(db, 'equipments', equipmentId);
	const snap = await getDoc(equipmentRef);

	let interval = 180;
	if (snap.exists()) {
		const existing = snap.data() as any;
		if (typeof existing?.serviceIntervalDays === 'number') {
			interval = existing.serviceIntervalDays;
		}
	}

	const nextServiceDate = computeNextServiceDate(data.date, interval);

	const equipmentPatch: Record<string, any> = {
		lastServiceDate: data.date,
		nextServiceDate,
		updatedBy: actor.uid,
		updatedByEmail: actor.email ?? null,
		updatedAt: serverTimestamp()
	};

	await updateDoc(equipmentRef, equipmentPatch);

	// 3) Event enterprise: loga manutenção na trilha
	await addEquipmentEvent(equipmentId, {
		type: 'maintenance.added',
		actorId: actor.uid,
		actorEmail: actor.email ?? null,
		message: 'Maintenance record added',
		metadata: {
			date: data.date,
			maintenanceType: data.type,
			nextServiceDate,
			serviceIntervalDays: interval
		}
	});
};
