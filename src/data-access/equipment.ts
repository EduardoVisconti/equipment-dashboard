import { api } from '@/lib/api'; //usando a instância configurada do axios
import { Equipment } from '@/types/equipment';

export async function fetchEquipmentList() {
  const response = await api.get<Equipment[]>('/equipment');
  return response.data;
}

export async function fetchEquipmentById(id: string) {
  const response = await api.get<Equipment>(`/equipment/${id}`);
  return response.data;
}

export async function createEquipment(data: Omit<Equipment, 'id'>) { //criando equip usando esses dados menos o ID, o sv gera
  const response = await api.post<Equipment>('/equipment', data);
  return response.data;
}

export async function updateEquipmentApi(id: string, data: Partial<Omit<Equipment, 'id'>>) {
  const response = await api.put<Equipment>(`/equipment/${id}`, data); //att o equip. c/ esse id usando os novos dados
  return response.data;
}

export async function deleteEquipmentApi(id: string) {
  const response = await api.delete<Equipment>(`/equipment/${id}`);
  return response.data;
}
