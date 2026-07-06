/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { format } from 'date-fns';
import { CompanyInfo, ClientInfo, ProformaItem } from '../types';

interface A4PreviewProps {
  companyInfo: CompanyInfo;
  docType: 'PROFORMA' | 'FACTURE';
  proformaDate: string;
  proformaNumber: string;
  client: ClientInfo;
  items: ProformaItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  mobileView: 'editor' | 'preview';
}

export default function A4Preview({
  companyInfo,
  docType,
  proformaDate,
  proformaNumber,
  client,
  items,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  mobileView
}: A4PreviewProps) {
  // Convertisseur de nombres en lettres en français pour le total
  const convertNumberToWords = (n: number): string => {
    const u = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF',
      'DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const t = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE',
      'SOIXANTE', 'QUATRE-VINGT', 'QUATRE-VINGT'];

    const b100 = (x: number): string => {
      if (x < 20) return u[x];
      const d = Math.floor(x / 10), r = x % 10;
      if (d === 7) return r === 1 ? 'SOIXANTE ET ONZE' : `SOIXANTE-${u[10 + r]}`;
      if (d === 9) return r === 0 ? 'QUATRE-VINGT-DIX' : `QUATRE-VINGT-${u[10 + r]}`;
      return r === 0 ? t[d] : r === 1 && d !== 8 ? `${t[d]} ET UN` : `${t[d]}-${u[r]}`;
    };

    const b1000 = (x: number): string => {
      if (x < 100) return b100(x);
      const h = Math.floor(x / 100), r = x % 100;
      return r === 0 ? (h === 1 ? 'CENT' : `${u[h]} CENT`) : (h === 1 ? `CENT ${b100(r)}` : `${u[h]} CENT ${b100(r)}`);
    };

    if (n === 0) return 'ZÉRO';
    let s = '';
    const M2 = Math.floor(n / 1_000_000), K = Math.floor((n % 1_000_000) / 1000), R = n % 1000;
    if (M2 > 0) s += M2 === 1 ? 'UN MILLION ' : `${b1000(M2)} MILLIONS `;
    if (K > 0) s += K === 1 ? 'MILLE ' : `${b1000(K)} MILLE `;
    if (R > 0) s += b1000(R);
    return s.trim();
  };

  return (
    <section className={`flex-1 bg-slate-100 flex items-start justify-center p-0 sm:p-4 md:p-8 overflow-x-hidden overflow-y-auto ${mobileView === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
      {/* Format Papier A4 avec ombrage minimaliste et net - Déclaration du Container */}
      <div className="w-full max-w-[600px] bg-white border border-border shadow-[0_10px_40px_rgba(0,0,0,0.06)] flex flex-col relative overflow-hidden @container" style={{ aspectRatio: '1 / 1.4142' }}>

        {/* ── EN-TÊTE DE FACTURATION ── */}
        <div className="relative z-10 pb-[2.7cqw] shrink-0" style={{ paddingLeft: '9.52%', paddingRight: '9.52%', paddingTop: '6.73%' }}>
          <div className="flex justify-between items-start">
            {/* Gauche: Logo et informations sur l'entreprise */}
            <div className="flex items-start gap-[2.7cqw]">
              {companyInfo.logo ? (
                <img
                  src={companyInfo.logo}
                  alt="Logo"
                  className="object-contain shrink-0"
                  style={{
                    width:  `${(companyInfo.logoWidth  || 18) * 0.53}cqw`,
                    height: `${(companyInfo.logoHeight || 18) * 0.53}cqw`,
                  }}
                />
              ) : (
                <div className="w-[7.3cqw] h-[7.3cqw] bg-primary rounded-[2cqw] flex items-center justify-center text-white font-black text-[3cqw] shrink-0">
                  {companyInfo.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="space-y-[0.3cqw]">
                <p className="font-black text-[2.3cqw] text-primary leading-tight">{companyInfo.name}</p>
                <p className="text-[1.7cqw] text-slate-400 font-semibold leading-relaxed">{companyInfo.address}</p>
                <p className="text-[1.7cqw] text-slate-500 font-bold leading-relaxed">{companyInfo.phone}</p>
                <p className="text-[1.7cqw] text-secondary font-semibold leading-relaxed">{companyInfo.email}</p>
                {companyInfo.siret && <p className="text-[1.3cqw] text-slate-400 font-medium leading-relaxed">SIRET: {companyInfo.siret}</p>}
              </div>
            </div>
            {/* Droite: Type de document et date */}
            <div className="text-right shrink-0 space-y-[0.7cqw]">
              <p className="font-black text-[2.3cqw] text-primary tracking-widest uppercase leading-tight">
                {docType === 'FACTURE' ? 'FACTURE' : 'PRO-FORMA'}
              </p>
              <p className="text-[1.7cqw] text-slate-400 font-bold uppercase tracking-wider">Date : {format(new Date(proformaDate), 'dd/MM/yyyy')}</p>
            </div>
          </div>
          {/* Séparateur ultra fin */}
          <div className="w-full h-[0.15cqw] bg-border mt-[2.7cqw]" />
        </div>

        {/* ── TITRE DU DOCUMENT ── */}
        <div className="relative z-10 py-[1cqw] text-center shrink-0" style={{ paddingLeft: '9.52%', paddingRight: '9.52%' }}>
          <p className="font-black text-[2.5cqw] text-primary tracking-tight">
            {docType === 'FACTURE' ? 'FACTURE N°' : 'PRO-FORMA N°'} {proformaNumber}
          </p>
        </div>

        {/* ── SECTION CLIENT (DESIGN PLAT ET ÉPURÉ) ── */}
        <div className="relative z-10 mb-[2.7cqw] bg-slate-50/50 border border-border px-[2.7cqw] py-[2cqw] shrink-0 rounded-[2.7cqw]" style={{ marginLeft: '9.52%', marginRight: '9.52%' }}>
          <p className="text-[1.5cqw] font-black text-slate-400 uppercase tracking-widest leading-none mb-[0.7cqw]">Client facturé</p>
          <p className="text-[2cqw] font-black text-primary uppercase">
            {(client.name || 'NOM DU CLIENT')}
          </p>
          {client.phone && (
            <p className="text-[1.5cqw] font-bold text-slate-400 uppercase tracking-wider mt-[0.3cqw]">
              Tél : {client.phone}
            </p>
          )}
        </div>

        {/* ── TABLEAU DES PRODUITS/SERVICES ── */}
        <div className="relative z-10 flex-1 overflow-hidden" style={{ paddingLeft: '9.52%', paddingRight: '9.52%' }}>
          <table className="w-full border-collapse text-[1.7cqw]">
            <thead>
              <tr className="bg-primary text-white">
                <th className="py-[1.7cqw] px-[2.3cqw] font-bold text-left uppercase tracking-wider text-[1.3cqw] border-r border-white/10 rounded-l-[2cqw]">Description</th>
                <th className="py-[1.7cqw] px-[1.3cqw] font-bold text-center w-[10.7cqw] uppercase tracking-wider text-[1.3cqw] border-r border-white/10">Quantité</th>
                <th className="py-[1.7cqw] px-[2.3cqw] font-bold text-right w-[16cqw] uppercase tracking-wider text-[1.3cqw] border-r border-white/10">Prix unitaire</th>
                <th className="py-[1.7cqw] px-[2.3cqw] font-bold text-right w-[16cqw] uppercase tracking-wider text-[1.3cqw] rounded-r-[2cqw]">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b-[0.15cqw] border-border">
                  <td className="py-[1.3cqw] px-[2.3cqw] text-primary font-medium border-r border-border">{item.description || 'Sans description'}</td>
                  <td className="py-[1.3cqw] px-[1.3cqw] text-center text-primary font-bold border-r border-border">{item.quantity}</td>
                  <td className="py-[1.3cqw] px-[2.3cqw] text-right text-slate-500 font-bold border-r border-border whitespace-nowrap">{item.unitPrice.toLocaleString()} F</td>
                  <td className="py-[1.3cqw] px-[2.3cqw] text-right font-black text-primary whitespace-nowrap">{(item.quantity * item.unitPrice).toLocaleString()} F</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b-[0.15cqw] border-border">
                  <td className="py-[1.3cqw] px-[2.3cqw] border-r border-border">&nbsp;</td>
                  <td className="py-[1.3cqw] px-[1.3cqw] border-r border-border">&nbsp;</td>
                  <td className="py-[1.3cqw] px-[2.3cqw] border-r border-border">&nbsp;</td>
                  <td className="py-[1.3cqw] px-[2.3cqw]">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── TOTALS ET REMISE ── */}
        <div className="relative z-10 mt-[2cqw] shrink-0" style={{ paddingLeft: '9.52%', paddingRight: '9.52%' }}>
          <div className="text-right text-[1.7cqw] text-slate-400 space-y-[0.7cqw] font-semibold uppercase tracking-wider">
            <p>Sous-total : {subtotal.toLocaleString()} F CFA</p>
            {discountPercent > 0 && (
              <p className="text-destructive">Remise ({discountPercent}%) : -{discountAmount.toLocaleString()} F CFA</p>
            )}
          </div>
          <div className="bg-accent text-white flex items-center justify-end px-[2.7cqw] py-[2cqw] rounded-[2.7cqw] mt-[1.7cqw] shadow-sm">
            <span className="font-black text-[2cqw] uppercase tracking-widest">
              Total Net : {total.toLocaleString()} F CFA
            </span>
          </div>
        </div>

        {/* ── SOMME EN LETTRES ── */}
        <div className="relative z-10 mt-[2cqw] shrink-0" style={{ paddingLeft: '9.52%', paddingRight: '9.52%' }}>
          <p className="text-[1.5cqw] italic text-slate-500 font-semibold leading-relaxed">
            Arrêtée la présente facture à la somme de : <span className="font-black text-primary uppercase">{convertNumberToWords(Math.round(total))} FRANCS CFA</span>
          </p>
        </div>

        {/* ── ZONE DE SIGNATURE ET CACHET ── */}
        <div className="relative z-10 mt-[2cqw] flex justify-end items-end shrink-0" style={{ paddingLeft: '9.52%', paddingRight: '9.52%' }}>
          <div className="text-right flex flex-col items-end">
            {(companyInfo.stamp || companyInfo.signature) && (
              <div className="flex items-end justify-end gap-[2.7cqw] bg-slate-50/20 p-[1.3cqw] rounded-[2.7cqw] border-[0.15cqw] border-border/30">
                {companyInfo.stamp && (
                  <img src={companyInfo.stamp} alt="Cachet"
                    className="object-contain mix-blend-multiply opacity-80"
                    style={{ height: `${(companyInfo.stampHeight || 25) * 0.5}cqw` }} />
                )}
                {companyInfo.signature && (
                  <img src={companyInfo.signature} alt="Signature"
                    className="object-contain mix-blend-multiply"
                    style={{ height: `${(companyInfo.signatureHeight || 25) * 0.5}cqw` }} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER DE LA MAQUETTE ── */}
        <div className="relative z-10 mt-[2cqw] flex justify-center items-end shrink-0" style={{ paddingLeft: '9.52%', paddingRight: '9.52%', paddingBottom: '6.73%' }}>
          <div className="text-center">
            {companyInfo.services && (
              <p className="text-[1.5cqw] font-black text-primary leading-snug">
                SERVICES : {companyInfo.services.split('\n').filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Bande de pied de page fine et élégante */}
        <div className="relative z-10 w-full h-[1.3cqw] bg-primary shrink-0" />
      </div>
    </section>
  );
}
