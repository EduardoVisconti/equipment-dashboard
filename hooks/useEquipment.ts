import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Equipment } from '@/types/equipment';

export function useEquipmentList() {
	return useQuery({
		queryKey: ['equipment'],
		queryFn: async () => {
			const { data } = await api.get<Equipment[]>('/equipment');
			return data;
		}
	});
}

export function useEquipmentById(id?: string, options?: any) {
	return useQuery({
		queryKey: ['equipment', id],
		queryFn: async () => {
			const { data } = await api.get<Equipment>(`/equipment/${id}`);
			return data;
		},
		enabled: !!id,
		...options
	});
}

export function useCreateEquipment() {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (payload: Omit<Equipment, 'id'>) =>
			api.post('/equipment', payload),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['equipment'] });
		}
	});
}

export function useUpdateEquipment(id: string) {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (payload: Partial<Equipment>) =>
			api.put(`/equipment/${id}`, payload),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['equipment'] });
		}
	});
}
