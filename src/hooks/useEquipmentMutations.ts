//hook p criar equipamento

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEquipment } from "@/data-access/equipment";
import { EquipmentFormValues } from "@/schemas/equipment";

export function useCreateEquipment() { //hook p criar equipamento
  const queryClient = useQueryClient(); //gerenciador de cache

  return useMutation({ //alterar dados
    mutationFn: (data: EquipmentFormValues) => createEquipment(data), //qnd clicar em salvar, chama a API

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] }); //qnd der certo, lista de equipamentos não ta mais válida
    },
  });
}

/* TanStack refaz o GET > a tabela se atualiza automaticamente */
