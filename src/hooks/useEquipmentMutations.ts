import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEquipment } from "@/data-access/equipment";
import { EquipmentFormValues } from "@/schemas/equipment";

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EquipmentFormValues) => createEquipment(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
