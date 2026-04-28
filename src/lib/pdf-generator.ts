import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Proforma, CompanyInfo } from '../types';

const formatCurrency = (val: number) => {
  return `${val.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;
};

export const generatePDF = (proforma: Proforma, company: CompanyInfo) => {
  // 0. Calculate Height
  // Base height for header, initial margins, and client info: ~85mm
  // Each table row (font 9, padding 4): ~10mm
  // Summary area: ~30mm
  // Bottom margin: ~20mm
  const estimatedTableHeight = (proforma.items.length * 10) + 10; // +10 for table header
  const requiredHeight = 85 + estimatedTableHeight + 30 + 20;
  
  // Use a minimum of A4 height (297) if it's very short, or stick to required height?
  // User asked to avoid empty space, so we use the required height directly.
  // We'll keep a minimum height of 150mm for aesthetic reasons.
  const finalPageHeight = Math.max(150, requiredHeight);

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [210, finalPageHeight]
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const MARGIN = 20;

  // 1. Watermark (Centered on new page height)
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
  doc.setFontSize(80);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text(proforma.type || 'PROFORMA', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45
  });
  doc.restoreGraphicsState();

  // 2. Logo Header
  const logoSize = 15;
  const logoX = MARGIN;
  const logoY = MARGIN;

  if (company.logo) {
    try {
      doc.addImage(company.logo, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST');
    } catch (e) {
      // Fallback if image fails to load
      doc.setFillColor(10, 31, 44); // #0a1f2c
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name.charAt(0).toUpperCase(), logoX + (logoSize/2), logoY + (logoSize/2) + 5, { align: 'center' });
    }
  } else {
    doc.setFillColor(10, 31, 44); // #0a1f2c
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name.charAt(0).toUpperCase(), logoX + (logoSize/2), logoY + (logoSize/2) + 5, { align: 'center' });
  }

  // 3. Header
  const textX = logoX + logoSize + 5;
  doc.setTextColor(10, 31, 44); // #0a1f2c
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name.toUpperCase(), textX, logoY + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(10, 31, 44); // semi-dark
  doc.setDrawColor(192, 224, 231, 0.5); // light-blue
  const companyLines = [
    company.address,
    company.email,
    company.phone
  ];
  doc.text(companyLines.join('\n'), textX, logoY + 11);

  doc.setTextColor(10, 31, 44); // #0a1f2c
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(proforma.type || 'PROFORMA', pageWidth - MARGIN, MARGIN + 8, { align: 'right' });
  
  // Horizontal Line
  doc.setDrawColor(192, 224, 231); // #c0e0e7
  doc.setLineWidth(0.5);
  doc.line(MARGIN, MARGIN + 28, pageWidth - MARGIN, MARGIN + 28);
  
  // 4. Meta & Client Info
  // Left: Client
  doc.setTextColor(10, 31, 44, 0.4);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESTINATAIRE:', MARGIN, MARGIN + 45);
  
  doc.setTextColor(10, 31, 44);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(proforma.client.name.toUpperCase(), MARGIN, MARGIN + 52);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(10, 31, 44, 0.7);
  doc.text(proforma.client.phone || '', MARGIN, MARGIN + 57);

  // Right: Meta
  doc.setTextColor(10, 31, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`N°: ${proforma.number}`, pageWidth - MARGIN, MARGIN + 45, { align: 'right' });
  doc.text(`Date: ${format(new Date(proforma.date), 'dd/MM/yyyy')}`, pageWidth - MARGIN, MARGIN + 52, { align: 'right' });

  // 7. Items Table
  const tableData = proforma.items.map(item => [
    (item.description || 'Service / Produit').toUpperCase(),
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.quantity * item.unitPrice)
  ]);

  autoTable(doc, {
    startY: MARGIN + 65,
    margin: { left: MARGIN, right: MARGIN },
    head: [['DESCRIPTION', 'QTÉ', 'PRIX UNITAIRE', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [192, 224, 231], // #c0e0e7 (app-light-blue)
      textColor: [10, 31, 44], // #0a1f2c (app-navy)
      fontSize: 8, 
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 4,
      lineWidth: 0.1,
      lineColor: [192, 224, 231]
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [10, 31, 44],
      lineColor: [192, 224, 231], // #c0e0e7
      lineWidth: 0.1
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const subtotal = proforma.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const discountAmount = (subtotal * (proforma.discountPercent || 0)) / 100;
  
  const summaryBoxWidth = 80;
  const summaryX = pageWidth - MARGIN - summaryBoxWidth;
  let currentY = finalY;

  // Design improved Totals Section
  if (proforma.discountPercent && proforma.discountPercent > 0) {
    // Subtotal Row
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('SOUS-TOTAL', summaryX, currentY);
    doc.setTextColor(10, 31, 44);
    doc.text(formatCurrency(subtotal), pageWidth - MARGIN - 5, currentY, { align: 'right' });
    
    currentY += 6;

    // Discount Row
    doc.setTextColor(150, 150, 150);
    doc.text(`RÉDUCTION (${proforma.discountPercent}%)`, summaryX, currentY);
    doc.setTextColor(220, 38, 38); // red
    doc.text(`-${formatCurrency(discountAmount)}`, pageWidth - MARGIN - 5, currentY, { align: 'right' });
    
    currentY += 8;
  }

  // Grand Total Box
  doc.setFillColor(255, 204, 0); // #ffcc00 (app-yellow)
  doc.roundedRect(summaryX - 5, currentY - 5, summaryBoxWidth + 5, 12, 1, 1, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 31, 44); // Dark blue text on yellow background
  doc.text('TOTAL GÉNÉRAL', summaryX, currentY + 3);
  
  doc.setFontSize(12);
  doc.setTextColor(10, 31, 44);
  doc.text(formatCurrency(proforma.total), pageWidth - MARGIN - 5, currentY + 3, { align: 'right' });

  // 8. Legal Note
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('Offre valable pendant 30 jours à compter de la date d\'émission.', pageWidth / 2, currentY + 20, { align: 'center' });

  doc.save(`${(proforma.type || 'PROFORMA').toLowerCase()}-${proforma.number}.pdf`);
};
