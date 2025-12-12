/* eslint-disable react-hooks/incompatible-library */
"use client";

import {
  useReactTable, //monta linhas, células, headers
  getCoreRowModel, //pega dados e organiza em linhas
  flexRender, //função p renderizar células e cabeçalhos; desenha texto ou func
  ColumnDef,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Equipment } from "@/types/equipment";

interface EquipmentTableProps { //montando a tabela, precisa saber quais colunas e dados vai receber
  columns: ColumnDef<Equipment, unknown>[];
  data: Equipment[];
}

export function EquipmentTable ({ columns, data }: EquipmentTableProps) { //componente q recebe colunas e dados como props pra montar a tabela
  const table = useReactTable ({ //cérebro da tabela; lembra que o useReactTable monta a tabela
    data, //vem da API
    columns, //definidas em columns.tsx
    getCoreRowModel: getCoreRowModel(),
  }); //passando dados e colunas pro TanStack pra ele montar a tabela pra mim e o *table vira um obj com funções > table.getHeaderGroups e table.getRowModel

  return ( //começando a montar a tabela visualmente
    <div className="rounded-md border">
      <Table>

        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => ( //me de as linhas do cabeçalho > para cada linha do cabeçalho
            
            <TableRow key={headerGroup.id}> 
              { headerGroup.headers.map((header) => ( //pra cada coluna do cabeçalho
                
                <TableHead key={header.id}>
                  { flexRender (
                    header.column.columnDef.header, 
                    header.getContext() //desenha o titulo da coluna
                  )} 
                </TableHead>

              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows?.length ? ( //lista de linhas calculadas pelo TanStack; se tiver linha, renderiza
            table.getRowModel().rows.map((row) => ( //para cada coluna.. crie uma linha
              <TableRow key={row.id}> {row.getVisibleCells().map((cell) => ( //para cada coluna visível, crie uma célula
                  <TableCell key={cell.id}>
                    {flexRender( //desenha o conteúdo da célula
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          
          ) : ( //se não tem linhas
            <TableRow> 
              <TableCell colSpan={columns.length}
                className="text-center"> 
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>

      </Table>
    </div>
  );
}



/* 

interface EquipmentTableProps <TData, TValue> {
  columns: ColumnDef <TData, TValue>[];
  data: TData[];
}

export function EquipmentTable <TData, TValue>({
  columns,
  data,
}: EquipmentTableProps <TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

*/