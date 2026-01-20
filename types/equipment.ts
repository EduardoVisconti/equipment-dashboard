import type { Timestamp, FieldValue } from 'firebase/firestore';

export type EquipmentStatus = 'active' | 'inactive' | 'maintenance';

export interface Equipment {
	id: string;

	name: string;
	serialNumber: string;
	serialNumberNormalized?: string;
	status: EquipmentStatus;

	purchaseDate: string; // "yyyy-MM-dd"
	lastServiceDate: string; // "yyyy-MM-dd"
	nextServiceDate?: string; // "yyyy-MM-dd"

	serviceIntervalDays?: number;

	owner?: string;
	location?: string;

	createdAt?: Timestamp | FieldValue;
	updatedAt?: Timestamp | FieldValue;

	createdBy?: string;
	createdByEmail?: string;

	updatedBy?: string;
	updatedByEmail?: string;

	archivedAt?: Timestamp | FieldValue | null;
	archivedBy?: string | null;
	archivedByEmail?: string | null;
}
