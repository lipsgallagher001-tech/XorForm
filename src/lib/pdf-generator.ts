import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Proforma, CompanyInfo } from '../types';

const formatCurrency = (val: number) => {
  return `${val.toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;
};

// Fonction pour optimiser les images base64 en préservant la transparence
const optimizeImage = async (base64: string, maxWidth: number = 800): Promise<{ data: string; format: 'PNG' | 'JPEG' }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Redimensionner si trop grande
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Vérifier si l'image a de la transparence
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        let hasTransparency = false;
        
        // Vérifier le canal alpha
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] < 255) {
            hasTransparency = true;
            break;
          }
        }

        if (hasTransparency) {
          // Garder PNG pour préserver la transparence
          const optimized = canvas.toDataURL('image/png');
          resolve({ data: optimized, format: 'PNG' });
        } else {
          // Utiliser JPEG pour les images sans transparence (plus léger)
          const optimized = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ data: optimized, format: 'JPEG' });
        }
      } else {
        resolve({ data: base64, format: 'PNG' });
      }
    };
    img.onerror = () => resolve({ data: base64, format: 'PNG' });
    img.src = base64;
  });
};

const generatePDFInternal = async (proforma: Proforma, company: CompanyInfo): Promise<jsPDF> => {
  // 0. Calculate Height
  const estimatedTableHeight = (proforma.items.length * 10) + 10; 
  const extraSpace = (company.signature || company.stamp) ? 40 : 10;
  const servicesHeight = company.services ? 15 : 0;
  const requiredHeight = 85 + estimatedTableHeight + 30 + extraSpace + servicesHeight + 20;
  const finalPageHeight = Math.max(150, requiredHeight);

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [210, finalPageHeight]
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const MARGIN = 20;

  // 1. Watermark (Centered vertically and horizontally)
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.02 }));
  doc.setFontSize(80);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  // Centrer verticalement en utilisant la moitié de la hauteur de la page
  const watermarkY = pageHeight / 2;
  doc.text(company.watermark || proforma.type || 'PROFORMA', pageWidth / 2, watermarkY, {
    align: 'center',
    baseline: 'middle',
    angle: -45
  });
  doc.restoreGraphicsState();

  // 2. Logo Header
  const logoWidth = company.logoWidth || 15;
  const logoHeight = company.logoHeight || 15;
  const logoX = MARGIN;
  const logoY = MARGIN;

  if (company.logo) {
    try {
      // Optimiser l'image avant de l'ajouter
      const optimizedLogo = await optimizeImage(company.logo, 400);
      doc.addImage(optimizedLogo.data, optimizedLogo.format, logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    } catch (e) {
      // Fallback if image fails to load
      doc.setFillColor(10, 31, 44); // #0a1f2c
      doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name.charAt(0).toUpperCase(), logoX + (logoWidth/2), logoY + (logoHeight/2) + 5, { align: 'center' });
    }
  } else {
    doc.setFillColor(10, 31, 44); // #0a1f2c
    doc.roundedRect(logoX, logoY, logoWidth, logoHeight, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name.charAt(0).toUpperCase(), logoX + (logoWidth/2), logoY + (logoHeight/2) + 5, { align: 'center' });
  }

  // 3. Header - Aligner le texte avec le haut du logo
  const textX = logoX + logoWidth + 5;
  doc.setTextColor(10, 31, 44); // #0a1f2c
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  // Positionner le texte au même niveau que le haut du logo (baseline du texte)
  doc.text(company.name.toUpperCase(), textX, logoY + 4);
  
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

  // Type de document (PROFORMA/FACTURE) - aligné avec le haut du logo et très gras
  doc.setTextColor(10, 31, 44); // #0a1f2c
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  // Rendre le texte plus épais en utilisant lineWidth
  doc.setLineWidth(0.3);
  doc.text(proforma.type || 'PROFORMA', pageWidth - MARGIN, logoY + 7, { 
    align: 'right',
    renderingMode: 'fillThenStroke'
  });

  // Informations légales sous PROFORMA
  if (company.siret || company.siren || company.rcs) {
    let legalY = logoY + 14;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(10, 31, 44, 0.3);
    doc.setLineWidth(0.1);
    
    if (company.siret) {
      doc.text(`SIRET: ${company.siret}`, pageWidth - MARGIN, legalY, { align: 'right' });
      legalY += 3;
    }
    if (company.siren) {
      doc.text(`SIREN: ${company.siren}`, pageWidth - MARGIN, legalY, { align: 'right' });
      legalY += 3;
    }
    if (company.rcs) {
      doc.text(company.rcs, pageWidth - MARGIN, legalY, { align: 'right' });
    }
  }

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

  // Signature and Stamp
  if (company.signature || company.stamp) {
    currentY += 6; // Réduit de 12 à 6 pour moins d'espace en haut
    const stampWidth = company.stampWidth || 35;
    const stampHeight = company.stampHeight || 25;
    const signatureWidth = company.signatureWidth || 35;
    const signatureHeight = company.signatureHeight || 25;
    
    if (company.stamp) {
      try {
        const optimizedStamp = await optimizeImage(company.stamp, 400);
        doc.addImage(optimizedStamp.data, optimizedStamp.format, pageWidth - MARGIN - stampWidth - signatureWidth - 10, currentY, stampWidth, stampHeight, undefined, 'FAST');
      } catch (e) {
        console.error('Error adding stamp to PDF:', e);
      }
    }
    
    if (company.signature) {
      try {
        const optimizedSignature = await optimizeImage(company.signature, 400);
        doc.addImage(optimizedSignature.data, optimizedSignature.format, pageWidth - MARGIN - signatureWidth, currentY, signatureWidth, signatureHeight, undefined, 'FAST');
      } catch (e) {
        console.error('Error adding signature to PDF:', e);
      }
    }
    
    // Utiliser la plus grande hauteur pour l'espacement
    const maxHeight = Math.max(stampHeight, signatureHeight);
    currentY += maxHeight;
  }

  // 8. Legal Note / Services
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 160, 160);
  
  if (company.services) {
    const services = company.services.split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    
    // Draw horizontal line before services - Réduit l'espacement
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, currentY + 8, pageWidth - MARGIN, currentY + 8); // Réduit de 15 à 8

    const servicesText = services.join('    |    ');
    
    doc.text(servicesText.toUpperCase(), pageWidth / 2, currentY + 14, { // Réduit de 22 à 14
      align: 'center',
      maxWidth: pageWidth - (MARGIN * 2)
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.text('Offre valable pendant 30 jours à compter de la date d\'émission.', pageWidth / 2, currentY + 14, { align: 'center' }); // Réduit de 22 à 14
  }

  return doc;
};

export const getPDFBlob = async (proforma: Proforma, company: CompanyInfo): Promise<Blob> => {
  const doc = await generatePDFInternal(proforma, company);
  return doc.output('blob');
};

export const generatePDF = async (proforma: Proforma, company: CompanyInfo) => {
  const doc = await generatePDFInternal(proforma, company);
  doc.save(`${(proforma.type || 'PROFORMA').toLowerCase()}-${proforma.number}.pdf`);
};
