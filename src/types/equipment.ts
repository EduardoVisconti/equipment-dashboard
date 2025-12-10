export type EquipmentStatus = 'active' | 'inactive' | 'maintenance'; //propriedade status só vai poder ter esses 3 valores, limitando os valores aceitos

export interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  status: EquipmentStatus;
  purchaseDate: string;
  lastServiceDate: string;
}
