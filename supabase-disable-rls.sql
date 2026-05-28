-- Script simple pour désactiver RLS temporairement
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE proformas DISABLE ROW LEVEL SECURITY;
