import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Proforma, CompanyInfo } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u202f\u00a0]/g, ' ')
    .replace(/[éèêë]/g, 'e')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[àâä]/g, 'a')
    .replace(/[ÀÂÄ]/g, 'A')
    .replace(/[ôöó]/g, 'o')
    .replace(/[ÔÖÓ]/g, 'O')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ÙÛÜ]/g, 'U')
    .replace(/[ç]/g, 'c')
    .replace(/[Ç]/g, 'C');
};

const fmtCur = (val: number) =>
  `${val.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ')} F`;

const numberToWords = (n: number): string => {
  if (n === 0) return 'ZERO';
  const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF',
    'DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
  const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE',
    'SOIXANTE', 'QUATRE-VINGT', 'QUATRE-VINGT'];

  const below100 = (num: number): string => {
    if (num < 20) return units[num];
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (t === 7) return u === 1 ? 'SOIXANTE ET ONZE' : `SOIXANTE-${units[10 + u]}`;
    if (t === 9) return u === 0 ? 'QUATRE-VINGT-DIX' : `QUATRE-VINGT-${units[10 + u]}`;
    return u === 0 ? tens[t] : u === 1 && t !== 8 ? `${tens[t]} ET UN` : `${tens[t]}-${units[u]}`;
  };

  const below1000 = (num: number): string => {
    if (num < 100) return below100(num);
    const h = Math.floor(num / 100);
    const r = num % 100;
    const hStr = h === 1 ? 'CENT' : `${units[h]} CENT`;
    return r === 0 ? hStr : `${hStr} ${below100(r)}`;
  };

  let result = '';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;

  if (millions > 0) result += `${millions === 1 ? 'UN MILLION' : `${below1000(millions)} MILLIONS`} `;
  if (thousands > 0) result += `${thousands === 1 ? 'MILLE' : `${below1000(thousands)} MILLE`} `;
  if (remainder > 0) result += below1000(remainder);

  return result.trim();
};

const optimizeImage = async (
  base64: string,
  maxWidth = 800
): Promise<{ data: string; format: 'PNG' | 'JPEG' }> =>
  new Promise(resolve => {
    if (base64.length < 50000) {
      const isJpeg = base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg');
      resolve({ data: base64, format: isJpeg ? 'JPEG' : 'PNG' });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;

      if (w <= maxWidth && base64.length < 150000) {
        const isJpeg = base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg');
        resolve({ data: base64, format: isJpeg ? 'JPEG' : 'PNG' });
        return;
      }

      if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ data: base64, format: 'PNG' }); return; }
      ctx.drawImage(img, 0, 0, w, h);

      const isJpeg = base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg');
      if (isJpeg) {
        resolve({ data: canvas.toDataURL('image/jpeg', 0.85), format: 'JPEG' });
        return;
      }

      const px = ctx.getImageData(0, 0, w, h).data;
      let hasAlpha = false;
      const len = px.length;
      for (let i = 3; i < len; i += 16) {
        if (px[i] < 250) { hasAlpha = true; break; }
      }

      resolve(hasAlpha
        ? { data: canvas.toDataURL('image/png'), format: 'PNG' }
        : { data: canvas.toDataURL('image/jpeg', 0.85), format: 'JPEG' });
    };
    img.onerror = () => resolve({ data: base64, format: 'PNG' });
    img.src = base64;
  });

// ─── couleurs du système de design — Boardroom Premium ──────────────────────
const PRIMARY = [30, 58, 95] as const;      // Navy #1E3A5F
const ACCENT  = [5, 150, 105] as const;     // Émeraude #059669
const WHITE   = [255, 255, 255] as const;
const SLATE400 = [148, 163, 184] as const;
const SLATE200 = [226, 232, 240] as const;
const SLATE50  = [248, 250, 252] as const;
const SLATE100 = [241, 245, 249] as const;
const RED      = [239, 68, 68] as const;

// ─── générateur principal ────────────────────────────────────────────────────

const generatePDFInternal = async (proforma: Proforma, company: CompanyInfo): Promise<jsPDF> => {
  const ML = 16; // marge gauche
  const MR = 16; // marge droite
  const PW = 210;
  const PH = 297;
  const CW = PW - ML - MR; // largeur du contenu

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  // ── 0. PRÉ-CHARGEMENT DES IMAGES ─────────────────────────────────────────
  let logoOpt: { data: string; format: 'PNG' | 'JPEG' } | null = null;
  let stampOpt: { data: string; format: 'PNG' | 'JPEG' } | null = null;
  let sigOpt: { data: string; format: 'PNG' | 'JPEG' } | null = null;

  if (company.logo)      { try { logoOpt  = await optimizeImage(company.logo, 400); } catch { /* skip */ } }
  if (company.stamp)     { try { stampOpt = await optimizeImage(company.stamp, 300); } catch { /* skip */ } }
  if (company.signature) { try { sigOpt   = await optimizeImage(company.signature, 300); } catch { /* skip */ } }

  // ── 1. EN-TÊTE NAVY PLEIN ────────────────────────────────────────────────
  const HDR_H = 38; // hauteur du bloc header en mm
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PW, HDR_H, 'F');

  // Cercle déco en haut droite
  doc.setFillColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
  doc.circle(PW - 15, -5, 22, 'F');
  doc.circle(PW - 5, HDR_H - 5, 14, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // -- Logo ou initiale
  // Centrage vertical : on calcule la hauteur totale du bloc logo+texte
  // Texte entreprise : nom (12pt≈4.2mm) + adresse + phone + email = ~4 lignes espacées de ~5mm = ~20.5mm
  // On prend le max entre la hauteur du logo et celle du bloc texte pour centrer dans HDR_H
  const scaleFactor = 1.0;
  const logoW = (company.logoWidth  || 18) * scaleFactor;
  const logoH = (company.logoHeight || 18) * scaleFactor;
  const logoX = ML;

  // Hauteur du bloc texte : nom + adresse + phone + email = ~24mm
  const textBlockH = 24;
  // Hauteur effective de l'élément gauche (logo ou initiale)
  const leftElemH = logoOpt ? logoH : 14;
  // Hauteur totale du groupe (logo/initiale alignés côte à côte avec le texte)
  const groupH = Math.max(leftElemH, textBlockH);
  // Y de départ pour centrer le groupe dans HDR_H
  const groupY = (HDR_H - groupH) / 2;

  // Y du logo centré verticalement dans le groupe
  const logoY = groupY + (groupH - leftElemH) / 2;

  if (logoOpt) {
    doc.addImage(logoOpt.data, logoOpt.format, logoX, logoY, logoW, logoH, undefined, 'FAST');
  } else {
    // Carré initiale
    doc.setFillColor(255, 255, 255);
    doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
    doc.roundedRect(logoX, logoY, 14, 14, 1.5, 1.5, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    doc.setTextColor(...WHITE);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(cleanText(company.name.charAt(0).toUpperCase()), logoX + 7, logoY + 9.5, { align: 'center' });
  }

  // -- Infos entreprise (centrées verticalement dans le groupe)
  const infoX = logoX + (logoOpt ? logoW : 14) + 4;
  // Y de départ du texte centré dans le groupe
  const textStartY = groupY + (groupH - textBlockH) / 2;

  doc.setTextColor(...WHITE);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(company.name), infoX, textStartY + 5);

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.55 }));
  doc.text(cleanText(company.address), infoX, textStartY + 10.5);
  doc.setGState(new (doc as any).GState({ opacity: 0.7 }));
  doc.text(cleanText(company.phone), infoX, textStartY + 15.5);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setTextColor(...ACCENT);
  doc.text(cleanText(company.email), infoX, textStartY + 20.5);

  // -- Type de document (droite) — centré verticalement dans HDR_H
  // "DOCUMENT" (petit) + "Pro-Forma" (18pt) + identifiants légaux
  // On cible le centre vertical à HDR_H/2
  const docCenterY = HDR_H / 2;
  doc.setTextColor(255, 255, 255);
  doc.setGState(new (doc as any).GState({ opacity: 0.28 }));
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT', PW - MR, docCenterY - 8, { align: 'right' });
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(proforma.type === 'FACTURE' ? 'Facture' : 'Pro-Forma'), PW - MR, docCenterY - 1, { align: 'right' });

  // Identifiants légaux
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
  let legalY = docCenterY + 5;
  if (company.siret) { doc.text(cleanText(`SIRET : ${company.siret}`), PW - MR, legalY, { align: 'right' }); legalY += 4; }
  if (company.siren) { doc.text(cleanText(`SIREN : ${company.siren}`), PW - MR, legalY, { align: 'right' }); legalY += 4; }
  if (company.rcs)   { doc.text(cleanText(`RCS : ${company.rcs}`),     PW - MR, legalY, { align: 'right' }); }
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  let y = HDR_H + 6;

  // ── 2. SECTION CLIENT + MÉTADONNÉES ─────────────────────────────────────
  const CLIENT_CARD_H = 22;
  const META_W = 55;
  const CLIENT_W = CW - META_W - 4;

  // Carte client
  doc.setFillColor(...SLATE50);
  doc.setDrawColor(...SLATE200);
  doc.setLineWidth(0.15);
  doc.roundedRect(ML, y, CLIENT_W, CLIENT_CARD_H, 2.5, 2.5, 'FD');

  doc.setTextColor(...SLATE400);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.text('DESTINATAIRE', ML + 4, y + 5);

  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(proforma.client.name.toUpperCase()), ML + 4, y + 11.5);

  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE400);
  let clientInfoY = y + 16.5;
  if (proforma.client.phone) {
    doc.text(cleanText(proforma.client.phone), ML + 4, clientInfoY);
  }

  // Méta-données (3 mini-cartes à droite)
  const metaX = ML + CLIENT_W + 4;
  const metaCardH = 6.5;
  const metaGap = 0.7;

  // Carte numéro (navy)
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(metaX, y, META_W, metaCardH, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.setGState(new (doc as any).GState({ opacity: 0.55 }));
  doc.text('NUMERO', metaX + 3, y + 4.2);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(`#${proforma.number}`), metaX + META_W - 3, y + 4.2, { align: 'right' });

  // Carte date
  const dateY = y + metaCardH + metaGap;
  doc.setFillColor(...SLATE50);
  doc.setDrawColor(...SLATE100);
  doc.roundedRect(metaX, dateY, META_W, metaCardH, 1.5, 1.5, 'FD');
  doc.setTextColor(...SLATE400);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.text('DATE', metaX + 3, dateY + 4.2);
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(format(new Date(proforma.date), 'dd/MM/yyyy')), metaX + META_W - 3, dateY + 4.2, { align: 'right' });

  // Carte type
  const typeY = dateY + metaCardH + metaGap;
  doc.setFillColor(...SLATE50);
  doc.setDrawColor(...SLATE100);
  doc.roundedRect(metaX, typeY, META_W, metaCardH, 1.5, 1.5, 'FD');
  doc.setTextColor(...SLATE400);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
  doc.text('TYPE', metaX + 3, typeY + 4.2);
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(proforma.type === 'FACTURE' ? 'Facture' : 'Pro-Forma'), metaX + META_W - 3, typeY + 4.2, { align: 'right' });

  y += CLIENT_CARD_H + 7;

  // ── 3. TABLEAU ───────────────────────────────────────────────────────────
  const subtotal    = proforma.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  const discountAmt = (subtotal * (proforma.discountPercent || 0)) / 100;
  const totalHT     = subtotal - discountAmt;

  const totalsBlockH = 40 + (proforma.discountPercent ? 6 : 0); // espace réservé sous le tableau
  const sigH2  = company.signatureHeight || 25;
  const stampH = company.stampHeight    || 25;
  const maxImgH = Math.max(sigH2, stampH);
  const hasSig = !!(company.signature || company.stamp);
  const footerH = 14 + (company.services ? 5 : 0) + (hasSig ? maxImgH + 6 : 0);
  const bottomReserved = totalsBlockH + 28 + 42 + footerH; // totaux + lettres + conditions + footer

  const tableData = proforma.items.map(item => [
    cleanText(item.description || 'Sans description'),
    item.quantity.toString(),
    cleanText(fmtCur(item.unitPrice)),
    cleanText(fmtCur(item.quantity * item.unitPrice)),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [['Description', 'Qté', 'Prix unit.', 'Total']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: false,
      textColor: [...WHITE] as [number, number, number],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineWidth: 0,
    },
    styles: {
      fontSize: 9,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3, right: 3 },
      textColor: [...PRIMARY] as [number, number, number],
      lineColor: [...SLATE200] as [number, number, number],
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: false },
    columnStyles: {
      0: { cellWidth: 'auto', textColor: [51, 65, 85] },
      1: { halign: 'center', cellWidth: 18, textColor: [...PRIMARY], fontStyle: 'bold' },
      2: { halign: 'right',  cellWidth: 32, textColor: [...SLATE400] },
      3: { halign: 'right',  cellWidth: 32, textColor: [...PRIMARY], fontStyle: 'bold' },
    },
    willDrawCell: (data) => {
      // Header navy arrondi
      if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
        doc.setFillColor(...PRIMARY);
        doc.roundedRect(data.cell.x, data.cell.y, CW, data.cell.height, 2.5, 2.5, 'F');
      }
      // Ligne de séparation sous chaque ligne de body
      if (data.section === 'body') {
        doc.setDrawColor(...SLATE200);
        doc.setLineWidth(0.12);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ── 4. TOTAUX (colonne droite) ───────────────────────────────────────────
  const TOT_W = 80; // largeur de la colonne totaux
  const totX = PW - MR - TOT_W;

  // Séparateur hairline avant totaux
  doc.setDrawColor(...SLATE200);
  doc.setLineWidth(0.15);
  doc.line(totX, y, PW - MR, y);
  y += 5;

  // Sous-total
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE400);
  doc.text('Sous-total', totX, y);
  const subFmt = subtotal.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(`${subFmt} F CFA`), PW - MR, y, { align: 'right' });
  y += 5.5;

  // Séparateur
  doc.setDrawColor(...SLATE200);
  doc.setLineWidth(0.12);
  doc.line(totX, y - 1, PW - MR, y - 1);

  // Remise
  if ((proforma.discountPercent || 0) > 0) {
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...RED);
    doc.text(cleanText(`Remise (${proforma.discountPercent}%)`), totX, y + 4);
    const discFmt = discountAmt.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
    doc.setFont('helvetica', 'bold');
    doc.text(cleanText(`-${discFmt} F CFA`), PW - MR, y + 4, { align: 'right' });
    y += 10;
    doc.setDrawColor(...SLATE200);
    doc.setLineWidth(0.12);
    doc.line(totX, y - 1, PW - MR, y - 1);
  }

  // Barre Total Net
  const barH = 11;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(totX, y, TOT_W, barH, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
  doc.text('Total Net', totX + 4, y + 7);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  const totFmt = totalHT.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
  doc.text(cleanText(`${totFmt} F CFA`), PW - MR - 3, y + 7.5, { align: 'right' });
  y += barH + 4;

  // Acompte 75%
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE400);
  doc.text('Acompte a verser (75%)', totX, y);
  const acompteVal = Math.round(totalHT * 0.75);
  const acompteFmt = acompteVal.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text(cleanText(`${acompteFmt} F CFA`), PW - MR, y, { align: 'right' });
  y += 8;

  // ── 5. MONTANT EN LETTRES ────────────────────────────────────────────────
  const words    = numberToWords(Math.round(totalHT));
  const wordsStr = cleanText(`Arretee la presente facture a la somme de : ${words} FRANCS CFA`);

  // Barre accent gauche + italique
  doc.setFillColor(...ACCENT);
  doc.roundedRect(ML, y, 0.8, 10, 0.4, 0.4, 'F');

  doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  const wordsLines = doc.splitTextToSize(wordsStr, CW - 6);
  doc.text(wordsLines, ML + 4, y + 3.5);
  y += wordsLines.length * 4 + 4;

  // ── 6. CONDITIONS GÉNÉRALES ──────────────────────────────────────────────
  const COND_FS  = 7;
  const COND_LH  = 4.2;
  const COND_PX  = 4;
  const COND_PY  = 3;
  const COND_HDR = 7;
  const COND_GAP = 5;
  const condColW = (CW - 2 * COND_PX - COND_GAP) / 2;

  const cw = (text: string, bold: boolean): number => {
    doc.setFontSize(COND_FS);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    return doc.getTextWidth(text);
  };

  type CToken = { t: string; b: boolean };
  const condDefs: CToken[][] = [
    [
      { t: '75% d\'acompte', b: true },
      { t: ' exige avant le debut des travaux — solde a la livraison.', b: false },
    ],
    [
      { t: '2 retouches incluses', b: true },
      { t: ' — toute modification supplementaire sera facturee.', b: false },
    ],
    [
      { t: 'Delais demarrent', b: true },
      { t: ' a reception de l\'acompte — tout retard client n\'engage pas le prestataire.', b: false },
    ],
    [
      { t: 'En cas d\'annulation', b: true },
      { t: ' apres demarrage, l\'acompte verse reste definitvement acquis.', b: false },
    ],
  ];

  type RWord = { t: string; b: boolean };
  const wrapCond = (tokens: CToken[], maxW: number): RWord[][] => {
    const words: RWord[] = [];
    for (const tok of tokens) {
      const parts = tok.t.split(/( +)/);
      for (const p of parts) {
        if (p) words.push({ t: p, b: tok.b });
      }
    }
    const lines: RWord[][] = [[]];
    let lineW = 0;
    for (const w of words) {
      const isSpace = /^ +$/.test(w.t);
      const wW = cw(w.t, w.b);
      if (!isSpace && lineW > 0 && lineW + wW > maxW) { lines.push([]); lineW = 0; }
      if (isSpace && lineW === 0) continue;
      lines[lines.length - 1].push(w);
      lineW += wW;
    }
    return lines;
  };

  const condWrapped = condDefs.map(d => wrapCond(d, condColW));
  const rowH = [
    Math.max(condWrapped[0].length, condWrapped[1].length) * COND_LH,
    Math.max(condWrapped[2].length, condWrapped[3].length) * COND_LH,
  ];
  const condBoxH = COND_HDR + COND_PY + rowH[0] + COND_PY + rowH[1] + COND_PY;

  doc.setDrawColor(...SLATE100);
  doc.setFillColor(...WHITE);
  doc.setLineWidth(0.2);
  doc.roundedRect(ML, y, CW, condBoxH, 2.5, 2.5, 'FD');

  // Bandeau header conditions
  doc.setFillColor(...SLATE50);
  doc.roundedRect(ML, y, CW, COND_HDR, 2.5, 2.5, 'F');
  doc.rect(ML, y + COND_HDR / 2, CW, COND_HDR / 2, 'F');

  // Séparateur horizontal header
  doc.setDrawColor(...SLATE100);
  doc.setLineWidth(0.12);
  doc.line(ML, y + COND_HDR, ML + CW, y + COND_HDR);

  // Ligne déco (trait court navy)
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(ML + COND_PX, y + 2, 5, 0.6, 0.3, 0.3, 'F');

  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('CONDITIONS GENERALES', ML + COND_PX + 7, y + 5);

  const condStartY = y + COND_HDR + COND_PY;
  for (let row = 0; row < 2; row++) {
    const rowBaseY = condStartY + (row === 0 ? 0 : rowH[0] + COND_PY);
    for (let col = 0; col < 2; col++) {
      const idx = row * 2 + col;
      const condX = ML + COND_PX + col * (condColW + COND_GAP);
      const lines = condWrapped[idx];
      lines.forEach((lineWords, li) => {
        const lineY = rowBaseY + li * COND_LH + COND_LH * 0.85;
        let drawX = condX;
        lineWords.forEach(({ t, b }) => {
          doc.setFontSize(COND_FS);
          doc.setFont('helvetica', b ? 'bold' : 'normal');
          doc.setTextColor(b ? PRIMARY[0] : 100, b ? PRIMARY[1] : 116, b ? PRIMARY[2] : 139);
          doc.text(t, drawX, lineY);
          drawX += cw(t, b);
        });
      });
    }
  }

  y += condBoxH + 5;

  // ── 7. FOOTER 3 ZONES ────────────────────────────────────────────────────
  const footerY = PH - 14;

  // Signature + Cachet (centrés)
  if (hasSig) {
    const stampW = company.stampWidth     || 35;
    const sigW   = company.signatureWidth || 35;
    const stampHh = company.stampHeight   || 25;
    const sigHh   = company.signatureHeight || 25;
    const maxH = Math.max(stampHh, sigHh);
    const sigAreaY = footerY - maxH - 6;

    let totalImgW = 0;
    if (stampOpt && sigOpt) totalImgW = stampW + sigW + 8;
    else if (stampOpt)       totalImgW = stampW;
    else if (sigOpt)         totalImgW = sigW;

    const sigAreaX = ML + CW / 2 - totalImgW / 2;



    let imgX = sigAreaX;
    if (stampOpt) {
      doc.addImage(stampOpt.data, stampOpt.format, imgX, sigAreaY + (maxH - stampHh) / 2, stampW, stampHh, undefined, 'FAST');
      imgX += stampW + 8;
    }
    if (sigOpt) {
      doc.addImage(sigOpt.data, sigOpt.format, imgX, sigAreaY + (maxH - sigHh) / 2, sigW, sigHh, undefined, 'FAST');
    }
  }

  // Ligne séparatrice
  doc.setDrawColor(...SLATE200);
  doc.setLineWidth(0.2);
  doc.line(ML, footerY - 4, PW - MR, footerY - 4);

  // Services (gauche)
  if (company.services) {
    const sLines = company.services.split('\n').filter(Boolean);
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text(cleanText(sLines.join(' · ')), ML, footerY, { maxWidth: CW * 0.45 });
  }

  // Coordonnées (droite)
  doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE400);
  const coords: string[] = [];
  if (company.phone) coords.push(cleanText(company.phone));
  if (company.email) coords.push(cleanText(company.email));
  coords.forEach((c, i) => doc.text(c, PW - MR, footerY - (coords.length - 1 - i) * 4.5, { align: 'right' }));

  // Bande navy basse
  doc.setFillColor(...PRIMARY);
  doc.rect(0, PH - 6, PW, 6, 'F');

  return doc;
};

// ─── exports ─────────────────────────────────────────────────────────────────

export const getPDFBlob = async (proforma: Proforma, company: CompanyInfo): Promise<Blob> => {
  const doc = await generatePDFInternal(proforma, company);
  return doc.output('blob');
};

export const generatePDF = async (proforma: Proforma, company: CompanyInfo) => {
  const doc = await generatePDFInternal(proforma, company);
  doc.save(`${(proforma.type || 'PROFORMA').toLowerCase()}-${proforma.number}.pdf`);
};
