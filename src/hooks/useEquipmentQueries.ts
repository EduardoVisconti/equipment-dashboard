import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEquipmentList, fetchEquipmentById, createEquipment, updateEquipmentApi, deleteEquipmentApi } from '@/data-access/equipment';
import { Equipment } from '@/types/equipment';
import { EquipmentFormValues } from '@/schemas/equipment';

export function useEquipmentList() {
  return useQuery<Equipment[]>({ queryKey: ['equipment'], queryFn: fetchEquipmentList }); //busca a lista de equipamentos da API e armazena no cache com a key 'equipment'
}

export function useEquipmentDetail(id: string) { // buscar por id > /equipment/:id , /equipment/:id/edit
  return useQuery<Equipment>({ queryKey: ['equipment', id], //key única pra cada equipamento
    queryFn: () => fetchEquipmentById(id), //func q busca o dado do equipamento pelo id
    enabled: !!id }); //só roda se o id existir (!! converte p boolean)
}

export function useCreateEquipment() {
  const queryClient = useQueryClient(); //pra gerenciar cache e invalidar queries

  return useMutation({ //mutations p criar, att, deletar dados
    mutationFn: (data: EquipmentFormValues) =>  //recebe os dados do form
      createEquipment(data), //faz o POST na API
    onSuccess: () => { queryClient.invalidateQueries ({ queryKey: ['equipment'] }); //se der certo, invalida a query de equipment (joga fora) p refazer o fetch e att a lista buscando o novo equipamento na API!!
    },
  });
}

export function useUpdateEquipment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<EquipmentFormValues>) => //Partial pq n precisa enviar todos os campos, só os q foram alterados
      updateEquipmentApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', id] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient(); //validando queries pra atualizar a lista depois de deletar

  return useMutation({ //mutations p criar, att, deletar dados
    mutationFn: (id: string) => deleteEquipmentApi(id), //faz o DELETE na API
    onSuccess: () => { //se der certo, invalida a query de equipment (joga fora) p refazer o fetch e att a lista buscando o novo equipamento na API!!
      queryClient.invalidateQueries({ queryKey: ['equipment'] }); //atualiza a lista de equipamentos
    },
  });
}
