//hook p criar equipamento

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEquipment } from "@/data-access/equipment";
import { EquipmentFormValues } from "@/schemas/equipment";

export function useCreateEquipment() { //busca dados
  const queryClient = useQueryClient();

  return useMutation({ //alterar dados
    mutationFn: (data: EquipmentFormValues) => createEquipment(data), //qnd salva, chama a API

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
    },
  });
}
