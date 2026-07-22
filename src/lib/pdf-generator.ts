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
  const bottomReserved = 5 + 5 + footerBlockH + sigBlockH + 12 + 42; // +42mm = bloc Conditions Générales (header 7.5 + 2 rangées × 2 lignes × 4.5 + paddings + gap)

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  // ── 0. BARRE ACCENT VERTICALE GAUCHE ────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 4.5, PH, 'F');

  // ── 1. HEADER ──────────────────────────────────────────────────────────────
  let y = M;

  // Adaptation de la taille relative pour correspondre a 0.53 cqw
  const scaleFactor = 1.113;
  const logoW = (company.logoWidth  || 18) * scaleFactor;
  const logoH = (company.logoHeight || 18) * scaleFactor;

  // Calcul de la hauteur du bloc texte pour centrage vertical avec le logo
  // Bloc texte : nom (offset 4mm) + 3 lignes d'info espacées de 4.5mm → ~17.5mm
  const TEXT_BLOCK_H = 4 + 3 * 4.5; // ≈ 17.5 mm
  const headerBlockH = Math.max(logoH, TEXT_BLOCK_H);

  // Offset vertical pour centrer le logo par rapport au bloc texte
  const logoOffsetY = (headerBlockH - logoH) / 2;
  // Offset vertical pour centrer le texte par rapport au logo
  const textOffsetY = (headerBlockH - TEXT_BLOCK_H) / 2;

  const logoStartX = M + 8; // decale de la barre accent (4.5mm) + gap
  if (company.logo) {
    try {
      const opt = await optimizeImage(company.logo, 400);
      doc.addImage(opt.data, opt.format, logoStartX, y + logoOffsetY, logoW, logoH, undefined, 'FAST');
    } catch {
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(logoStartX, y + logoOffsetY, logoW, logoH, 1.5, 1.5, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(13); doc.setFont('helvetica', 'bold');
      doc.text(cleanText(company.name.charAt(0).toUpperCase()), logoStartX + logoW / 2, y + logoOffsetY + logoH / 2 + 4, { align: 'center' });
    }
  } else {
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(logoStartX, y + logoOffsetY, logoW, logoH, 1.5, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(cleanText(company.name.charAt(0).toUpperCase()), logoStartX + logoW / 2, y + logoOffsetY + logoH / 2 + 4, { align: 'center' });
  }

  // Infos entreprise (alignees verticalement avec le logo)
  const infoX = logoStartX + logoW + 5;
  const nameY  = y + textOffsetY + 4;
  const infoY0 = y + textOffsetY + 10;

  doc.setTextColor(...PRIMARY);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(company.name), infoX, nameY);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const infoLines: string[] = [company.address, company.phone, company.email];
  infoLines.forEach((line, i) => doc.text(cleanText(line), infoX, infoY0 + i * 4.5));

  // Droite — label type discret + grand titre
  doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 210, 220);
  doc.text(cleanText(proforma.type === 'FACTURE' ? 'FACTURE' : 'PRO-FORMA'), PW - M, y + 4, { align: 'right' });

  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text(cleanText(proforma.type === 'FACTURE' ? 'Facture' : 'Pro-Forma'), PW - M, y + 12, { align: 'right' });

  // Identifiants legaux
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  let legalY = y + 18;
  if (company.siret) { doc.text(cleanText(`SIRET : ${company.siret}`), PW - M, legalY, { align: 'right' }); legalY += 4; }
  if (company.siren) { doc.text(cleanText(`SIREN : ${company.siren}`), PW - M, legalY, { align: 'right' }); legalY += 4; }
  if (company.rcs)   { doc.text(cleanText(`RCS : ${company.rcs}`),   PW - M, legalY, { align: 'right' }); }

  y += Math.max(logoH, 24) + 4;
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2);
  doc.line(logoStartX, y, PW - M, y);
  y += 8;

  // ── 2. BANDEAU CLIENT — teinture navy + badge numero pill ─────────────────
  const hasPhone = !!proforma.client.phone;
  const clientH = 20;
  const clientX = logoStartX; // aligne avec le contenu (apres barre accent)

  // Fond teinture navy tres pale + bord gauche accent
  doc.setFillColor(245, 247, 251); // navy/3 - tres pale
  doc.rect(clientX, y, PW - M - clientX, clientH, 'F');
  // Bord gauche accent
  doc.setFillColor(...PRIMARY);
  doc.rect(clientX, y, 1.2, clientH, 'F');

  // Label "Facture a"
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.text('FACTURE À', clientX + 5, y + 5);

  // Badge numero pill (fond PRIMARY, texte blanc)
  const badgeText = cleanText(`N° ${proforma.number}`);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  const badgeW = doc.getTextWidth(badgeText) + 6;
  const badgeH = 5.5;
  const badgeX = PW - M - badgeW - 1;
  const badgeY = y + 1.5;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2.5, 2.5, 'F');
  doc.setTextColor(...WHITE);
  doc.text(badgeText, badgeX + 3, badgeY + 3.8);

  // Nom client
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(cleanText(proforma.client.name.toUpperCase()), clientX + 5, y + 12);

  // Tel + doc type + date
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  const docTypeLabel = proforma.type === 'FACTURE' ? '· FACTURE' : '· PRO-FORMA';
  let clientInfoX = clientX + 5;
  if (hasPhone) {
    doc.text(cleanText(`TEL : ${proforma.client.phone}`), clientInfoX, y + 17.5);
    clientInfoX += doc.getTextWidth(cleanText(`TEL : ${proforma.client.phone}`)) + 4;
  }
  doc.setTextColor(200, 210, 220);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanText(docTypeLabel), clientInfoX, y + 17.5);
  doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
  doc.text(cleanText(format(new Date(proforma.date), 'dd/MM/yyyy')), PW - M - 1, y + 17.5, { align: 'right' });

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

  autoTable(doc, {
    startY: y,
    margin: { left: logoStartX, right: M },
    head: [['Description', 'Qté', 'Prix unit.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: false, // Fond transparent pour afficher le rectangle arrondi personnalisé
      textColor: [...WHITE] as [number, number, number],
      fontSize: 9.5,
      fontStyle: 'bold',
      cellPadding: 3.5,
      lineWidth: 0, // Pas de bordure automatique pour éviter les coins carrés
    },
    styles: {
      fontSize: 9.5,
      cellPadding: 3.2,
      textColor: [...PRIMARY] as [number, number, number],
      lineColor: [226, 232, 240], // #E2E8F0 pour correspondre à l'aperçu
      lineWidth: 0.15,
      minCellHeight: ROW_H,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // #F8FAFC (slate-50/70) pour alterner les lignes comme dans l'aperçu
    },
    columnStyles: {
      0: { cellWidth: 'auto', textColor: [...PRIMARY] },
      1: { halign: 'center', cellWidth: 20, textColor: [...PRIMARY], fontStyle: 'bold' },
      2: { halign: 'right',  cellWidth: 32, textColor: [100, 116, 139] }, // #64748B (slate-500)
      3: { halign: 'right',  cellWidth: 32, textColor: [...PRIMARY], fontStyle: 'bold' },
    },
    willDrawCell: (data) => {
      // Dessiner le fond bleu arrondi pour l'en-tête entier lors du traitement de la première cellule
      if (data.section === 'head' && data.row.index === 0 && data.column.index === 0) {
        doc.setFillColor(...PRIMARY);
        // PW - 2*M = largeur réelle du tableau (marges left=M, right=M)
        // data.cell.height = hauteur de la cellule d'en-tête (data.row.height non dispo dans willDrawCell)
        doc.roundedRect(
          data.cell.x,
          data.cell.y,
          PW - M - logoStartX,
          data.cell.height,
          3.0,
          3.0,
          'F'
        );
      }
    },
    didDrawCell: (data) => {
      // Dessiner de fines séparations verticales blanches entre les colonnes de l'en-tête
      // Couleur mélangée [53, 78, 111] correspondant à 10% d'opacité du blanc sur le fond navy PRIMARY [30, 58, 95]
      if (data.section === 'head' && data.column.index < 3) {
        doc.setDrawColor(53, 78, 111);
        doc.setLineWidth(0.15);
        doc.line(
          data.cell.x + data.cell.width,
          data.cell.y,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    }
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

  // Barre Total Net en PRIMARY (navy) — plus corporate
  const barH = 12;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(logoStartX, y, PW - M - logoStartX, barH, 3, 3, 'F');
  doc.setTextColor(...WHITE);
  // Label gauche discret
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Total Net', logoStartX + 4, y + 7.8);
  // Montant droite bold
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  const formattedTotal = totalHT.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
  doc.text(cleanText(`${formattedTotal} F CFA`), PW - M - 4, y + 7.8, { align: 'right' });
  y += barH + 4;

  // Ligne acompte a verser (75%)
  const acompteVal = Math.round(totalHT * 0.75);
  const acompteFormatted = acompteVal.toLocaleString('fr-FR').replace(/[\u202f\u00a0\s]/g, ' ');
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Acompte à verser (75%) :', logoStartX + 4, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text(cleanText(`${acompteFormatted} F CFA`), PW - M - 4, y + 4, { align: 'right' });
  y += 10;

  // ── 6. MONTANT EN LETTRES — encadre discret ──────────────────────────────
  const words = numberToWords(Math.round(totalHT));
  const wordsText = `Arrêtée la présente facture à la somme de : ${words} FRANCS CFA`;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  const fullLines = doc.splitTextToSize(cleanText(wordsText), PW - M - logoStartX - 8);
  const wordsBoxH = fullLines.length * 4.5 + 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.roundedRect(logoStartX, y, PW - M - logoStartX, wordsBoxH, 2, 2, 'FD');
  doc.text(fullLines, logoStartX + 4, y + 4.5);
  y += wordsBoxH + 3;

  // ── 7. CONDITIONS GÉNÉRALES ───────────────────────────────────────────────
  const COND_FS   = 7;    // font size
  const COND_LH   = 4.5;  // line height mm
  const COND_PX   = 5;    // horizontal padding inside box
  const COND_PY   = 3.5;  // vertical padding
  const COND_HDR  = 7.5;  // header band height
  const COND_GAP  = 6;    // gap between columns

  const condColW = (PW - M - logoStartX - 2 * COND_PX - COND_GAP) / 2;

  // Helper: get text width for a word with given style
  const cw = (text: string, bold: boolean): number => {
    doc.setFontSize(COND_FS);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    return doc.getTextWidth(text);
  };

  // Each condition = sequence of [text, isBold] tokens
  type CToken = { t: string; b: boolean };
  const condDefs: CToken[][] = [
    [
      { t: '-', b: false }, { t: ' ', b: false },
      { t: "75%", b: true }, { t: " ", b: false }, { t: "d'acompte", b: true },
      { t: ' exigé avant le début des travaux - solde à la livraison.', b: false },
    ],
    [
      { t: '-', b: false }, { t: ' ', b: false },
      { t: '2', b: true }, { t: ' ', b: false }, { t: 'retouches', b: true }, { t: ' ', b: false }, { t: 'incluses', b: true },
      { t: ' - toute modification supplémentaire sera facturée.', b: false },
    ],
    [
      { t: '-', b: false }, { t: ' ', b: false },
      { t: 'Les', b: false }, { t: ' ', b: false },
      { t: 'délais', b: true }, { t: ' ', b: false }, { t: 'démarrent', b: true },
      { t: " à réception de l'acompte - tout retard client n'engage pas le prestataire.", b: false },
    ],
    [
      { t: '-', b: false }, { t: ' ', b: false },
      { t: "En cas d'", b: false },
      { t: 'annulation', b: true },
      { t: " après démarrage, l'acompte versé reste définitivement acquis.", b: false },
    ],
  ];

  // Word-level wrap: splits each token by spaces, returns lines of [{t,b,xOff}]
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
      if (!isSpace && lineW > 0 && lineW + wW > maxW) {
        lines.push([]);
        lineW = 0;
      }
      if (isSpace && lineW === 0) continue; // skip leading spaces on new line
      lines[lines.length - 1].push(w);
      lineW += wW;
    }
    return lines;
  };

  // Pre-render all 4 conditions
  const condWrapped = condDefs.map(d => wrapCond(d, condColW));

  // Calculate row heights (max lines between left & right of each row)
  const rowH = [
    Math.max(condWrapped[0].length, condWrapped[1].length) * COND_LH,
    Math.max(condWrapped[2].length, condWrapped[3].length) * COND_LH,
  ];
  const condBoxH = COND_HDR + COND_PY + rowH[0] + COND_PY + rowH[1] + COND_PY;

  // ── Draw box ──
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.roundedRect(logoStartX, y, PW - M - logoStartX, condBoxH, 3, 3, 'FD');

  // Header tinted band
  doc.setFillColor(238, 242, 248);
  doc.roundedRect(logoStartX, y, PW - M - logoStartX, COND_HDR, 3, 3, 'F');
  doc.rect(logoStartX, y + COND_HDR / 2, PW - M - logoStartX, COND_HDR / 2, 'F');

  // Accent bar
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(logoStartX + COND_PX, y + 1.8, 0.8, 4, 0.4, 0.4, 'F');

  // Title
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text('CONDITIONS GÉNÉRALES', logoStartX + COND_PX + 3, y + 5.3);

  // ── Draw conditions text (2 columns, 2 rows) ──
  const condStartY = y + COND_HDR + COND_PY;

  for (let row = 0; row < 2; row++) {
    const rowBaseY = condStartY + (row === 0 ? 0 : rowH[0] + COND_PY);

    for (let col = 0; col < 2; col++) {
      const idx = row * 2 + col;
      const condX = logoStartX + COND_PX + col * (condColW + COND_GAP);
      const lines = condWrapped[idx];

      lines.forEach((lineWords, li) => {
        const lineY = rowBaseY + li * COND_LH + COND_LH * 0.85; // baseline offset
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

  y += condBoxH + 4;


  // ── 8. SIGNATURE/CACHET — ancrée depuis le bas ────────────────────────────
  const footerY = PH - 5 - 10;
  const sigLabelY = company.services 
    ? footerY - maxImgH - 14  // Espace de 14 mm entre la signature et le texte des services
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

  // ── 8. FOOTER STRUCTURE — ancre en bas ────────────────────────────────────
  // Ligne separatrice
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(logoStartX, footerY - 6, PW - M, footerY - 6);

  // Services a gauche
  if (company.services) {
    const sLines = company.services.split('\n').filter(Boolean);
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PRIMARY);
    doc.text(cleanText(`SERVICES : ${sLines.join(' \u00b7 ')}`), logoStartX, footerY, {
      maxWidth: (PW - M - logoStartX) * 0.55
    });
  }

  // Coordonnees a droite
  doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  if (company.phone) {
    doc.text(cleanText(company.phone), PW - M, footerY - 5, { align: 'right' });
  }
  if (company.email) {
    doc.text(cleanText(company.email), PW - M, footerY, { align: 'right' });
  }

  // Bande de pied plus epaisse (6mm)
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
