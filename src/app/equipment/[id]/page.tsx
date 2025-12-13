"use client";

import { use } from "react";
import { useEquipmentById } from "@/hooks/useEquipmentQueries";
import { differenceInDays, format } from "date-fns";
import { parseDateOnly } from "@/lib/date";

interface EquipmentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EquipmentViewPage({ params }: EquipmentPageProps) {
  const { id } = use(params);

  const { data, isLoading, isError } = useEquipmentById(id);

  if (isLoading) {
    return <p className="p-6">Loading equipment...</p>;
  }

  if (isError || !data) {
    return <p className="p-6 text-red-500">Equipment not found.</p>;
  }

  const daysSinceService = data.lastServiceDate ? differenceInDays( new Date(), parseDateOnly(data.lastServiceDate)! )
    : null;

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Equipment Details</h1>

      <div>
        <strong>Name:</strong> {data.name}
      </div>

      <div>
        <strong>Serial Number:</strong> {data.serialNumber}
      </div>

      <div>
        <strong>Status:</strong> {data.status}
      </div>

      <div>
        <strong>Purchase Date:</strong>{" "}
        {format(parseDateOnly(data.purchaseDate)!, "MM/dd/yyyy")}
      </div>

      <div>
        <strong>Last Service Date:</strong>{" "}
        {format(new Date(data.lastServiceDate + "T00:00:00"), "MM/dd/yyyy")}
      </div>

      <div>
        <strong>Last serviced:</strong> {daysSinceService} days ago
      </div>
    </div>
  );
}
