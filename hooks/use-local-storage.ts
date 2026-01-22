'use client';

import { useEffect, useState } from 'react';

/**
 * Hook para localStorage:
 * - Inicializa o state lendo do localStorage (síncrono) -> evita sobrescrever no mount
 * - Persiste sempre que o state mudar
 * - Se a key mudar, tenta re-hidratar a partir da nova key
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
	// 1) Lê do localStorage no INIT do state (síncrono)
	const [value, setValue] = useState<T>(() => {
		try {
			if (typeof window === 'undefined') return initialValue;

			const raw = window.localStorage.getItem(key);
			if (raw == null) return initialValue;

			return JSON.parse(raw) as T;
		} catch {
			return initialValue;
		}
	});

	// 2) Se a key mudar em runtime, re-hidrata o state
	useEffect(() => {
		try {
			const raw = window.localStorage.getItem(key);
			if (raw == null) {
				setValue(initialValue);
				return;
			}
			setValue(JSON.parse(raw) as T);
		} catch {
			setValue(initialValue);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	// 3) Persiste sempre que value mudar
	useEffect(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// não quebra o app se storage estiver bloqueado/cheio
		}
	}, [key, value]);

	return [value, setValue] as const;
}
