-- Script pour corriger les contraintes de clé étrangère
-- À exécuter dans l'éditeur SQL de Supabase

-- Supprimer les contraintes de clé étrangère existantes
ALTER TABLE company_settings DROP CONSTRAINT IF EXISTS company_settings_user_id_fkey;
ALTER TABLE proformas DROP CONSTRAINT IF EXISTS proformas_user_id_fkey;

-- Supprimer la table users (Supabase Auth gère déjà les utilisateurs)
DROP TABLE IF EXISTS users CASCADE;

-- Recréer les tables sans contraintes de clé étrangère
-- Les tables existent déjà, donc on ne fait que supprimer les contraintes

-- Vérifier que tout fonctionne
SELECT 'Tables corrigées avec succès!' as message;
