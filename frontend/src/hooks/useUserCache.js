import { useState, useCallback } from 'react';
import api from '../services/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();
const inFlight = new Map();

export function useUserProfile(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!userId) return;

    const cached = cache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setUser(cached.data);
      return;
    }

    if (inFlight.has(userId)) {
      try {
        const data = await inFlight.get(userId);
        setUser(data);
      } catch {
        setError('Failed to load');
      }
      return;
    }

    setLoading(true);
    setError(null);

    const promise = api.get(`/users/${userId}`).then(({ data }) => {
      cache.set(userId, { data, timestamp: Date.now() });
      inFlight.delete(userId);
      return data;
    }).catch((err) => {
      inFlight.delete(userId);
      throw err;
    });

    inFlight.set(userId, promise);

    try {
      const data = await promise;
      setUser(data);
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { user, loading, error, fetch };
}
