import { useCallback, useEffect, useRef, useState } from 'react';
import * as searchApi from '../api/search.api';
import * as productApi from '../api/product.api';
import { errorMessage } from '../api/axios';

const EMPTY = { products: [], meta: {}, mode: null, analysis: null };

/**
 * Loads one page of products for the search page.
 * With a query → unified AI search (`/search/query`); without → the plain catalog listing (`/products`).
 * `params` must be a stable plain object: it is serialised to decide when to refetch.
 */
export default function useSearch(params) {
  const [state, setState] = useState({ loading: true, error: '', data: EMPTY });
  const reqId = useRef(0);
  const activeRequest = useRef(null);
  const key = JSON.stringify(params);

  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const id = ++reqId.current;
    const p = JSON.parse(key);
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      let data;
      if (p.q) {
        const d = await searchApi.search(p, { signal: controller.signal });
        data = { products: d.results || [], meta: d.meta || {}, mode: d.mode || null, analysis: d.analysis || null };
      } else {
        const { q, ...rest } = p; // eslint-disable-line no-unused-vars
        if (!rest.sort || rest.sort === 'relevance') rest.sort = 'newest';
        const d = await productApi.listProducts(rest, { signal: controller.signal });
        data = { products: d.products || [], meta: d.meta || {}, mode: null, analysis: null };
      }
      if (id === reqId.current) setState({ loading: false, error: '', data });
    } catch (e) {
      if (id === reqId.current && e?.code !== 'ERR_CANCELED') {
        setState({ loading: false, error: errorMessage(e, 'Search failed. Please try again.'), data: EMPTY });
      }
    }
    if (id === reqId.current) activeRequest.current = null;
  }, [key]);

  useEffect(() => {
    load();
    return () => {
      reqId.current += 1;
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [load]);
  return { ...state, reload: load };
}
