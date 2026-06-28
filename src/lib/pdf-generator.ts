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

// ─── colours (matching the design) ─────────────────────────────────────────
const NAVY  = [10,  31, 44]  as const;   // #0a1f2c
const YELLOW= [255,204,  0]  as const;   // #ffcc00
const LBLUE = [192,224,231]  as const;   // #c0e0e7
const WHITE = [255,255,255]  as const;
const GREY  = [230,230,230]  as const;

// ─── main generator ─────────────────────────────────────────────────────────

const generatePDFInternal = async (proforma: Proforma, company: CompanyInfo): Promise<jsPDF> => {
  const extraH   = (company.signature || company.stamp) ? 45 : 10;
  const tableH   = proforma.items.length * 10 + 14;
  const requiredH= 30 + 45 + tableH + 50 + extraH + 35;
  const pageH    = Math.max(200, requiredH);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [210, pageH] });
  const PW   = doc.internal.pageSize.width;   // 210
  const PH   = doc.internal.pageSize.height;
  const M    = 25; // margin 2,5 cm

  // ── 2. Header band ────────────────────────────────────────────────────────
  const headerH = 38;

  // Logo
  const logoW = company.logoWidth  || 16;
  const logoH = company.logoHeight || 16;
  const logoX = M;
  const logoY = 25; // marge haut 2,5 cm

  if (company.logo) {
    try {
      const opt = await optimizeImage(company.logo, 400);
      doc.addImage(opt.data, opt.format, logoX, logoY, logoW, logoH, undefined, 'FAST');
    } catch {
      doc.setFillColor(...NAVY);
      doc.roundedRect(logoX, logoY, logoW, logoH, 1, 1, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text(company.name.charAt(0).toUpperCase(), logoX + logoW / 2, logoY + logoH / 2 + 4, { align: 'center' });
    }
  } else {
    doc.setFillColor(...NAVY);
    doc.roundedRect(logoX, logoY, logoW, logoH, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(company.name.charAt(0).toUpperCase(), logoX + logoW / 2, logoY + logoH / 2 + 4, { align: 'center' });
  }

  // Company name + info
  const infoX = logoX + logoW + 4;
  doc.setTextColor(...NAVY);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(company.name, infoX, logoY + 4);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  const infoLines: string[] = [company.address, company.phone, company.email];
  if (company.siret) infoLines.push(`SIRET: ${company.siret}`);
  infoLines.forEach((line, i) => doc.text(line, infoX, logoY + 9 + i * 4));

  // Right: PRO-FORMA / Date / Validité
  doc.setTextColor(...NAVY);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(proforma.type === 'FACTURE' ? 'FACTURE' : 'PRO-FORMA', PW - M, logoY + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Date : ${format(new Date(proforma.date), 'dd/MM/yyyy')}`, PW - M, logoY + 9, { align: 'right' });
  doc.text('Validité :', PW - M, logoY + 14, { align: 'right' });

  // Separator line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.line(M, logoY + headerH - 8, PW - M, logoY + headerH - 8);

  // ── 3. Document number title ──────────────────────────────────────────────
  const titleY = logoY + headerH + 4;
  doc.setFontSize(17); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  const label = proforma.type === 'FACTURE' ? 'N° DE FACTURE' : 'N° PRO-FORMA';
  doc.text(`${label} : ${proforma.number}`, PW / 2, titleY, { align: 'center' });

  // underline
  const titleW = doc.getTextWidth(`${label} : ${proforma.number}`);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(PW / 2 - titleW / 2, titleY + 1.5, PW / 2 + titleW / 2, titleY + 1.5);

  // ── 4. Client band (light blue background) ───────────────────────────────
  const clientY = titleY + 8;
  const clientH = 12;
  doc.setFillColor(...LBLUE);
  doc.rect(M, clientY, PW - 2 * M, clientH, 'F');

  doc.setTextColor(...NAVY);
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('Facture à', M + 3, clientY + 4);
  doc.setFontSize(9);
  doc.text(`Client : ${proforma.client.name.toUpperCase()}`, M + 3, clientY + 9);
  if (proforma.client.phone) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(proforma.client.phone, PW - M - 3, clientY + 9, { align: 'right' });
  }

  // ── 5. Items table ────────────────────────────────────────────────────────
  const tableStartY = clientY + clientH + 5;

  const tableData = proforma.items.map(item => [
    item.description || '',
    item.quantity.toString(),
    fmtCur(item.unitPrice),
    fmtCur(item.quantity * item.unitPrice)
  ]);

  // Add empty rows to always show at least 6 lines (like the reference)
  const minRows = 6;
  while (tableData.length < minRows) tableData.push(['', '', '', '']);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: M, right: M },
    head: [['Description', 'Quantité', 'Prix unitaire', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [...NAVY] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
      lineColor: [...NAVY] as [number, number, number],
      lineWidth: 0.1,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [...NAVY] as [number, number, number],
      lineColor: [180, 180, 180],
      lineWidth: 0.1,
    },
    columnStyles: {
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'right',  cellWidth: 35 },
      3: { halign: 'right',  cellWidth: 35, fontStyle: 'bold' },
    },
  });

  const afterTableY = (doc as any).lastAutoTable.finalY;

  // ── 6. Totals ─────────────────────────────────────────────────────────────
  const subtotal      = proforma.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
  const discountAmt   = (subtotal * (proforma.discountPercent || 0)) / 100;
  const totalHT       = subtotal - discountAmt;

  let totY = afterTableY;

  // Sous-total line
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Sous-total : ${fmtCur(subtotal)} CFA`, PW - M, totY, { align: 'right' });
  totY += 5;

  if ((proforma.discountPercent || 0) > 0) {
    doc.text(`Remise : ${fmtCur(discountAmt)} F`, PW - M, totY, { align: 'right' });
    totY += 5;
  }

  // Yellow total bar (full width)
  const barH = 10;
  doc.setFillColor(...YELLOW);
  doc.rect(M, totY, PW - 2 * M, barH, 'F');
  doc.setTextColor(...NAVY);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`Total HT : ${fmtCur(totalHT)} CFA`, PW - M - 3, totY + 6.8, { align: 'right' });
  totY += barH + 6;

  // ── 7. Amount in words ────────────────────────────────────────────────────
  const words = numberToWords(Math.round(totalHT));
  doc.setFontSize(8); doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Arrêtée la présente facture à la somme de : ${words}`,
    M, totY,
    { maxWidth: PW - 2 * M }
  );
  totY += 10;

  // ── 8. Signature / Stamp zone ─────────────────────────────────────────────
  if (company.signature || company.stamp) {
    const stampW  = company.stampWidth     || 30;
    const stampH2 = company.stampHeight    || 22;
    const sigW    = company.signatureWidth || 30;
    const sigH    = company.signatureHeight|| 22;

    // "RESPONSABLE" label on right
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('RESPONSABLE', PW - M, totY + 3, { align: 'right' });
    // underline
    const rw = doc.getTextWidth('RESPONSABLE');
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.3);
    doc.line(PW - M - rw, totY + 4, PW - M, totY + 4);

    if (company.stamp) {
      try {
        const opt = await optimizeImage(company.stamp, 300);
        doc.addImage(opt.data, opt.format, PW - M - sigW - stampW - 6, totY + 6, stampW, stampH2, undefined, 'FAST');
      } catch { /* skip */ }
    }
    if (company.signature) {
      try {
        const opt = await optimizeImage(company.signature, 300);
        doc.addImage(opt.data, opt.format, PW - M - sigW, totY + 6, sigW, sigH, undefined, 'FAST');
      } catch { /* skip */ }
    }
    totY += Math.max(stampH2, sigH) + 8;
  } else {
    // No images: just label
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('RESPONSABLE', PW - M, totY + 3, { align: 'right' });
    const rw = doc.getTextWidth('RESPONSABLE');
    doc.setDrawColor(...NAVY); doc.setLineWidth(0.3);
    doc.line(PW - M - rw, totY + 4, PW - M, totY + 4);
    totY += 12;
  }

  // ── 9. Footer ─────────────────────────────────────────────────────────────
  const footerY = PH - 31; // marge bas 2,5 cm (25 mm) + bande navy 6 mm

  // Services (left, bold italic)
  if (company.services) {
    const lines = company.services.split('\n').filter(s => s.trim());
    doc.setFontSize(8); doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(...NAVY);
    doc.text(
      `NOS SERVICES : ${lines.join(', ')}`,
      M, footerY + 6,
      { maxWidth: (PW - 2 * M) * 0.55 }
    );
  }

  // Watermark / slogan (bottom left, large italic bold)
  const slogan = company.watermark || 'COMMUNIQUER LA DIFFÉRENCE';
  doc.setFontSize(13); doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(...NAVY);
  doc.text(slogan, M, footerY + 18);

  // Company short name bottom right
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const shortName = company.name.split(' ')[0];
  doc.text(shortName, PW - M - 12, footerY + 18);

  // Small empty square bottom-right corner (like the reference)
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3);
  doc.rect(PW - M - 8, footerY + 20, 8, 8);

  // Dark navy footer band at very bottom
  doc.setFillColor(...NAVY);
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
