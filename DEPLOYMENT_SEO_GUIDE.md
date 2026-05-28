# 🚀 GUIDE DE DÉPLOIEMENT SEO - XORFORM

## 📋 PRÉ-DÉPLOIEMENT

### Checklist Avant Déploiement

- [ ] Tous les favicons générés
- [ ] Images Open Graph créées
- [ ] robots.txt configuré
- [ ] sitemap.xml créé
- [ ] manifest.json configuré
- [ ] .htaccess prêt (si Apache)
- [ ] Variables d'environnement configurées
- [ ] Build de production testé localement
- [ ] Lighthouse score > 90

---

## 🌐 DÉPLOIEMENT PAR PLATEFORME

### Option 1: Vercel (Recommandé)

**Avantages:**
- ✅ Déploiement automatique depuis Git
- ✅ HTTPS automatique
- ✅ CDN global
- ✅ Optimisations automatiques
- ✅ Gratuit pour projets personnels

**Étapes:**

1. **Installer Vercel CLI**
```bash
npm install -g vercel
```

2. **Configurer vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/robots.txt",
      "dest": "/robots.txt"
    },
    {
      "src": "/sitemap.xml",
      "dest": "/sitemap.xml"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

3. **Déployer**
```bash
# Build local
npm run build

# Déployer
vercel --prod

# Ou connecter à GitHub pour déploiement automatique
vercel link
```

4. **Configurer le domaine personnalisé**
```bash
vercel domains add xorform.com
```

---

### Option 2: Netlify

**Avantages:**
- ✅ Interface intuitive
- ✅ Formulaires intégrés
- ✅ Redirections faciles
- ✅ Split testing A/B

**Étapes:**

1. **Créer netlify.toml**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

2. **Déployer**
```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Déployer
netlify deploy --prod
```

---

### Option 3: GitHub Pages

**Avantages:**
- ✅ Gratuit
- ✅ Intégration GitHub
- ✅ Simple

**Limitations:**
- ⚠️ Pas de redirections serveur
- ⚠️ Pas de headers personnalisés

**Étapes:**

1. **Installer gh-pages**
```bash
npm install -D gh-pages
```

2. **Ajouter dans package.json**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  },
  "homepage": "https://username.github.io/xorform"
}
```

3. **Déployer**
```bash
npm run deploy
```

---

### Option 4: VPS (Apache/Nginx)

**Pour serveur dédié ou VPS**

#### Configuration Apache

**1. Copier les fichiers**
```bash
# Build
npm run build

# Copier vers le serveur
scp -r dist/* user@server:/var/www/xorform/
```

**2. Configuration VirtualHost**
```apache
<VirtualHost *:80>
    ServerName xorform.com
    ServerAlias www.xorform.com
    
    DocumentRoot /var/www/xorform
    
    <Directory /var/www/xorform>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA Routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Logs
    ErrorLog ${APACHE_LOG_DIR}/xorform-error.log
    CustomLog ${APACHE_LOG_DIR}/xorform-access.log combined
</VirtualHost>

# HTTPS (après Let's Encrypt)
<VirtualHost *:443>
    ServerName xorform.com
    ServerAlias www.xorform.com
    
    DocumentRoot /var/www/xorform
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/xorform.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/xorform.com/privkey.pem
    
    # Même configuration que ci-dessus
</VirtualHost>
```

**3. Activer le site**
```bash
sudo a2ensite xorform.conf
sudo systemctl reload apache2
```

#### Configuration Nginx

```nginx
server {
    listen 80;
    server_name xorform.com www.xorform.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name xorform.com www.xorform.com;
    
    root /var/www/xorform;
    index index.html;
    
    # SSL
    ssl_certificate /etc/letsencrypt/live/xorform.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xorform.com/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # robots.txt & sitemap.xml
    location = /robots.txt {
        log_not_found off;
    }
    
    location = /sitemap.xml {
        log_not_found off;
    }
}
```

---

## 🔒 CONFIGURATION HTTPS (Let's Encrypt)

### Installation Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-apache

# Ou pour Nginx
sudo apt install certbot python3-certbot-nginx
```

### Obtenir un certificat

```bash
# Apache
sudo certbot --apache -d xorform.com -d www.xorform.com

# Nginx
sudo certbot --nginx -d xorform.com -d www.xorform.com
```

### Renouvellement automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Cron job (déjà configuré par défaut)
sudo crontab -e
# Ajouter si nécessaire:
0 0 * * * certbot renew --quiet
```

---

## 🔧 CONFIGURATION DNS

### Enregistrements DNS Requis

```
Type    Name    Value                   TTL
A       @       [IP_SERVEUR]            3600
A       www     [IP_SERVEUR]            3600
CNAME   www     xorform.com             3600
TXT     @       "v=spf1 -all"           3600
```

### Pour Vercel/Netlify

```
Type    Name    Value                           TTL
CNAME   @       cname.vercel-dns.com            3600
CNAME   www     cname.vercel-dns.com            3600
```

---

## 📊 POST-DÉPLOIEMENT

### 1. Vérifications Immédiates

```bash
# Tester le site
curl -I https://xorform.com

# Vérifier HTTPS
curl -I https://xorform.com | grep -i "strict-transport-security"

# Tester robots.txt
curl https://xorform.com/robots.txt

# Tester sitemap.xml
curl https://xorform.com/sitemap.xml

# Tester manifest.json
curl https://xorform.com/manifest.json
```

### 2. Tests SEO

- [ ] **Google PageSpeed Insights**
  - https://pagespeed.web.dev/
  - Score mobile > 90
  - Score desktop > 95

- [ ] **Google Mobile-Friendly Test**
  - https://search.google.com/test/mobile-friendly
  - Doit passer tous les tests

- [ ] **Rich Results Test**
  - https://search.google.com/test/rich-results
  - Vérifier le JSON-LD

- [ ] **SSL Labs**
  - https://www.ssllabs.com/ssltest/
  - Note A ou A+

### 3. Configuration Google Search Console

1. **Ajouter la propriété**
   - Aller sur https://search.google.com/search-console
   - Ajouter "xorform.com"

2. **Vérifier la propriété**
   - Méthode recommandée: Balise HTML
   - Ajouter dans `index.html`:
   ```html
   <meta name="google-site-verification" content="VOTRE_CODE" />
   ```

3. **Soumettre le sitemap**
   - Sitemaps → Ajouter un sitemap
   - URL: `https://xorform.com/sitemap.xml`

4. **Demander l'indexation**
   - Inspection d'URL
   - Entrer: `https://xorform.com`
   - Cliquer "Demander l'indexation"

### 4. Configuration Google Analytics

1. **Créer une propriété GA4**
   - https://analytics.google.com
   - Créer une propriété
   - Obtenir l'ID de mesure (G-XXXXXXXXXX)

2. **Ajouter le code de suivi**
   ```html
   <!-- Dans index.html, avant </head> -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

3. **Vérifier l'installation**
   - Aller sur le site
   - Ouvrir GA4 → Rapports → Temps réel
   - Vérifier qu'un utilisateur est détecté

### 5. Soumettre aux Moteurs de Recherche

**Google:**
- Déjà fait via Search Console

**Bing:**
- https://www.bing.com/webmasters
- Importer depuis Google Search Console

**Yandex (optionnel):**
- https://webmaster.yandex.com

---

## 🎯 OPTIMISATIONS POST-DÉPLOIEMENT

### 1. CDN (Content Delivery Network)

**Cloudflare (Gratuit)**
1. Créer un compte sur https://cloudflare.com
2. Ajouter le site
3. Changer les nameservers DNS
4. Activer:
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - HTTP/3
   - Always Use HTTPS

### 2. Monitoring

**Uptime Monitoring:**
- UptimeRobot (gratuit): https://uptimerobot.com
- Pingdom
- StatusCake

**Performance Monitoring:**
- Google Analytics
- Sentry (erreurs)
- LogRocket (session replay)

### 3. Backups

```bash
# Script de backup automatique
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/xorform"

# Backup des fichiers
tar -czf $BACKUP_DIR/xorform_$DATE.tar.gz /var/www/xorform

# Garder seulement les 7 derniers backups
find $BACKUP_DIR -name "xorform_*.tar.gz" -mtime +7 -delete

echo "Backup completed: xorform_$DATE.tar.gz"
```

---

## 📈 SUIVI & ANALYTICS

### KPIs à Surveiller

**Trafic:**
- Visiteurs uniques/jour
- Pages vues
- Taux de rebond
- Durée moyenne de session

**SEO:**
- Position moyenne (Search Console)
- Impressions
- Clics
- CTR (Click-Through Rate)

**Performance:**
- Temps de chargement
- Core Web Vitals (LCP, FID, CLS)
- Taux d'erreur

**Conversions:**
- Inscriptions
- Proformas créés
- PDFs générés

---

## 🚨 TROUBLESHOOTING

### Problème: Site non accessible

```bash
# Vérifier le serveur web
sudo systemctl status apache2
# ou
sudo systemctl status nginx

# Vérifier les logs
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/nginx/error.log
```

### Problème: HTTPS ne fonctionne pas

```bash
# Vérifier le certificat
sudo certbot certificates

# Renouveler manuellement
sudo certbot renew --force-renewal
```

### Problème: Sitemap non indexé

1. Vérifier le format XML
2. Vérifier l'accessibilité (curl)
3. Resoumettre dans Search Console
4. Vérifier robots.txt

### Problème: Images OG ne s'affichent pas

1. Vérifier les URLs dans les meta tags
2. Tester avec Facebook Debugger
3. Forcer le scraping
4. Vérifier les permissions fichiers

---

## ✅ CHECKLIST FINALE

- [ ] Site accessible en HTTPS
- [ ] Redirections HTTP → HTTPS fonctionnelles
- [ ] www → non-www (ou inverse) configuré
- [ ] robots.txt accessible
- [ ] sitemap.xml accessible
- [ ] manifest.json accessible
- [ ] Tous les favicons chargent
- [ ] Images OG valides
- [ ] Google Search Console configuré
- [ ] Sitemap soumis
- [ ] Google Analytics installé
- [ ] Lighthouse score > 90
- [ ] Tests mobile réussis
- [ ] SSL Labs note A+
- [ ] CDN configuré (optionnel)
- [ ] Monitoring activé
- [ ] Backups configurés

---

**Déploiement réussi! 🎉**

**Prochaines étapes:**
1. Surveiller les analytics
2. Optimiser selon les données
3. Créer du contenu SEO
4. Obtenir des backlinks
5. Améliorer continuellement

---

**Dernière mise à jour:** 28 Mai 2026
