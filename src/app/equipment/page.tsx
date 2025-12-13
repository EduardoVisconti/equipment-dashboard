"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { EquipmentTable } from "@/components/equipment/EquipmentTable"; //importa a tabela
import { equipmentColumns } from "@/components/equipment/columns";
import { useEquipmentList } from "@/hooks/useEquipmentQueries"; //importa os hooks p buscar os dados
import { parseDateOnly } from "@/lib/date";
import { differenceInDays } from "date-fns";
import Link from "next/link";

type FilterFormValues = {
  status: string;
  fromDate?: string;
  toDate?: string;
};

export default function EquipmentPage() {
  const { data, isLoading, isError } = useEquipmentList();

  const { register, watch } = useForm<FilterFormValues>({
    defaultValues: {
      status: "",
    },
  });

  const status = watch("status");
  const fromDate = watch("fromDate");
  const toDate = watch("toDate");

  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      // STATUS FILTER
      if (status && item.status !== status) {
        return false;
      }

      // DATE RANGE FILTER (purchaseDate)
      const purchaseDate = parseDateOnly(item.purchaseDate);
      if (!purchaseDate) return true;

      if (fromDate) {
        const from = parseDateOnly(fromDate);
        if (from && purchaseDate < from) return false;
      }

      if (toDate) {
        const to = parseDateOnly(toDate);
        if (to && purchaseDate > to) return false;
      }

      return true;
    });
  }, [data, status, fromDate, toDate]);

  if (isLoading) {
    return <p className="p-4">Loading equipment...</p>;
  }

  if (isError) {
    return <p className="p-4 text-red-500">Failed to load equipment.</p>;
  }

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Equipment</h1>

        <Link
          href="/equipment/new"
          className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
        >
          + Add Equipment
        </Link>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            {...register("status")}
            className="border rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">From</label>
          <input
            type="date"
            {...register("fromDate")}
            className="border rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">To</label>
          <input
            type="date"
            {...register("toDate")}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>

      {/* TABLE */}
      <EquipmentTable
        columns={equipmentColumns}
        data={filteredData}
      />
    </div>
  );
}
