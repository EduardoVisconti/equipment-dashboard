import { v4 as uuid } from 'uuid'; //v4 gera ids únicos (uuid()), as uui: renomeia a função para uuid
import { Equipment } from '@/types/equipment'; //pro banco de dados respeitar a tipagem/estrutura

//Banco de dados em memória
const equipmentDB: Equipment[] = [ //array de equipamentos em memória tipado como Equipment[] pra q as operações respeitem a estrutura
  {
    id: uuid(),
    name: 'Generator X1',
    serialNumber: 'SN-123',
    status: 'active',
    purchaseDate: new Date('2022-01-10').toISOString(),
    lastServiceDate: new Date('2024-01-10').toISOString(),
  },
];

export function getAllEquipment(): Equipment[] { //retornando o array completo!!
  return equipmentDB;
}

export function getEquipmentById(id: string): Equipment | undefined {
  return equipmentDB.find((eq) => eq.id === id); //array em memória melhor usar find
}

export function createEquipment(data: Omit<Equipment, 'id'>): Equipment { //recebe TODOS os dados do equipamento sem o id -- omit pega o Equipment e omite o id, pq o client não precisa enviar id ao criar, ele será gerado pelo servidor no uuid() V
  const newItem: Equipment = {
    id: uuid(), 
    ...data, //espalha os dados recebidos, nome, serialNumber, status, purchaseDate, lastServiceDate
  };

  equipmentDB.push(newItem); //create: adiciona o novo equipamento ao array em memória
  return newItem;
}

export function updateEquipment(id: string, data: Partial<Omit<Equipment, 'id'>>): Equipment | undefined { //parâmetros; id string: o equipamento q vai ser atualizado. Partial; todos os campos são opcionais. Omit: omite o id pq ele não pode ser atualizado --- Imita um PUT/PATCH mais flexível, nao precisa enviar todos os campos
  const index = equipmentDB.findIndex((eq) => eq.id === id); //procura o index do equipamento com o id correspondente
  if (index === -1) return undefined;

  equipmentDB[index] = {
    ...equipmentDB[index], //valores atuais do equipamento
    ...data, //novos valores recebidos para atualizar
  };

  return equipmentDB[index];
}

export function deleteEquipment(id: string): Equipment | undefined {
  const index = equipmentDB.findIndex((eq) => eq.id === id);
  if (index === -1) return undefined;

  const [removed] = equipmentDB.splice(index, 1); //procura o index e remove 1 item a partir desse index
  return removed;
}
