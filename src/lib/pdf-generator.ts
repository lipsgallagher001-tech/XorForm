import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Proforma, CompanyInfo } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtCur = (val: number) =>
  `${val.toLocaleString('fr-FR').replace(/\s/g, '\u00a0')}\u00a0F`;

const numberToWords = (n: number): string => {
  if (n === 0) return 'ZÉRO';
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
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ data: base64, format: 'PNG' }); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const px = ctx.getImageData(0, 0, w, h).data;
      let hasAlpha = false;
      for (let i = 3; i < px.length; i += 4) if (px[i] < 255) { hasAlpha = true; break; }
      resolve(hasAlpha
        ? { data: canvas.toDataURL('image/png'), format: 'PNG' }
        : { data: canvas.toDataURL('image/jpeg', 0.85), format: 'JPEG' });
    };
    img.onerror = () => resolve({ data: base64, format: 'PNG' });
    img.src = base64;
  });

// ─── couleurs du système de design (Exaggerated Minimalism) ─────────────────
const PRIMARY = [30, 58, 95] as const;      // Navy professionnel #1E3A5F
const ACCENT  = [5, 150, 105] as const;      // Vert émeraude #059669
const MUTED   = [241, 245, 249] as const;    // Gris clair neutre #F1F5F9
const WHITE   = [255, 255, 255] as const;

// ─── générateur ──────────────────────────────────────────────────────────────

const generatePDFInternal = async (proforma: Proforma, company: CompanyInfo): Promise<jsPDF> => {
  const M  = 20; // marges gauche/droite/haut en mm (2 cm)
  const PW = 210;
  const PH = 297;

  const stampH2 = company.stampHeight    || 25;
  const sigH    = company.signatureHeight|| 25;
  const maxImgH = Math.max(stampH2, sigH);
  const hasSig  = !!(company.signature || company.stamp);
  const svcH    = company.services ? 8 : 0;

  // ── Zones ancrées depuis le bas ────────────────────────────────────────────
  // bande navy (5) + marge bas (15) + footer: slogan(10) + services(svcH) + sig + label(8)
  const sigBlockH  = hasSig ? maxImgH + 8 : 0;
  const footerBlockH = svcH + 10;          // services + slogan
  const bottomReserved = 5 + M + footerBlockH + sigBlockH + 8 + 6;
  //                      navy  marge  footer         sig      label+gap  gap

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  // ── 1. HEADER ──────────────────────────────────────────────────────────────
  let y = M;

  const logoW = company.logoWidth  || 18;
  const logoH = company.logoHeight || 18;

  if (company.logo) {
    try {
      const opt = await optimizeImage(company.logo, 400);
      doc.addImage(opt.data, opt.format, M, y, logoW, logoH, undefined, 'FAST');
    } catch {
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(M, y, logoW, logoH, 1.5, 1.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(company.name.charAt(0).toUpperCase(), M + logoW / 2, y + logoH / 2 + 4, { align: 'center' });
    }
  } else {
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(M, y, logoW, logoH, 1.5, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(company.name.charAt(0).toUpperCase(), M + logoW / 2, y + logoH / 2 + 4, { align: 'center' });
  }

  // Infos entreprise
  const infoX = M + logoW + 5;
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(company.name, infoX, y + 5);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.setTextColor(100, 100, 100);
  const infoLines: string[] = [company.address, company.phone, company.email];
  if (company.siret) infoLines.push(`SIRET: ${company.siret}`);
  infoLines.forEach((line, i) => doc.text(line, infoX, y + 12 + i * 4.8));

  // Droite
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(proforma.type === 'FACTURE' ? 'FACTURE' : 'PRO-FORMA', PW - M, y + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`Date : ${format(new Date(proforma.date), 'dd/MM/yyyy')}`, PW - M, y + 12, { align: 'right' });

  y += Math.max(logoH, 24) + 5;
  doc.setDrawColor(...PRIMARY); doc.setLineWidth(0.3);
  doc.line(M, y, PW - M, y);
  y += 12;

  // ── 2. TITRE ───────────────────────────────────────────────────────────────
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  const label = proforma.type === 'FACTURE' ? 'N° DE FACTURE' : 'N° PRO-FORMA';
  doc.text(`${label} : ${proforma.number}`, PW / 2, y, { align: 'center' });
  y += 10;

  // ── 3. BANDEAU CLIENT ──────────────────────────────────────────────────────
  const clientH = 16;
  doc.setFillColor(...MUTED);
  doc.rect(M, y, PW - 2 * M, clientH, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('Facture à', M + 3, y + 5.5);
  doc.setFontSize(11);
  doc.text(`Client : ${proforma.client.name.toUpperCase()}`, M + 3, y + 12);
  if (proforma.client.phone) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(proforma.client.phone, PW - M - 3, y + 12, { align: 'right' });
  }
  y += clientH + 5;

  // ── 4. TABLEAU ─────────────────────────────────────────────────────────────
  // Calcul de l'espace disponible pour le tableau
  const totalsH  = 30;  // sous-total + barre jaune + lettres
  const availForTable = PH - y - totalsH - bottomReserved;
  const ROW_H    = 9.0;
  const HEAD_H   = 11;
  const MIN_ROWS = 6;
  const maxRows  = Math.max(MIN_ROWS, Math.floor((availForTable - HEAD_H) / ROW_H));

  const tableData = proforma.items.map(item => [
    item.description || '',
    item.quantity.toString(),
    fmtCur(item.unitPrice),
    fmtCur(item.quantity * item.unitPrice)
  ]);
  while (tableData.length < maxRows) tableData.push(['', '', '', '']);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Description', 'Quantité', 'Prix unitaire', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [...PRIMARY] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3.5,
      lineColor: [...PRIMARY] as [number, number, number],
      lineWidth: 0.1,
    },
    styles: {
      fontSize: 10,
      cellPadding: 3.5,
      textColor: [...PRIMARY] as [number, number, number],
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
      minCellHeight: ROW_H,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right',  cellWidth: 36 },
      3: { halign: 'right',  cellWidth: 36, fontStyle: 'bold' },
    },
  });

  y = (doc as any).lastAutoTable.finalY;

  // ── 5. TOTAUX ──────────────────────────────────────────────────────────────
  y += 4;
  const subtotal    = proforma.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  const discountAmt = (subtotal * (proforma.discountPercent || 0)) / 100;
  const totalHT     = subtotal - discountAmt;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Sous-total : ${fmtCur(subtotal)} CFA`, PW - M, y, { align: 'right' });
  y += 5.5;

  if ((proforma.discountPercent || 0) > 0) {
    doc.text(`Remise : ${fmtCur(discountAmt)} F`, PW - M, y, { align: 'right' });
    y += 5.5;
  }

  const barH = 12;
  doc.setFillColor(...ACCENT);
  doc.rect(M, y, PW - 2 * M, barH, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`Total HT : ${fmtCur(totalHT)} CFA`, PW - M - 3, y + 8.5, { align: 'right' });
  y += barH + 5;

  // ── 6. MONTANT EN LETTRES ──────────────────────────────────────────────────
  const words = numberToWords(Math.round(totalHT));
  const wordsText = `Arrêtée la présente facture à la somme de : ${words}`;
  doc.setFontSize(9.5); doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  const fullLines = doc.splitTextToSize(wordsText, PW - 2 * M);
  doc.text(fullLines, M, y);
  y += fullLines.length * 5 + 3;

  // ── 7. SIGNATURE/CACHET — ancrée depuis le bas ────────────────────────────
  // Y de la zone signature = PH - bottomReserved + offset
  const sigLabelY = PH - 5 - M - footerBlockH - sigBlockH - 8;

  if (hasSig) {
    const stampW = company.stampWidth     || 32;
    const sigW   = company.signatureWidth || 32;
    const imgY   = sigLabelY + 5;

    if (company.stamp) {
      try {
        const opt = await optimizeImage(company.stamp, 300);
        doc.addImage(opt.data, opt.format, PW - M - sigW - stampW - 5, imgY, stampW, stampH2, undefined, 'FAST');
      } catch { /* skip */ }
    }
    if (company.signature) {
      try {
        const opt = await optimizeImage(company.signature, 300);
        doc.addImage(opt.data, opt.format, PW - M - sigW, imgY, sigW, sigH, undefined, 'FAST');
      } catch { /* skip */ }
    }
  }

  // ── 8. FOOTER — ancré en bas ───────────────────────────────────────────────
  const footerY = PH - 5 - M - footerBlockH;

  if (company.services) {
    const sLines = company.services.split('\n').filter(Boolean);
    doc.setFontSize(10); doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...PRIMARY);
    doc.text(`NOS SERVICES : ${sLines.join(', ')}`, PW / 2, footerY, {
      align: 'center',
      maxWidth: PW - 2 * M
    });
  }

  doc.setFillColor(...PRIMARY);
  doc.rect(0, PH - 5, PW, 5, 'F');

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
