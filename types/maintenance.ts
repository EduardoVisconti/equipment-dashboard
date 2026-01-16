import type { Timestamp, FieldValue } from 'firebase/firestore';

export type MaintenanceType = 'preventive' | 'corrective';

export interface MaintenanceRecord {
	id: string;

	date: string;
	type: MaintenanceType;
	notes?: string;

	createdBy: string;

	createdAt?: Timestamp | FieldValue;
}
