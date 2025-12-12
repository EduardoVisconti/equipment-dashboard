"use client";

import { useCreateEquipment } from "@/hooks/useEquipmentMutations";
import { equipmentSchema, EquipmentFormValues } from "@/schemas/equipment";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

export default function NewEquipmentPage() {
  const router = useRouter();
  const { mutate, isPending } = useCreateEquipment();

  const form = useForm<EquipmentFormValues>({ //controle do form, validação, quais campos existem > receber os dados do form
    resolver: zodResolver(equipmentSchema), //validação do form com zod -- se falhar, não deixa enviar, evita de ir para a API
    defaultValues: {
      name: "",
      serialNumber: "",
      status: "active",
      purchaseDate: "",
      lastServiceDate: "",
    },
  });

  function onSubmit(data: EquipmentFormValues) {
    mutate(data, { //refaz a busca dos dados (get), att o cache
      onSuccess: () => {
        router.push("/equipment"); //qnd cria, volta p a lista
      }
    });
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Add Equipment</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <input
          placeholder="Name"
          {...form.register("name")}
          className="border p-2 w-full"
        />

        <input
          placeholder="Serial Number"
          {...form.register("serialNumber")}
          className="border p-2 w-full"
        />

        <select
          {...form.register("status")}
          className="border p-2 w-full"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <input
          type="date"
          {...form.register("purchaseDate")}
          className="border p-2 w-full"
        />

        <input
          type="date"
          {...form.register("lastServiceDate")}
          className="border p-2 w-full"
        />

        <button
          type="submit"
          disabled={isPending}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
