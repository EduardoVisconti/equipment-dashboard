"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { equipmentSchema, EquipmentFormValues } from "@/schemas/equipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EquipmentFormProps {
  defaultValues?: Partial<EquipmentFormValues>;
  onSubmit: (values: EquipmentFormValues) => void;
  isSubmitting?: boolean;
}

export function EquipmentForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: EquipmentFormProps) {
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues,
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <Input
        placeholder="Name"
        {...form.register("name")}
      />

      <Input
        placeholder="Serial Number"
        {...form.register("serialNumber")}
      />

      <Select
        defaultValue={defaultValues?.status}
        onValueChange={(value) => form.setValue("status", value as any)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        {...form.register("purchaseDate")}
      />

      <Input
        type="date"
        {...form.register("lastServiceDate")}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
