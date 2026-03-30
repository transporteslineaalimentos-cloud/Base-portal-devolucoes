import { useCallback, useEffect, useState } from 'react';
import { dbLoadNoteMeta, dbSaveNoteMeta } from '../config/supabase';

export function useNoteMeta() {
  const [metaMap, setMetaMap] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    dbLoadNoteMeta().then(data => {
      if (active) {
        setMetaMap(data || {});
        setLoaded(true);
      }
    });
    return () => { active = false; };
  }, []);

  const saveMeta = useCallback(async (nfKey, meta) => {
    const saved = await dbSaveNoteMeta(nfKey, meta);
    setMetaMap(prev => ({ ...prev, [nfKey]: { ...(prev[nfKey] || {}), ...saved } }));
  }, []);

  return { noteMeta: metaMap, saveMeta, noteMetaLoaded: loaded };
}
