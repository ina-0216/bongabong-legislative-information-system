import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';

/**
 * Typed React Query hooks that wrap the `utils/api` fetch layer.
 *
 * Gives the admin client automatic caching, request deduping, background
 * refetch and optimistic update support per query — satisfying ARCH-08 without
 * discarding the existing `api` abstraction.
 *
 * @module useApi
 */

const ONE_MINUTE = 60 * 1000;

const defaultQueryOptions = {
  staleTime: ONE_MINUTE,
  retry: 1,
  refetchOnWindowFocus: false,
};

/**
 * @template T
 * @param {string} queryKey
 * @param {() => Promise<T>} queryFn
 * @param {object} [options]
 */
export function useApiQuery(queryKey, queryFn, options = {}) {
  return useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn,
    ...defaultQueryOptions,
    ...options,
  });
}

/**
 * Wrap a mutation, auto-invalidating the given query keys on success.
 * @template TVars
 * @template TResult
 * @param {object} params
 * @param {(vars: TVars) => Promise<TResult>} params.mutationFn
 * @param {(string|string[])[]} [params.invalidate]
 * @param {object} [params.options]
 */
export function useApiMutation({ mutationFn, invalidate = [], options = {} }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    ...options,
    onSuccess: async (data, vars, ctx) => {
      if (options.onSuccess) await options.onSuccess(data, vars, ctx);
      const keys = invalidate.flat().map((k) => (Array.isArray(k) ? k : [k]));
      await Promise.all(keys.map((k) => queryClient.invalidateQueries({ queryKey: k })));
    },
  });
}

/* ---- Orchestration piggyback helpers (admin-only) ---- */

export const useStats = (options = {}) =>
  useApiQuery('stats', () => api.getStats(), options);

export const useOrdinances = (params, options = {}) =>
  useApiQuery(['ordinances', params], () => api.getOrdinances(params), options);

export const useOrdinance = (id, options = {}) =>
  useApiQuery(['ordinance', id], () => api.getOrdinance(id), {
    enabled: !!id,
    ...options,
  });

export const useSessions = (params, options = {}) =>
  useApiQuery(['sessions', params], () => api.getSessions(params), options);

export const useTerms = (options = {}) =>
  useApiQuery('terms', () => api.getTerms(), options);

export const useCommittees = (params, options = {}) =>
  useApiQuery(['committees', params], () => api.getCommittees(params), options);

export const useSBMembers = (params, options = {}) =>
  useApiQuery(['sbmembers', params], () => api.getSBMembers(params), options);

export const usePendingConsultations = (params, options = {}) =>
  useApiQuery(['consultations', 'pending', params], () => api.getPendingConsultations(params), options);
