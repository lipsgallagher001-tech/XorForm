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
    if (n === 0) return 'ZERO';
    let s = '';
    const M2 = Math.floor(n / 1_000_000), K = Math.floor((n % 1_000_000) / 1000), R = n % 1000;
    if (M2 > 0) s += M2 === 1 ? 'UN MILLION ' : `${b1000(M2)} MILLIONS `;
    if (K > 0) s += K === 1 ? 'MILLE ' : `${b1000(K)} MILLE `;
    if (R > 0) s += b1000(R);
    return s.trim();
  };

  const acompte = Math.round(total * 0.75);

  return (
    <section className={`flex-1 bg-slate-100 flex items-start justify-center p-0 sm:p-4 md:p-8 overflow-x-hidden overflow-y-auto ${mobileView === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
      <div className="w-full max-w-[600px] bg-white border border-border shadow-[0_10px_40px_rgba(0,0,0,0.06)] flex flex-col relative overflow-hidden @container" style={{ aspectRatio: '1 / 1.4142' }}>

        {/* Barre accent verticale gauche */}
        <div className="absolute left-0 top-0 h-full w-[1.5cqw] bg-primary z-20" />

        {/* EN-TETE */}
        <div className="relative z-10 pb-[2.7cqw] shrink-0" style={{ paddingLeft: '10.5%', paddingRight: '9.52%', paddingTop: '5%' }}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-[2.7cqw]">
              {companyInfo.logo ? (
                <img src={companyInfo.logo} alt="Logo" className="object-contain shrink-0"
                  style={{ width: `${(companyInfo.logoWidth || 18) * 0.53}cqw`, height: `${(companyInfo.logoHeight || 18) * 0.53}cqw` }} />
              ) : (
                <div className="w-[7.3cqw] h-[7.3cqw] bg-primary rounded-[2cqw] flex items-center justify-center text-white font-black text-[3cqw] shrink-0">
                  {companyInfo.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="space-y-[0.3cqw]">
                <p className="font-black text-[2.3cqw] text-primary leading-tight">{companyInfo.name}</p>
                <p className="text-[1.6cqw] text-slate-400 font-medium leading-relaxed">{companyInfo.address}</p>
                <p className="text-[1.6cqw] text-slate-500 font-semibold leading-relaxed">{companyInfo.phone}</p>
                <p className="text-[1.6cqw] text-accent font-semibold leading-relaxed">{companyInfo.email}</p>
              </div>
            </div>
            <div className="text-right shrink-0 space-y-[0.4cqw]">
              <p className="text-[1.2cqw] font-bold text-slate-300 uppercase tracking-[0.3em] leading-none">
                {docType === 'FACTURE' ? 'FACTURE' : 'PRO-FORMA'}
              </p>
              <p className="font-black text-[3cqw] text-primary leading-none tracking-tight">
                {docType === 'FACTURE' ? 'Facture' : 'Pro-Forma'}
              </p>
              {companyInfo.siret && <p className="text-[1.3cqw] text-slate-400 font-medium">SIRET : {companyInfo.siret}</p>}
              {companyInfo.siren && <p className="text-[1.3cqw] text-slate-400 font-medium">SIREN : {companyInfo.siren}</p>}
              {companyInfo.rcs   && <p className="text-[1.3cqw] text-slate-400 font-medium">RCS : {companyInfo.rcs}</p>}
            </div>
          </div>
          <div className="w-full h-[0.15cqw] bg-border mt-[2.7cqw]" />
        </div>

        {/* SECTION CLIENT - teinte navy + badge numero */}
        <div className="relative z-10 mb-[2.5cqw] shrink-0 border-l-[0.5cqw] border-primary bg-primary/[0.03] px-[2.7cqw] py-[2cqw]"
          style={{ marginLeft: '10.5%', marginRight: '9.52%' }}>
          <div className="flex items-center justify-between">
            <p className="text-[1.3cqw] font-black text-slate-400 uppercase tracking-widest leading-none">Facture a</p>
            <span className="bg-primary text-white text-[1.2cqw] font-black px-[1.5cqw] py-[0.5cqw] rounded-full tracking-wider leading-none">
              N&deg; {proformaNumber}
            </span>
          </div>
          <p className="text-[2.2cqw] font-black text-primary uppercase leading-tight mt-[0.7cqw]">
            {client.name || 'NOM DU CLIENT'}
          </p>
          <div className="flex items-center justify-between mt-[0.5cqw]">
            <div className="flex items-center gap-[2cqw]">
              {client.phone && (
                <p className="text-[1.4cqw] font-semibold text-slate-400 uppercase tracking-wider">
                  Tel : {client.phone}
                </p>
              )}
              <span className="text-[1.2cqw] font-black text-slate-300 uppercase tracking-[0.2em]">
                {docType === 'FACTURE' ? '· FACTURE' : '· PRO-FORMA'}
              </span>
            </div>
            <p className="text-[1.4cqw] font-semibold text-slate-400 uppercase tracking-wider">
              {format(new Date(proformaDate), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>

        {/* TABLEAU DES PRODUITS/SERVICES */}
        <div className="relative z-10 flex-1 overflow-hidden" style={{ paddingLeft: '10.5%', paddingRight: '9.52%' }}>
          <table className="w-full border-collapse text-[1.7cqw]">
            <thead>
              <tr className="bg-primary text-white">
                <th className="py-[1.7cqw] px-[2.3cqw] font-bold text-left uppercase tracking-wider text-[1.2cqw] border-r border-white/10 rounded-l-[1.5cqw]">Description</th>
                <th className="py-[1.7cqw] px-[1.3cqw] font-bold text-center w-[10.7cqw] uppercase tracking-wider text-[1.2cqw] border-r border-white/10">Qte</th>
                <th className="py-[1.7cqw] px-[2.3cqw] font-bold text-right w-[16cqw] uppercase tracking-wider text-[1.2cqw] border-r border-white/10">Prix unit.</th>
                <th className="py-[1.7cqw] px-[2.3cqw] font-bold text-right w-[16cqw] uppercase tracking-wider text-[1.2cqw] rounded-r-[1.5cqw]">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={`border-b-[0.15cqw] border-border ${i % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}>
                  <td className="py-[1.3cqw] px-[2.3cqw] text-primary font-medium border-r border-border">{item.description || 'Sans description'}</td>
                  <td className="py-[1.3cqw] px-[1.3cqw] text-center text-primary font-bold border-r border-border">{item.quantity}</td>
                  <td className="py-[1.3cqw] px-[2.3cqw] text-right text-slate-500 font-semibold border-r border-border whitespace-nowrap">{item.unitPrice.toLocaleString()} F</td>
                  <td className="py-[1.3cqw] px-[2.3cqw] text-right font-black text-primary whitespace-nowrap">{(item.quantity * item.unitPrice).toLocaleString()} F</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className={`border-b-[0.15cqw] border-border ${(items.length + i) % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}>
                  <td className="py-[1.3cqw] px-[2.3cqw] border-r border-border">&nbsp;</td>
                  <td className="py-[1.3cqw] px-[1.3cqw] border-r border-border">&nbsp;</td>
                  <td className="py-[1.3cqw] px-[2.3cqw] border-r border-border">&nbsp;</td>
                  <td className="py-[1.3cqw] px-[2.3cqw]">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS ET REMISE */}
        <div className="relative z-10 mt-[2cqw] shrink-0" style={{ paddingLeft: '10.5%', paddingRight: '9.52%' }}>
          <div className="text-right text-[1.6cqw] text-slate-400 space-y-[0.5cqw] font-semibold uppercase tracking-wider">
            <p>Sous-total : {subtotal.toLocaleString()} F CFA</p>
            {discountPercent > 0 && (
              <p className="text-destructive">Remise ({discountPercent}%) : -{discountAmount.toLocaleString()} F CFA</p>
            )}
          </div>
          {/* Total Net en navy */}
          <div className="bg-primary text-white flex items-center justify-between px-[2.7cqw] py-[1.8cqw] rounded-[2cqw] mt-[1.5cqw] shadow-sm">
            <span className="text-[1.4cqw] font-semibold uppercase tracking-wider opacity-70">Total Net</span>
            <span className="font-black text-[2.2cqw] uppercase tracking-wider">{total.toLocaleString()} F CFA</span>
          </div>
          {/* Acompte a verser */}
          <div className="flex items-center justify-between mt-[1cqw] px-[0.5cqw]">
            <div className="flex items-center gap-[0.8cqw]">
              <div className="w-[0.3cqw] h-[1.5cqw] bg-accent rounded-full" />
              <span className="text-[1.3cqw] text-slate-400 font-semibold uppercase tracking-wider">Acompte a verser (75%)</span>
            </div>
            <span className="text-[1.6cqw] font-black text-accent">{acompte.toLocaleString()} F CFA</span>
          </div>
        </div>

        {/* SOMME EN LETTRES */}
        <div className="relative z-10 mt-[1.5cqw] shrink-0" style={{ paddingLeft: '10.5%', paddingRight: '9.52%' }}>
          <div className="bg-slate-50/70 rounded-[1.5cqw] px-[2cqw] py-[1.2cqw]">
            <p className="text-[1.4cqw] italic text-slate-500 font-semibold leading-relaxed">
              Arretee la presente facture a la somme de : <span className="font-black text-primary uppercase">{convertNumberToWords(Math.round(total))} FRANCS CFA</span>
            </p>
          </div>
        </div>

        {/* CONDITIONS GENERALES */}
        <div className="relative z-10 mt-[1.5cqw] shrink-0" style={{ paddingLeft: '10.5%', paddingRight: '9.52%' }}>
          <div className="border border-border rounded-[2cqw] overflow-hidden">
            <div className="bg-primary/8 border-b border-border px-[2cqw] py-[1cqw] flex items-center gap-[1.2cqw]">
              <div className="w-[0.4cqw] h-[2.2cqw] bg-primary rounded-full shrink-0" />
              <p className="text-[1.3cqw] font-black text-primary uppercase tracking-widest leading-none">Conditions Generales</p>
            </div>
            <div className="px-[2cqw] py-[1.3cqw] grid grid-cols-2 gap-x-[2.7cqw] gap-y-[0.7cqw]">
              <div className="flex items-start gap-[0.8cqw]">
                <span className="text-[1.3cqw] text-primary font-black leading-none mt-[0.2cqw] shrink-0">&#8594;</span>
                <p className="text-[1.2cqw] text-slate-500 font-semibold leading-snug">
                  <span className="text-primary font-black">75% d'acompte</span> exige avant le debut des travaux &mdash; solde a la livraison.
                </p>
              </div>
              <div className="flex items-start gap-[0.8cqw]">
                <span className="text-[1.3cqw] text-primary font-black leading-none mt-[0.2cqw] shrink-0">&#8594;</span>
                <p className="text-[1.2cqw] text-slate-500 font-semibold leading-snug">
                  <span className="text-primary font-black">2 retouches incluses</span> &mdash; toute modification supplementaire sera facturee.
                </p>
              </div>
              <div className="flex items-start gap-[0.8cqw]">
                <span className="text-[1.3cqw] text-primary font-black leading-none mt-[0.2cqw] shrink-0">&#8594;</span>
                <p className="text-[1.2cqw] text-slate-500 font-semibold leading-snug">
                  Les <span className="text-primary font-black">delais demarrent</span> a reception de l'acompte &mdash; tout retard client n'engage pas le prestataire.
                </p>
              </div>
              <div className="flex items-start gap-[0.8cqw]">
                <span className="text-[1.3cqw] text-primary font-black leading-none mt-[0.2cqw] shrink-0">&#8594;</span>
                <p className="text-[1.2cqw] text-slate-500 font-semibold leading-snug">
                  En cas d'<span className="text-primary font-black">annulation</span> apres demarrage, l'acompte verse reste definitivement acquis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ZONE DE SIGNATURE ET CACHET */}
        <div className="relative z-10 mt-[1.5cqw] flex justify-end items-end shrink-0" style={{ paddingLeft: '10.5%', paddingRight: '9.52%' }}>
          {(companyInfo.stamp || companyInfo.signature) && (
            <div className="flex items-end justify-end gap-[2.7cqw] bg-slate-50/20 p-[1.3cqw] rounded-[2.7cqw] border-[0.15cqw] border-border/30">
              {companyInfo.stamp && (
                <img src={companyInfo.stamp} alt="Cachet" className="object-contain mix-blend-multiply opacity-80"
                  style={{ height: `${(companyInfo.stampHeight || 25) * 0.5}cqw` }} />
              )}
              {companyInfo.signature && (
                <img src={companyInfo.signature} alt="Signature" className="object-contain mix-blend-multiply"
                  style={{ height: `${(companyInfo.signatureHeight || 25) * 0.5}cqw` }} />
              )}
            </div>
          )}
        </div>

        {/* FOOTER STRUCTURE */}
        <div className="relative z-10 mt-[1.5cqw] shrink-0">
          <div className="w-full h-[0.12cqw] bg-border" />
          <div className="flex justify-between items-center py-[1.5cqw]" style={{ paddingLeft: '10.5%', paddingRight: '9.52%' }}>
            <div>
              {companyInfo.services && (
                <p className="text-[1.4cqw] font-black text-primary leading-snug">
                  SERVICES : {companyInfo.services.split('\n').filter(Boolean).join(' \u00b7 ')}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-[0.3cqw]">
              {companyInfo.phone && <p className="text-[1.2cqw] text-slate-400 font-semibold">{companyInfo.phone}</p>}
              {companyInfo.email && <p className="text-[1.2cqw] text-slate-400 font-semibold">{companyInfo.email}</p>}
            </div>
          </div>
        </div>

        {/* Bande de pied premium */}
        <div className="relative z-10 w-full h-[1.5cqw] bg-primary shrink-0" />
      </div>
    </section>
  );
}
