"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEquipmentById } from "@/hooks/useEquipmentQueries";
import { useUpdateEquipment } from "@/hooks/useEquipmentQueries";
import { EquipmentForm } from "@/components/equipment/EquipmentForm";

interface EditEquipmentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditEquipmentPage({ params }: EditEquipmentPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useEquipmentById(id);
  const updateMutation = useUpdateEquipment(id);

  if (isLoading) {
    return <p className="p-6">Loading equipment...</p>;
  }

  if (isError || !data) {
    return <p className="p-6 text-red-500">Equipment not found.</p>;
  }

  function handleSubmit(values: any) {
    updateMutation.mutate(values, {
      onSuccess: () => {
        router.push("/equipment");
      },
    });
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Edit Equipment</h1>

      <EquipmentForm
        defaultValues={data}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
