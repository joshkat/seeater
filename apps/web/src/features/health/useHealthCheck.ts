import { useEffect, useState } from 'react';

import { fetchHealth } from './api';

type Status = 'loading' | 'ok' | 'error';

/**
 * Polls the API health endpoint once on mount. Used by the scaffold to prove
 * the web client and API are wired together end-to-end.
 */
export function useHealthCheck(): { status: Status } {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let active = true;

    fetchHealth()
      .then(() => {
        if (active) setStatus('ok');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  return { status };
}
