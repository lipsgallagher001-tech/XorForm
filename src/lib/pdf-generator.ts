import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Proforma, CompanyInfo } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

const cleanText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[\u202f\u00a0]/g, ' ') // Remplacer tous les espaces insécables par des espaces ordinaires
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
    // ⚡ OPTIMISATION RAPIDE : Si l'image est déjà petite, éviter le traitement
    if (base64.length < 50000) {
      const isJpeg = base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg');
      resolve({ data: base64, format: isJpeg ? 'JPEG' : 'PNG' });
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;

      // Si l'image est déjà plus petite que la largeur max et que son poids est raisonnable,
      // éviter de la redessiner dans un canvas
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

      // Si le format d'origine est JPEG, pas d'alpha possible
      const isJpeg = base64.startsWith('data:image/jpeg') || base64.startsWith('data:image/jpg');
      if (isJpeg) {
        resolve({ data: canvas.toDataURL('image/jpeg', 0.85), format: 'JPEG' });
        return;
      }

      // Échantillonner 1 pixel sur 4 (pas de 16) pour accélérer le scan d'alpha
      const px = ctx.getImageData(0, 0, w, h).data;
      let hasAlpha = false;
      const len = px.length;
      for (let i = 3; i < len; i += 16) {
        if (px[i] < 250) {
          hasAlpha = true;
          break;
        }
      }

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

  // ── Zones ancrées depuis le bas ────────────────────────────────────────────
  const footerBlockH = company.services ? 10 : 0;
  const sigBlockH = hasSig ? maxImgH + 6 + 4 : 0; // Cadre signature avec marges
  const bottomReserved = 5 + 5 + footerBlockH + sigBlockH + 12;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  // ── 1. HEADER ──────────────────────────────────────────────────────────────
  let y = M;

  // Adaptation de la taille relative pour correspondre à 0.53 cqw
  const scaleFactor = 1.113;
  const logoW = (company.logoWidth  || 18) * scaleFactor;
  const logoH = (company.logoHeight || 18) * scaleFactor;

  if (company.logo) {
    try {
      const opt = await optimizeImage(company.logo, 400);
      doc.addImage(opt.data, opt.format, M, y, logoW, logoH, undefined, 'FAST');
    } catch {
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(M, y, logoW, logoH, 1.5, 1.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(cleanText(company.name.charAt(0).toUpperCase()), M + logoW / 2, y + logoH / 2 + 4, { align: 'center' });
    }
  } else {
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(M, y, logoW, logoH, 1.5, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(cleanText(company.name.charAt(0).toUpperCase()), M + logoW / 2, y + logoH / 2 + 4, { align: 'center' });
  }

  // Infos entreprise
  const infoX = M + logoW + 5;
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(company.name), infoX, y + 4);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-400 (#94A3B8 / slate-500)
  const infoLines: string[] = [company.address, company.phone, company.email];
  if (company.siret) infoLines.push(`SIRET: ${company.siret}`);
  infoLines.forEach((line, i) => doc.text(cleanText(line), infoX, y + 10 + i * 4.5));

  // Droite (Type de document et date)
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(proforma.type === 'FACTURE' ? 'FACTURE' : 'PRO-FORMA'), PW - M, y + 4, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(cleanText(`DATE : ${format(new Date(proforma.date), 'dd/MM/yyyy')}`), PW - M, y + 10, { align: 'right' });

  y += Math.max(logoH, 24) + 4;
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); // border-border
  doc.line(M, y, PW - M, y);
  y += 10;

  // ── 2. TITRE ───────────────────────────────────────────────────────────────
  doc.setFontSize(15); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  const label = proforma.type === 'FACTURE' ? 'FACTURE N°' : 'PRO-FORMA N°';
  doc.text(cleanText(`${label} ${proforma.number}`), PW / 2, y, { align: 'center' });
  y += 8;

  // ── 3. BANDEAU CLIENT ──────────────────────────────────────────────────────
  const hasPhone = !!proforma.client.phone;
  const clientH = hasPhone ? 19 : 14;

  doc.setDrawColor(226, 232, 240); // #E2E8F0 (border-border)
  doc.setFillColor(248, 250, 252); // #F8FAFC (slate-50/50)
  doc.setLineWidth(0.15);
  doc.roundedRect(M, y, PW - 2 * M, clientH, 4.5, 4.5, 'FD'); // Coins arrondis avec bordure et remplissage

  doc.setTextColor(148, 163, 184); // #94A3B8 (slate-400)
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text(cleanText('CLIENT FACTURÉ'), M + 4, y + 4.5);

  doc.setTextColor(...PRIMARY);
  doc.setFontSize(10.5); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(proforma.client.name.toUpperCase()), M + 4, y + 10);

  if (hasPhone) {
    doc.setTextColor(148, 163, 184); // #94A3B8
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.text(cleanText(`TÉL : ${proforma.client.phone}`), M + 4, y + 15);
  }
  y += clientH + 5;

  // ── 4. TABLEAU ─────────────────────────────────────────────────────────────
  const totalsH  = 42;  // Espace pour totaux + marge sécurité
  const availForTable = PH - y - totalsH - bottomReserved;
  const ROW_H    = 9.0;
  const HEAD_H   = 11;
  const MIN_ROWS = 6;
  const maxRows  = Math.max(MIN_ROWS, Math.floor((availForTable - HEAD_H) / ROW_H));

  const tableData = proforma.items.map(item => [
    cleanText(item.description || 'Sans description'),
    item.quantity.toString(),
    cleanText(`${item.unitPrice.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ')} F`),
    cleanText(`${(item.quantity * item.unitPrice).toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ')} F`)
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
      fontSize: 9.5,
      fontStyle: 'bold',
      cellPadding: 3.5,
      lineColor: [255, 255, 255, 0.15],
      lineWidth: 0.15,
    },
    styles: {
      fontSize: 9.5,
      cellPadding: 3.2,
      textColor: [...PRIMARY] as [number, number, number],
      lineColor: [226, 232, 240], // #E2E8F0 pour correspondre à l'aperçu
      lineWidth: 0.15,
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

  doc.setFontSize(9.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // #94A3B8 (slate-400)
  const formattedSubtotal = subtotal.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
  doc.text(cleanText(`Sous-total : ${formattedSubtotal} F CFA`), PW - M, y, { align: 'right' });
  y += 5.5;

  if ((proforma.discountPercent || 0) > 0) {
    doc.setTextColor(239, 68, 68); // #EF4444 (destructive red)
    const formattedDiscount = discountAmt.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
    doc.text(cleanText(`Remise (${proforma.discountPercent}%) : -${formattedDiscount} F CFA`), PW - M, y, { align: 'right' });
    y += 5.5;
  }

  const barH = 12;
  doc.setFillColor(...ACCENT);
  doc.roundedRect(M, y, PW - 2 * M, barH, 6, 6, 'F'); // Coins arrondis pour l'encadré du total (style pilule)
  doc.setTextColor(...WHITE);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  const formattedTotal = totalHT.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
  doc.text(cleanText(`TOTAL NET : ${formattedTotal} F CFA`), PW - M - 4, y + 7.8, { align: 'right' });
  y += barH + 5;

  // ── 6. MONTANT EN LETTRES ──────────────────────────────────────────────────
  const words = numberToWords(Math.round(totalHT));
  const wordsText = `Arretee la presente facture a la somme de : ${words} FRANCS CFA`;
  doc.setFontSize(9.2); doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139); // slate-500
  const fullLines = doc.splitTextToSize(cleanText(wordsText), PW - 2 * M);
  doc.text(fullLines, M, y);
  y += fullLines.length * 4.8 + 3;

  // ── 7. SIGNATURE/CACHET — ancrée depuis le bas ────────────────────────────
  const footerY = PH - 5 - 10;
  const sigLabelY = company.services 
    ? footerY - maxImgH - 6
    : PH - 5 - 10 - maxImgH - 4;

  if (hasSig) {
    const stampW = company.stampWidth     || 35;
    const sigW   = company.signatureWidth || 35;
    const stampH = company.stampHeight    || 25;
    const sigH   = company.signatureHeight|| 25;
    const maxImgH = Math.max(stampH, sigH);

    // Calcul de la largeur totale de la boîte de signature/cachet
    let boxW = 0;
    if (company.stamp && company.signature) {
      boxW = stampW + sigW + 12; // Espace entre les images
    } else {
      boxW = (company.stamp ? stampW : sigW) + 8;
    }
    const boxH = maxImgH + 6;
    const boxX = PW - M - boxW;
    const boxY = sigLabelY;

    // Dessiner le cadre comme sur la maquette d'aperçu
    doc.setDrawColor(226, 232, 240); // #E2E8F0 (border-border)
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.setLineWidth(0.15);
    doc.roundedRect(boxX, boxY, boxW, boxH, 4.5, 4.5, 'FD'); // FD = Fill & Draw

    if (company.stamp) {
      try {
        const opt = await optimizeImage(company.stamp, 300);
        const imgX = boxX + 4;
        const imgY = boxY + 3 + (maxImgH - stampH) / 2;
        doc.addImage(opt.data, opt.format, imgX, imgY, stampW, stampH, undefined, 'FAST');
      } catch { /* skip */ }
    }
    if (company.signature) {
      try {
        const opt = await optimizeImage(company.signature, 300);
        const imgX = company.stamp ? boxX + stampW + 8 : boxX + 4;
        const imgY = boxY + 3 + (maxImgH - sigH) / 2;
        doc.addImage(opt.data, opt.format, imgX, imgY, sigW, sigH, undefined, 'FAST');
      } catch { /* skip */ }
    }
  }

  // ── 8. FOOTER — ancré en bas ───────────────────────────────────────────────
  if (company.services) {
    const sLines = company.services.split('\n').filter(Boolean);
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text(cleanText(`SERVICES : ${sLines.join(', ')}`), PW / 2, footerY, {
      align: 'center',
      maxWidth: PW - 2 * M
    });
  }

  doc.setFillColor(...PRIMARY);
  doc.rect(0, PH - 4, PW, 4, 'F'); // Bande fine de 4 mm

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
