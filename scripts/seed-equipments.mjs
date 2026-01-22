import admin from 'firebase-admin';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Carrega o JSON sem "assert { type: 'json' }"
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Hoje “fixo” para o seed (pra bater com seus dashboards e ficar previsível)
const TODAY = '2026-01-22';

// helper para padronizar payload
function equipmentPayload(e) {
	return {
		name: e.name,
		serialNumber: e.serialNumber,
		status: e.status,

		purchaseDate: e.purchaseDate,
		lastServiceDate: e.lastServiceDate,
		nextServiceDate: e.nextServiceDate,
		serviceIntervalDays: e.serviceIntervalDays ?? 180,

		location: e.location,
		owner: e.owner,

		// audit
		createdBy: 'seed',
		createdByEmail: 'seed@local',
		updatedBy: 'seed',
		updatedByEmail: 'seed@local',

		archivedAt: null,
		archivedBy: null,
		archivedByEmail: null,

		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp()
	};
}

const SEED = [
	// OVERDUE (3)
	{
		name: 'Hydraulic Dock Lift – Bay 1',
		serialNumber: 'FL-TAM-DOCK-HYD-0001',
		status: 'active',
		purchaseDate: '2025-06-10',
		lastServiceDate: '2025-07-15',
		nextServiceDate: '2026-01-10',
		location: 'Tampa DC',
		owner: 'Operations Team'
	},
	{
		name: 'Forklift – Unit 3',
		serialNumber: 'FL-TAM-FORK-0003',
		status: 'maintenance',
		purchaseDate: '2024-11-02',
		lastServiceDate: '2025-07-01',
		nextServiceDate: '2026-01-05',
		location: 'Tampa DC',
		owner: 'Warehouse'
	},
	{
		name: 'Conveyor Motor – Line A',
		serialNumber: 'FL-TAM-CNV-MTR-0010',
		status: 'inactive',
		purchaseDate: '2023-08-19',
		lastServiceDate: '2025-06-01',
		nextServiceDate: '2026-01-15',
		location: 'Tampa DC',
		owner: 'Maintenance'
	},

	// DUE IN 7 DAYS (4) — 2026-01-22 até 2026-01-29
	{
		name: 'Air Compressor – Shop Floor',
		serialNumber: 'FL-TAM-AIR-0007',
		status: 'active',
		purchaseDate: '2025-01-12',
		lastServiceDate: '2025-08-01',
		nextServiceDate: '2026-01-24',
		location: 'Tampa DC',
		owner: 'Facilities'
	},
	{
		name: 'Generator – Backup 20kW',
		serialNumber: 'FL-TAM-GEN-0020',
		status: 'active',
		purchaseDate: '2022-02-10',
		lastServiceDate: '2025-07-29',
		nextServiceDate: '2026-01-25',
		location: 'Tampa DC',
		owner: 'Facilities'
	},
	{
		name: 'Pallet Wrapper – Station 2',
		serialNumber: 'FL-TAM-WRAP-0002',
		status: 'maintenance',
		purchaseDate: '2024-03-05',
		lastServiceDate: '2025-08-01',
		nextServiceDate: '2026-01-27',
		location: 'Tampa DC',
		owner: 'Packaging'
	},
	{
		name: 'Dock Door Sensor – Bay 4',
		serialNumber: 'FL-TAM-SENS-0004',
		status: 'active',
		purchaseDate: '2025-04-14',
		lastServiceDate: '2025-08-01',
		nextServiceDate: '2026-01-28',
		location: 'Tampa DC',
		owner: 'Operations Team'
	},

	// DUE IN 30 DAYS (4) — até 2026-02-21
	{
		name: 'Refrigeration Unit – Cold Room',
		serialNumber: 'FL-TAM-COLD-0001',
		status: 'active',
		purchaseDate: '2024-07-01',
		lastServiceDate: '2025-08-10',
		nextServiceDate: '2026-02-05',
		location: 'Tampa DC',
		owner: 'Cold Storage'
	},
	{
		name: 'Label Printer – Shipping Desk',
		serialNumber: 'FL-TAM-LBL-0009',
		status: 'active',
		purchaseDate: '2025-09-01',
		lastServiceDate: '2025-08-10',
		nextServiceDate: '2026-02-10',
		location: 'Tampa DC',
		owner: 'Shipping'
	},
	{
		name: 'Battery Charger – Forklift Bay',
		serialNumber: 'FL-TAM-BATT-0012',
		status: 'maintenance',
		purchaseDate: '2023-12-20',
		lastServiceDate: '2025-08-10',
		nextServiceDate: '2026-02-15',
		location: 'Tampa DC',
		owner: 'Warehouse'
	},
	{
		name: 'Safety Eye Wash Station – North',
		serialNumber: 'FL-TAM-SAFE-0006',
		status: 'active',
		purchaseDate: '2022-10-10',
		lastServiceDate: '2025-08-10',
		nextServiceDate: '2026-02-20',
		location: 'Tampa DC',
		owner: 'Safety'
	},

	// HEALTHY (4)
	{
		name: 'HVAC – Office Wing',
		serialNumber: 'FL-TAM-HVAC-0011',
		status: 'active',
		purchaseDate: '2023-04-22',
		lastServiceDate: '2025-11-01',
		nextServiceDate: '2026-04-30',
		location: 'Tampa DC',
		owner: 'Facilities'
	},
	{
		name: 'Workstation PC – Receiving',
		serialNumber: 'FL-TAM-PC-0005',
		status: 'active',
		purchaseDate: '2025-10-01',
		lastServiceDate: '2025-10-10',
		nextServiceDate: '2026-04-08',
		location: 'Tampa DC',
		owner: 'IT'
	},
	{
		name: 'Loading Scale – Bay 2',
		serialNumber: 'FL-TAM-SCALE-0008',
		status: 'active',
		purchaseDate: '2024-09-10',
		lastServiceDate: '2025-10-10',
		nextServiceDate: '2026-04-15',
		location: 'Tampa DC',
		owner: 'Operations Team'
	},
	{
		name: 'Handheld Scanner – Set B',
		serialNumber: 'FL-TAM-SCAN-0015',
		status: 'inactive',
		purchaseDate: '2023-01-01',
		lastServiceDate: '2025-10-10',
		nextServiceDate: '2026-03-15',
		location: 'Tampa DC',
		owner: 'Shipping'
	}
];

async function run() {
	console.log('Project ID from service account:', serviceAccount.project_id);
	console.log(`Seeding ${SEED.length} equipments...`);
	console.log(`Tip: TODAY reference in this script: ${TODAY}`);

	const col = db.collection('equipments');

	// evita duplicar seed: checa serialNumber já existente
	const existing = await col.get();
	const existingSerials = new Set(
		existing.docs.map((d) => d.data()?.serialNumber).filter(Boolean)
	);

	let created = 0;

	for (const e of SEED) {
		if (existingSerials.has(e.serialNumber)) {
			console.log(`SKIP (exists): ${e.serialNumber}`);
			continue;
		}

		await col.add(equipmentPayload(e));
		created += 1;
		console.log(`CREATED: ${e.serialNumber}`);
	}

	console.log(`Done. Created ${created} new assets.`);
}

run().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
