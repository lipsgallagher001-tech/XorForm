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
  signature?: string;
  stamp?: string;
  services?: string;
  watermark?: string;
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
