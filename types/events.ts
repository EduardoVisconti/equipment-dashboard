import type { FieldValue, Timestamp } from 'firebase/firestore';

export type EquipmentEventType =
	| 'equipment.created'
	| 'equipment.updated'
	| 'equipment.archived'
	| 'equipment.unarchived'
	| 'maintenance.added';

export interface EquipmentEvent {
	id: string;

	type: EquipmentEventType;

	equipmentId: string;

	message?: string;
	metadata?: Record<string, any>;

	actorId: string;
	actorEmail: string | null;

	createdAt?: Timestamp | FieldValue;
}
