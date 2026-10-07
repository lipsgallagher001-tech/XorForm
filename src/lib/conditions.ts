/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessType } from '../types';

export interface ConditionItem {
  bold: string;
  rest: string;
}

/**
 * Retourne les 4 conditions générales adaptées au type de document et à l'activité sélectionnée.
 */
export const getConditions = (
  docType: 'PROFORMA' | 'FACTURE',
  businessType: BusinessType = 'GRAPHISME'
): ConditionItem[] => {
  if (businessType === 'PRINT') {
    return docType === 'PROFORMA'
      ? [
          { bold: 'BAT Obligatoire', rest: 'validation formelle du Bon À Tirer requise avant mise sous presse.' },
          { bold: 'Délais de tirage', rest: 'effectifs dès validation du BAT et encaissement de l\'acompte.' },
          { bold: 'Tolérance chromie', rest: 'légères variations possibles selon le support et normes CMJN.' },
          { bold: 'Annulation impossible', rest: 'aucun remboursement après engagement du tirage ou du papier.' },
        ]
      : [
          { bold: 'Facture acquittée', rest: 'solde exigible avant remise des imprimés ou à la livraison.' },
          { bold: 'Conformité BAT', rest: 'tirage strictement conforme au BAT — aucun recours après validation.' },
          { bold: 'Contrôle réception', rest: 'vérification des quantités et finitions dès la livraison.' },
          { bold: 'Garantie tirage', rest: 'réimpression assurée uniquement en cas d\'anomalie d\'atelier avérée.' },
        ];
  }

  if (businessType === 'WEB') {
    return docType === 'PROFORMA'
      ? [
          { bold: 'Acompte 50%', rest: 'exigé au lancement du projet — solde à la livraison ou mise en ligne.' },
          { bold: 'Cahier des charges', rest: 'périmètre fixe — toute demande d\'ajout fera l\'objet d\'un avenant.' },
          { bold: 'Délais conditionnés', rest: 'par la transmission des contenus et accès par le client.' },
          { bold: 'Garantie recette', rest: '30 jours de garantie corrective offerts après la mise en ligne.' },
        ]
      : [
          { bold: 'Facture acquittée', rest: 'solde à régler avant remise officielle ou mise en production.' },
          { bold: 'Accès & Propriété', rest: 'cession des droits et accès effectifs après encaissement intégral.' },
          { bold: 'Garantie 30 jours', rest: 'assistance corrective offerte sur les anomalies constatées.' },
          { bold: 'Maintenance & Web', rest: 'renouvellements annuels et maintenance selon contrat dédié.' },
        ];
  }

  // GRAPHISME (par défaut)
  return docType === 'PROFORMA'
    ? [
        { bold: '70% d\'acompte', rest: 'exigé avant le début des travaux — solde à la livraison.' },
        { bold: '2 retouches incluses', rest: '— toute modification supplémentaire sera facturée.' },
        { bold: 'Délais démarrent', rest: 'à réception de l\'acompte et des éléments fournis par le client.' },
        { bold: 'En cas d\'annulation', rest: 'après démarrage, l\'acompte versé reste définitivement acquis.' },
      ]
    : [
        { bold: 'Facture acquittée', rest: 'ou solde à régler selon les modalités convenues.' },
        { bold: '2 retouches incluses', rest: '— toute modification supplémentaire sera facturée.' },
        { bold: 'Livraison finale', rest: 'réception et validation des livrables selon le devis.' },
        { bold: 'Garantie & Support', rest: 'conformité et assistance technique sur les travaux livrés.' },
      ];
};

/**
 * Titre de l'encadré des conditions selon l'activité
 */
export const getConditionsTitle = (businessType: BusinessType = 'GRAPHISME'): string => {
  switch (businessType) {
    case 'PRINT':
      return 'Conditions Générales · Impression & Tirage';
    case 'WEB':
      return 'Conditions Générales · Prestations Web & Digital';
    case 'GRAPHISME':
    default:
      return 'Conditions Générales · Conception Graphique';
  }
};

/**
 * Libellé court du mode
 */
export const getBusinessTypeLabel = (businessType: BusinessType = 'GRAPHISME'): string => {
  switch (businessType) {
    case 'PRINT':
      return 'Impression & Tirage';
    case 'WEB':
      return 'Web & Digital';
    case 'GRAPHISME':
    default:
      return 'Graphisme & Design';
  }
};

/**
 * Taux d'acompte recommandé (en %)
 */
export const getAcompteRate = (businessType: BusinessType = 'GRAPHISME'): number => {
  return businessType === 'WEB' ? 50 : 70;
};
