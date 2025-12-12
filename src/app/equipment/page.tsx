"use client";

import { EquipmentTable } from "@/components/equipment/EquipmentTable"; //importa a tabela
import { equipmentColumns } from "@/components/equipment/columns";
import { useEquipmentList } from "@/hooks/useEquipmentQueries"; //importa os hooks p buscar os dados

export default function EquipmentPage() {
  const { data, isLoading, isError } = useEquipmentList();

  if (isLoading) {
    return <p className="p-4">Loading equipment...</p>;
  }

  if (isError) {
    return <p className="p-4 text-red-500">Failed to load equipment.</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Equipment</h1>

      <EquipmentTable
        columns={equipmentColumns}
        data={data ?? []}
      />
    </div>
  );
}
