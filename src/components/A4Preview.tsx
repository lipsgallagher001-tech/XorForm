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
    <section className={`flex-1 bg-slate-200 flex items-start justify-center p-0 sm:p-4 md:p-8 overflow-x-hidden overflow-y-auto ${mobileView === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
      <div
        className="w-full max-w-[600px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15)] flex flex-col relative overflow-hidden @container"
        style={{ aspectRatio: '1 / 1.4142' }}
      >

        {/* ── EN-TÊTE NAVY PLEIN ─────────────────────────────────────── */}
        <div className="relative shrink-0 bg-primary overflow-hidden" style={{ paddingLeft: '8%', paddingRight: '8%', paddingTop: '5.5%', paddingBottom: '5.5%' }}>
          {/* Cercles déco en arrière-plan */}
          <div className="absolute -top-[8cqw] -right-[8cqw] w-[28cqw] h-[28cqw] rounded-full bg-white/5" />
          <div className="absolute -bottom-[5cqw] -right-[3cqw] w-[18cqw] h-[18cqw] rounded-full bg-white/5" />

          <div className="relative z-10 flex justify-between items-center">
            {/* Logo + Entreprise */}
            <div className="flex items-center gap-[2.5cqw]">
              {companyInfo.logo ? (
                <img
                  src={companyInfo.logo}
                  alt="Logo"
                  className="object-contain shrink-0 rounded-[1.5cqw]"
                  style={{ width: `${(companyInfo.logoWidth || 18) * 0.53}cqw`, height: `${(companyInfo.logoHeight || 18) * 0.53}cqw` }}
                />
              ) : (
                <div className="w-[8cqw] h-[8cqw] bg-white/20 rounded-[2cqw] flex items-center justify-center font-black text-white text-[3.5cqw] shrink-0 border border-white/20">
                  {companyInfo.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="space-y-[0.4cqw]">
                <p className="font-black text-[2.4cqw] text-white leading-tight tracking-tight">
                  {companyInfo.name}
                </p>
                <p className="text-[1.4cqw] text-white/60 font-medium leading-relaxed">
                  {companyInfo.address}
                </p>
                <div className="flex items-center gap-[2cqw]">
                  <p className="text-[1.3cqw] text-white/70 font-semibold">{companyInfo.phone}</p>
                  <p className="text-[1.3cqw] text-accent font-semibold">{companyInfo.email}</p>
                </div>
              </div>
            </div>

            {/* Type de document */}
            <div className="text-right shrink-0">
              <p className="text-[1cqw] font-bold text-white/30 uppercase tracking-[0.4em] leading-none mb-[0.8cqw]">
                {docType === 'FACTURE' ? 'DOCUMENT' : 'DOCUMENT'}
              </p>
              <p className="font-black text-[3.5cqw] text-white leading-none tracking-tight">
                {docType === 'FACTURE' ? 'Facture' : 'Pro-Forma'}
              </p>
              <div className="mt-[1cqw] space-y-[0.3cqw]">
                {companyInfo.siret && <p className="text-[1.2cqw] text-white/40 font-medium">SIRET : {companyInfo.siret}</p>}
                {companyInfo.siren && <p className="text-[1.2cqw] text-white/40 font-medium">SIREN : {companyInfo.siren}</p>}
                {companyInfo.rcs   && <p className="text-[1.2cqw] text-white/40 font-medium">RCS : {companyInfo.rcs}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION CLIENT + MÉTADONNÉES ───────────────────────────── */}
        <div className="relative shrink-0 flex gap-[2cqw]" style={{ paddingLeft: '8%', paddingRight: '8%', paddingTop: '3cqw', paddingBottom: '2.5cqw' }}>
          {/* Carte client */}
          <div className="flex-1 bg-slate-50 rounded-[1.5cqw] px-[2.5cqw] py-[1.8cqw] border border-slate-100">
            <p className="text-[1.1cqw] font-black text-slate-400 uppercase tracking-[0.2em] mb-[0.5cqw]">Destinataire</p>
            <p className="text-[2cqw] font-black text-primary uppercase leading-tight">
              {client.name || 'NOM DU CLIENT'}
            </p>
            {client.phone && (
              <p className="text-[1.3cqw] text-slate-500 font-semibold mt-[0.4cqw]">
                {client.phone}
              </p>
            )}
            {client.address && (
              <p className="text-[1.2cqw] text-slate-400 font-medium mt-[0.3cqw]">
                {client.address}
              </p>
            )}
          </div>

          {/* Méta-données */}
          <div className="shrink-0 w-[28cqw] flex flex-col gap-[1cqw]">
            <div className="bg-primary rounded-[1.5cqw] px-[2cqw] py-[1.5cqw] flex items-center justify-between">
              <p className="text-[1.1cqw] font-bold text-white/50 uppercase tracking-wider">Numéro</p>
              <p className="text-[1.5cqw] font-black text-white tracking-wider">#{proformaNumber}</p>
            </div>
            <div className="bg-slate-50 rounded-[1.5cqw] px-[2cqw] py-[1.5cqw] flex items-center justify-between border border-slate-100">
              <p className="text-[1.1cqw] font-bold text-slate-400 uppercase tracking-wider">Date</p>
              <p className="text-[1.4cqw] font-black text-primary">
                {format(new Date(proformaDate), 'dd/MM/yyyy')}
              </p>
            </div>
            <div className="bg-slate-50 rounded-[1.5cqw] px-[2cqw] py-[1.5cqw] flex items-center justify-between border border-slate-100">
              <p className="text-[1.1cqw] font-bold text-slate-400 uppercase tracking-wider">Type</p>
              <p className="text-[1.1cqw] font-black text-primary uppercase tracking-wider">
                {docType === 'FACTURE' ? 'Facture' : 'Pro-Forma'}
              </p>
            </div>
          </div>
        </div>

        {/* ── TABLEAU DES LIGNES ─────────────────────────────────────── */}
        <div className="relative z-10 flex-1 overflow-hidden" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
          <table className="w-full border-collapse text-[1.6cqw]">
            <thead>
              <tr>
                <th className="bg-primary text-white py-[1.6cqw] px-[2cqw] font-bold text-left uppercase tracking-wider text-[1.1cqw] rounded-l-[1cqw]">
                  Description
                </th>
                <th className="bg-primary text-white py-[1.6cqw] px-[1.2cqw] font-bold text-center w-[9cqw] uppercase tracking-wider text-[1.1cqw]">
                  Qté
                </th>
                <th className="bg-primary text-white py-[1.6cqw] px-[2cqw] font-bold text-right w-[15cqw] uppercase tracking-wider text-[1.1cqw]">
                  Prix unit.
                </th>
                <th className="bg-primary text-white py-[1.6cqw] px-[2cqw] font-bold text-right w-[15cqw] uppercase tracking-wider text-[1.1cqw] rounded-r-[1cqw]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-[1.2cqw] px-[2cqw] text-slate-700 font-medium">
                    {item.description || 'Sans description'}
                  </td>
                  <td className="py-[1.2cqw] px-[1.2cqw] text-center text-primary font-bold">
                    {item.quantity}
                  </td>
                  <td className="py-[1.2cqw] px-[2cqw] text-right text-slate-400 font-semibold whitespace-nowrap">
                    {item.unitPrice.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ')} F
                  </td>
                  <td className="py-[1.2cqw] px-[2cqw] text-right font-black text-primary whitespace-nowrap">
                    {(item.quantity * item.unitPrice).toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ')} F
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── TOTAUX ─────────────────────────────────────────────────── */}
        <div className="relative z-10 mt-[1.5cqw] shrink-0" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
          <div className="flex justify-end">
            <div className="w-[48cqw]">
              {/* Sous-total */}
              <div className="flex justify-between py-[0.8cqw] border-b border-slate-100">
                <span className="text-[1.3cqw] text-slate-400 font-semibold uppercase tracking-wider">Sous-total</span>
                <span className="text-[1.3cqw] text-slate-500 font-bold">{subtotal.toLocaleString()} F CFA</span>
              </div>

              {/* Remise */}
              {discountPercent > 0 && (
                <div className="flex justify-between py-[0.8cqw] border-b border-slate-100">
                  <span className="text-[1.3cqw] text-destructive font-semibold uppercase tracking-wider">
                    Remise ({discountPercent}%)
                  </span>
                  <span className="text-[1.3cqw] text-destructive font-bold">−{discountAmount.toLocaleString()} F CFA</span>
                </div>
              )}

              {/* Total Net */}
              <div className="mt-[1cqw] bg-primary rounded-[1.5cqw] px-[2.5cqw] py-[1.5cqw] flex items-center justify-between">
                <span className="text-[1.2cqw] font-bold text-white/60 uppercase tracking-wider">Total Net</span>
                <span className="text-[2cqw] font-black text-white">{total.toLocaleString()} F CFA</span>
              </div>

              {/* Acompte */}
              <div className="mt-[0.8cqw] flex items-center justify-between px-[0.5cqw]">
                <span className="text-[1.1cqw] text-slate-400 font-semibold uppercase tracking-wider">Acompte 75%</span>
                <span className="text-[1.4cqw] font-black text-accent">{acompte.toLocaleString()} F CFA</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SOMME EN LETTRES ───────────────────────────────────────── */}
        <div className="relative z-10 mt-[1.5cqw] shrink-0" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
          <div className="border-l-[0.4cqw] border-accent pl-[1.5cqw] py-[0.5cqw]">
            <p className="text-[1.2cqw] italic text-slate-400 font-medium leading-relaxed">
              Arrêtée la présente facture à la somme de :{' '}
              <span className="font-black text-primary not-italic uppercase">
                {convertNumberToWords(Math.round(total))} FRANCS CFA
              </span>
            </p>
          </div>
        </div>

        {/* ── CONDITIONS GÉNÉRALES ───────────────────────────────────── */}
        <div className="relative z-10 mt-[1.5cqw] shrink-0" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
          <div className="rounded-[1.5cqw] overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-[2cqw] py-[0.9cqw] flex items-center gap-[1cqw]">
              <div className="w-[3cqw] h-[0.2cqw] bg-primary rounded-full" />
              <p className="text-[1.1cqw] font-black text-primary uppercase tracking-[0.2em]">Conditions Générales</p>
            </div>
            <div className="px-[2cqw] py-[1.2cqw] grid grid-cols-2 gap-x-[2.5cqw] gap-y-[0.6cqw] bg-white">
              {[
                { bold: '75% d\'acompte', rest: 'exigé avant le début des travaux — solde à la livraison.' },
                { bold: '2 retouches incluses', rest: '— toute modification supplémentaire sera facturée.' },
                { bold: 'Délais démarrent', rest: 'à réception de l\'acompte — tout retard client n\'engage pas le prestataire.' },
                { bold: 'En cas d\'annulation', rest: 'après démarrage, l\'acompte versé reste définitivement acquis.' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-[0.7cqw]">
                  <div className="w-[0.3cqw] h-[1.5cqw] bg-accent/60 rounded-full mt-[0.3cqw] shrink-0" />
                  <p className="text-[1.1cqw] text-slate-500 font-medium leading-snug">
                    <span className="text-primary font-black">{c.bold}</span> {c.rest}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FOOTER 3 ZONES ─────────────────────────────────────────── */}
        <div className="relative z-10 mt-[1.5cqw] shrink-0">
          {/* Ligne séparatrice */}
          <div className="w-full h-[0.12cqw] bg-slate-200" />

          <div className="flex items-end justify-between py-[1.5cqw]" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
            {/* Services */}
            <div className="flex-1">
              {companyInfo.services && (
                <>
                  <p className="text-[1cqw] font-black text-slate-300 uppercase tracking-widest mb-[0.3cqw]">Services</p>
                  <p className="text-[1.2cqw] font-bold text-primary leading-snug">
                    {companyInfo.services.split('\n').filter(Boolean).join(' · ')}
                  </p>
                </>
              )}
            </div>

            {/* Signature + Cachet (centre) */}
            {(companyInfo.stamp || companyInfo.signature) && (
              <div className="flex items-end gap-[2cqw] px-[3cqw]">
                {companyInfo.stamp && (
                  <img src={companyInfo.stamp} alt="Cachet" className="object-contain mix-blend-multiply opacity-80"
                    style={{ height: `${(companyInfo.stampHeight || 25) * 0.45}cqw` }} />
                )}
                {companyInfo.signature && (
                  <img src={companyInfo.signature} alt="Signature" className="object-contain mix-blend-multiply"
                    style={{ height: `${(companyInfo.signatureHeight || 25) * 0.45}cqw` }} />
                )}
              </div>
            )}

            {/* Coordonnées */}
            <div className="flex flex-col items-end gap-[0.2cqw]">
              {companyInfo.phone && <p className="text-[1.1cqw] text-slate-400 font-semibold">{companyInfo.phone}</p>}
              {companyInfo.email && <p className="text-[1.1cqw] text-accent font-semibold">{companyInfo.email}</p>}
            </div>
          </div>

          {/* Bande navy basse */}
          <div className="w-full h-[2cqw] bg-primary" />
        </div>

      </div>
    </section>
  );
}
