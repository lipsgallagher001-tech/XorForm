/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  canonical?: string;
}

/**
 * Composant SEO pour gérer dynamiquement les meta tags
 * Utilisation: <SEO title="Ma Page" description="Description" />
 */
export default function SEO({
  title = 'XorForm - Générateur de Proforma et Factures Professionnel',
  description = 'Créez des proformas et factures professionnels en quelques clics. Solution gratuite, intuitive et sécurisée.',
  keywords = 'proforma, facture, devis, générateur facture, PDF',
  ogImage = 'https://xorform.com/og-image.png',
  canonical = 'https://xorform.com/'
}: SEOProps) {
  
  useEffect(() => {
    // Mettre à jour le titre
    document.title = title;
    
    // Mettre à jour ou créer les meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };
    
    // Meta tags standards
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Open Graph
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', canonical, true);
    
    // Twitter
    updateMetaTag('twitter:title', title, true);
    updateMetaTag('twitter:description', description, true);
    updateMetaTag('twitter:image', ogImage, true);
    
    // Canonical
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical);
    
  }, [title, description, keywords, ogImage, canonical]);
  
  return null; // Ce composant ne rend rien visuellement
}
