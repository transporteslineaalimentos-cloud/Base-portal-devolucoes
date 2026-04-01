import * as XLSX from 'xlsx';
import { norm, fmtD } from './helpers';

function str(v) { return v == null ? '' : String(v).trim(); }

function gv(row, ...keys) {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.trim().toLowerCase() === k.toLowerCase()) return row[rk];
    }
  }
  return '';
}

function trimKeys(rows) {
  return rows.map(r => {
    const o = {};
    Object.entries(r).forEach(([k, v]) => { o[k.trim()] = v; });
    return o;
  });
}

export function processExcel(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheets = {};
  wb.SheetNames.forEach(n => {
    sheets[n] = trimKeys(XLSX.utils.sheet_to_json(wb.Sheets[n]));
  });

  const parcial = sheets['Dev Parcial'] || [];
  const total = sheets['Dev Total'] || [];
  const interna = sheets['Dev Interna Produtos'] || sheets['devolucao-dev'] || [];
  const nfs = sheets['Base NFs Transportador'] || [];

  return processFiles(parcial, total, interna, nfs);
}

function processFiles(parcial, total, interna, nfBase) {
  const prodMap = {};
  interna.forEach(r => {
    const nf = norm(gv(r, 'NF'));
    const nfOrig = norm(gv(r, 'NF ORIGEM'));
    const key = nf + '|' + nfOrig;
    if (!prodMap[key]) prodMap[key] = [];
    prodMap[key].push({
      cod: str(gv(r, 'PRODUTO')),
      desc: str(gv(r, 'DESCRIÇÃO', 'DESCRICAO')),
      qt: parseFloat(gv(r, 'QTD', 'QUANTIDADE')) || 0,
      vi: parseFloat(gv(r, 'VALOR', 'VALOR ITEM NF')) || 0,
      vu: parseFloat(gv(r, 'VALOR UNITARIO', 'VALOR UNITÁRIO', 'VALOR UNIT', 'VL UNITARIO', 'VL UNIT')) || 0
    });
  });

  const trMap = {};
  const dtEntMap = {};
  nfBase.forEach(r => {
    const n = norm(gv(r, 'Nota Fiscal'));
    const t = str(gv(r, 'Transportador'));
    if (n && t) trMap[n] = t.replace(/^\d+\s*-\s*/, '').trim();
    const de = gv(r, 'Data de Entrega Nota Fiscal');
    if (n && de) dtEntMap[n] = fmtD(de);
  });

  const all = [];

  parcial.forEach(r => {
    const nfd = norm(gv(r, 'NFD'));
    const nfo = norm(gv(r, 'NFO'));
    if (!nfd && !nfo) return;
    const val = parseFloat(gv(r, 'VALOR TOTAL NFD')) || parseFloat(gv(r, 'VALOR NFD')) || 0;
    const key = nfd + '|' + nfo;
    const p = prodMap[key] || [];
    all.push({
      t: 'P', nfd, nfo, v: val,
      cl: str(gv(r, 'NOME CLIENTE')),
      uf: str(gv(r, 'UF CLIENTE')),
      mo: str(gv(r, 'MOTIVO DEVOLUÇÃO', 'MOTIVO DEVOLUÇAO', 'MOTIVO DEVOLUCAO')),
      ar: str(gv(r, 'ÁREA RESPONSÁVEL', 'AREA RESPONSAVEL')),
      tr: trMap[nfo] || '',
      p,
      dt: fmtD(gv(r, 'EMISSÃO NFD')),
      dtEnt: dtEntMap[nfo] || ''
    });
  });

  total.forEach(r => {
    const nfo = norm(gv(r, 'NFO'));
    if (!nfo) return;
    const val = parseFloat(gv(r, 'VALOR')) || 0;
    const p = [];
    Object.keys(prodMap).forEach(k => {
      if (k.split('|')[1] === nfo) p.push(...prodMap[k]);
    });
    all.push({
      t: 'T', nfd: '', nfo, v: val,
      cl: str(gv(r, 'RAZÃO SOCIAL', 'RAZAO SOCIAL')),
      uf: str(gv(r, 'UF')),
      mo: str(gv(r, 'MOTIVO DA DEVOLUÇÃO', 'MOTIVO DA DEVOLUÇAO', 'MOTIVO DA DEVOLUCAO')),
      ar: str(gv(r, 'AREA RESPONSAVEL', 'ÁREA RESPONSÁVEL')),
      tr: str(gv(r, 'TRANSPORTADORA')) || trMap[nfo] || '',
      p,
      dt: fmtD(gv(r, 'Data Devolução', 'Data Devoluçao')),
      dtEnt: dtEntMap[nfo] || ''
    });
  });

  const cobr = all.filter(n => n.p.length > 0);
  const pend = all.filter(n => n.p.length === 0);

  return { cobr, pend };
}

export function exportToExcel(rows, sheetName = 'dados') {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
  XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportWorkbook(sheets) {
  const wb = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows]) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
  });
  XLSX.writeFile(wb, `portal_devolucoes_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
