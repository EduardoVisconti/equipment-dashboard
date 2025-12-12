import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchEquipmentList, fetchEquipmentById, createEquipment, updateEquipmentApi, deleteEquipmentApi } from '@/data-access/equipment';
import { Equipment } from '@/types/equipment';
import { EquipmentFormValues } from '@/schemas/equipment';

export function useEquipmentList() { //hook que vai renderizar a tabela
  return useQuery<Equipment[]>({ queryKey: ['equipment'], queryFn: fetchEquipmentList }); //equipment é a key que identifica query e fetch usa Axios e retorna o equipment
}

export function useEquipmentDetail(id: string) { // buscar por id > /equipment/:id , /equipment/:id/edit
  return useQuery<Equipment>({ queryKey: ['equipment', id], //key única pra cada equipamento
    queryFn: () => fetchEquipmentById(id), //func q chama a API com o id
    enabled: !!id }); //só roda se o id existir (!! converte p boolean)
}

export function useCreateEquipment() {
  const queryClient = useQueryClient(); //pra gerenciar cache e invalidar queries

  return useMutation({ //mutations p criar, att, deletar dados
    mutationFn: (data: EquipmentFormValues) =>  //recebe os dados do form
      createEquipment(data), //faz o POST na API
    onSuccess: () => { queryClient.invalidateQueries //se der certo, invalida a query de equipment p refazer o fetch e atualizar a lista
      ({ queryKey: ['equipment'] }); //refaz a query de equipment
    },
  });
}

export function useUpdateEquipment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<EquipmentFormValues>) => updateEquipmentApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', id] });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEquipmentApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });
}
