"use client";

import { EquipmentTable } from "@/components/equipment/EquipmentTable"; //importa a tabela
import { equipmentColumns } from "@/components/equipment/columns";
import { useEquipmentList } from "@/hooks/useEquipmentQueries"; //importa os hooks p buscar os dados
import Link from "next/link";

export default function EquipmentPage() {
  const { data, isLoading, isError } = useEquipmentList();

  if (isLoading) {
    return <p className="p-4">Loading equipment...</p>;
  }

  if (isError) {
    return <p className="p-4 text-red-500">Failed to load equipment.</p>;
  }

  return (
    <div className="p-6 space-y-4">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Equipment</h1>

        <Link
          href="/equipment/new"
          className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
        >
          + Add Equipment
        </Link>
      </div>

      {/* TABELA */}
      <EquipmentTable columns={equipmentColumns} data={data ?? []} />
    </div>
  );
}
