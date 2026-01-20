'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type PageSizeOption = 10 | 20 | 50 | 100;

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];

	// filtros continuam controlados por fora (como você já faz na table-section)
	columnFilters?: ColumnFiltersState;
	onColumnFiltersChange?: (filters: ColumnFiltersState) => void;

	/**
	 * Enterprise: persistir estado no localStorage (sort + pageSize)
	 * Ex: persistKey="equipments_table"
	 */
	persistKey?: string;

	/**
	 * Enterprise: default page size (se não tiver persistência)
	 */
	defaultPageSize?: PageSizeOption;
}

function safeReadJson<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function safeWriteJson(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// se o storage estiver bloqueado, não quebra o app
	}
}

export function DataTable<TData, TValue>({
	columns,
	data,
	columnFilters,
	onColumnFiltersChange,
	persistKey,
	defaultPageSize = 10
}: DataTableProps<TData, TValue>) {
	/* ---------------------------------------
	   Sorting + Pagination state (enterprise)
	---------------------------------------- */

	const persistSortingKey = persistKey ? `${persistKey}:sorting` : null;
	const persistPageSizeKey = persistKey ? `${persistKey}:pageSize` : null;

	const initialSorting = useMemo<SortingState>(() => {
		if (!persistSortingKey) return [];
		const saved = safeReadJson<SortingState>(persistSortingKey);
		return Array.isArray(saved) ? saved : [];
	}, [persistSortingKey]);

	const initialPageSize = useMemo<PageSizeOption>(() => {
		if (!persistPageSizeKey) return defaultPageSize;
		const saved = safeReadJson<PageSizeOption>(persistPageSizeKey);
		if (saved === 10 || saved === 20 || saved === 50 || saved === 100)
			return saved;
		return defaultPageSize;
	}, [persistPageSizeKey, defaultPageSize]);

	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const [pageSize, setPageSize] = useState<PageSizeOption>(initialPageSize);

	/* ---------------------------------------
	   Table instance
	---------------------------------------- */

	const table = useReactTable({
		data,
		columns,

		// estado híbrido:
		// - filtros: controlados por fora (se vierem)
		// - sorting/pageSize: controlados aqui dentro
		state: {
			columnFilters,
			sorting,
			pagination: {
				pageIndex: 0, // sempre inicia no 0; TanStack gerencia o resto
				pageSize
			}
		},

		// filtros externos
		onColumnFiltersChange: onColumnFiltersChange
			? (updaterOrValue) => {
					const newFilters =
						typeof updaterOrValue === 'function'
							? updaterOrValue(columnFilters || [])
							: updaterOrValue;

					onColumnFiltersChange(newFilters);
				}
			: undefined,

		// sorting interno
		onSortingChange: setSorting,

		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),

		// evita “resetar página” toda hora quando data muda
		autoResetPageIndex: false
	});

	/* ---------------------------------------
	   Persistência (enterprise)
	---------------------------------------- */

	useEffect(() => {
		if (!persistSortingKey) return;
		safeWriteJson(persistSortingKey, sorting);
	}, [persistSortingKey, sorting]);

	useEffect(() => {
		if (!persistPageSizeKey) return;
		safeWriteJson(persistPageSizeKey, pageSize);
	}, [persistPageSizeKey, pageSize]);

	// quando troca pageSize, volta para primeira página (mais previsível)
	useEffect(() => {
		table.setPageSize(pageSize);
		table.setPageIndex(0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pageSize]);

	/* ---------------------------------------
	   Helpers de UI (contagem)
	---------------------------------------- */

	const filteredCount = table.getFilteredRowModel().rows.length;
	const pageIndex = table.getState().pagination.pageIndex;
	const currentPageRows = table.getRowModel().rows.length;

	const start = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
	const end = filteredCount === 0 ? 0 : pageIndex * pageSize + currentPageRows;

	/* ---------------------------------------
	   Render
	---------------------------------------- */

	return (
		<div className='space-y-4'>
			<div className='rounded-md border'>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const canSort = header.column.getCanSort();
									const sortState = header.column.getIsSorted(); // 'asc' | 'desc' | false

									return (
										<TableHead key={header.id}>
											{header.isPlaceholder ? null : canSort ? (
												<button
													type='button'
													onClick={header.column.getToggleSortingHandler()}
													className='flex items-center gap-2 select-none'
												>
													<span>
														{flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
													</span>

													{/* indicador visual */}
													{sortState === 'asc' ? (
														<ChevronUp className='h-4 w-4 text-muted-foreground' />
													) : sortState === 'desc' ? (
														<ChevronDown className='h-4 w-4 text-muted-foreground' />
													) : (
														<ChevronsUpDown className='h-4 w-4 text-muted-foreground' />
													)}
												</button>
											) : (
												flexRender(
													header.column.columnDef.header,
													header.getContext()
												)
											)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>

					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='h-24 text-center text-sm text-muted-foreground'
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Footer enterprise: range + page size + controls */}
			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div className='text-xs text-muted-foreground'>
					Showing <span className='font-medium text-foreground'>{start}</span>–
					<span className='font-medium text-foreground'>{end}</span> of{' '}
					<span className='font-medium text-foreground'>{filteredCount}</span>
				</div>

				<div className='flex flex-wrap items-center justify-end gap-2'>
					{/* Page size */}
					<div className='flex items-center gap-2'>
						<span className='text-xs text-muted-foreground'>Rows</span>
						<select
							className='h-9 rounded-md border bg-background px-2 text-sm'
							value={pageSize}
							onChange={(e) =>
								setPageSize(Number(e.target.value) as PageSizeOption)
							}
						>
							<option value={10}>10</option>
							<option value={20}>20</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
						</select>
					</div>

					<Button
						variant='outline'
						size='sm'
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Previous
					</Button>

					<Button
						variant='outline'
						size='sm'
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	);
}
