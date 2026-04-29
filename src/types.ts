/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProformaItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
  email: string;
  phone: string;
  logo?: string;
  logoWidth?: number;
  logoHeight?: number;
  signature?: string;
  signatureWidth?: number;
  signatureHeight?: number;
  stamp?: string;
  stampWidth?: number;
  stampHeight?: number;
  services?: string;
  watermark?: string;
  siret?: string;
  siren?: string;
  rcs?: string;
}

export interface ClientInfo {
  name: string;
  phone: string;
  address?: string;
}

export interface Proforma {
  id: string;
  type: 'PROFORMA' | 'FACTURE';
  number: string;
  date: string;
  client: ClientInfo;
  items: ProformaItem[];
  discountPercent?: number;
  total: number;
  notes?: string;
}
