'use client';

import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	ColumnDef
} from '@tanstack/react-table';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';

import { Equipment } from '@/types/equipment';

interface Props {
	columns: ColumnDef<Equipment>[];
	data: Equipment[];
}

export function EquipmentTable({ columns, data }: Props) {
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel()
	});

	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((group) => (
					<TableRow key={group.id}>
						{group.headers.map((header) => (
							<TableHead key={header.id}>
								{flexRender(
									header.column.columnDef.header,
									header.getContext()
								)}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>

			<TableBody>
				{table.getRowModel().rows.map((row) => (
					<TableRow key={row.id}>
						{row.getVisibleCells().map((cell) => (
							<TableCell key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
