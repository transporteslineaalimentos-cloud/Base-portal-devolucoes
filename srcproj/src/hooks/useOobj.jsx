import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../config/constants';
import { SB_URL, SB_KEY } from '../config/constants';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v) =>
  v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PAGE = 40;

export function useOobj(user) {
  const [nfes, setNfes]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [kpis, setKpis]           = useState({ count: 0, valor: 0, pendentes: 0, devolvidas: 0 });
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(0);
  const [filters, setFilters]     = useState({
    tipo: 'devolucao',
    status: '',
    cnpj: '',
    uf: '',
    search: '',
    dtInicio: '',
    dtFim: '',
  });
  const abortRef = useRef(null);

  // ── Load list ─────────────────────────────────────────────────────────────
  const loadNfes = useCallback(async (overridePage = null, overrideFilters = null) => {
    setLoading(true);
    setError('');
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const f   = overrideFilters ?? filters;
    const p   = overridePage   ?? page;
    const from = p * PAGE;
    const to   = from + PAGE - 1;

    try {
      let q = supabase
        .from('oobj_nfe_recebidas')
        .select('id,chave_nfe,nsu,cnpj_destinatario,cnpj_emitente,nome_emitente,municipio_emitente,uf_emitente,nf_numero,nf_serie,nat_operacao,dt_emissao,valor,valor_produtos,valor_st,cfops,tipo,status_portal,xml_baixado,xml_path,chave_nfe_referenciada,created_at', { count: 'exact' })
        .order('dt_emissao', { ascending: false })
        .range(from, to);

      if (f.tipo)      q = q.eq('tipo', f.tipo);
      if (f.status)    q = q.eq('status_portal', f.status);
      if (f.cnpj)      q = q.eq('cnpj_destinatario', f.cnpj);
      if (f.uf)        q = q.eq('uf_emitente', f.uf);
      if (f.dtInicio)  q = q.gte('dt_emissao', f.dtInicio);
      if (f.dtFim)     q = q.lte('dt_emissao', f.dtFim);
      if (f.search) {
        const s = f.search.trim();
        q = q.or(`nome_emitente.ilike.%${s}%,nf_numero::text.ilike.%${s}%,chave_nfe.ilike.%${s}%`);
      }

      const { data, error: err, count } = await q;
      if (err) throw new Error(err.message);
      setNfes(data || []);
      setTotal(count || 0);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // ── Load KPIs (summary) ───────────────────────────────────────────────────
  const loadKpis = useCallback(async () => {
    try {
      // total devoluções
      const { count: countDev } = await supabase
        .from('oobj_nfe_recebidas')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'devolucao');

      // pendentes
      const { count: countPend } = await supabase
        .from('oobj_nfe_recebidas')
        .select('*', { count: 'exact', head: true })
        .eq('tipo', 'devolucao')
        .eq('status_portal', 'pendente');

      // valor total (usando select agregado via rpc ou carregando aggregated)
      // Vamos pegar os dados agregados via uma query limitada
      const { data: valorData } = await supabase
        .from('oobj_nfe_recebidas')
        .select('valor')
        .eq('tipo', 'devolucao');

      const valorTotal = (valorData || []).reduce((s, r) => s + (r.valor || 0), 0);

      setKpis({
        count:      countDev  || 0,
        pendentes:  countPend || 0,
        valor:      valorTotal,
        devolvidas: (countDev || 0) - (countPend || 0),
      });
    } catch (e) {
      console.warn('[useOobj] loadKpis:', e.message);
    }
  }, []);

  // ── Load detail (itens + full row) ─────────────────────────────────────────
  const loadDetail = useCallback(async (id) => {
    const { data, error: err } = await supabase
      .from('oobj_nfe_recebidas')
      .select('*')
      .eq('id', id)
      .single();
    if (err) throw new Error(err.message);
    return data;
  }, []);

  // ── Update status_portal ──────────────────────────────────────────────────
  const updateStatus = useCallback(async (id, newStatus, obs = '') => {
    setSaving(true);
    try {
      const payload = {
        status_portal: newStatus,
        updated_at: new Date().toISOString(),
      };
      // Guarda obs em raw_json.obs_historico para não criar nova coluna
      if (obs) {
        const { data: current } = await supabase
          .from('oobj_nfe_recebidas')
          .select('raw_json')
          .eq('id', id)
          .single();
        const raw = current?.raw_json || {};
        const hist = raw.obs_historico || [];
        hist.push({ ts: new Date().toISOString(), status: newStatus, obs, user: user?.name || user?.email || '' });
        payload.raw_json = { ...raw, obs_historico: hist };
      }
      const { error: err } = await supabase
        .from('oobj_nfe_recebidas')
        .update(payload)
        .eq('id', id);
      if (err) throw new Error(err.message);
    } finally {
      setSaving(false);
    }
  }, [user]);

  // ── Signed URL para download do XML ──────────────────────────────────────
  const getXmlUrl = useCallback(async (xmlPath) => {
    if (!xmlPath) return null;
    const { data, error: err } = await supabase.storage
      .from('xmls-devolucoes')
      .createSignedUrl(xmlPath, 3600);
    if (err) throw new Error(err.message);
    return data?.signedUrl || null;
  }, []);

  // ── Re-load when filters/page change ─────────────────────────────────────
  useEffect(() => {
    loadNfes();
    loadKpis();
  }, [filters, page]); // eslint-disable-line

  const applyFilters = useCallback((patch) => {
    setPage(0);
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  return {
    nfes, total, kpis, loading, saving, error, page, setPage,
    filters, applyFilters,
    reload: loadNfes, loadDetail, updateStatus, getXmlUrl,
    fmtBRL,
    totalPages: Math.ceil(total / PAGE),
    PAGE,
  };
}
