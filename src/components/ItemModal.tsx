/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, Layers, AlertCircle } from 'lucide-react';
import { ProformaItem } from '../types';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ProformaItem, 'id'>, editId?: string) => void;
  editingItem?: ProformaItem | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem
}) => {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setDescription(editingItem.description);
        setQuantity(editingItem.quantity || 1);
        setUnitPrice(editingItem.unitPrice ? editingItem.unitPrice.toString() : '');
      } else {
        setDescription('');
        setQuantity(1);
        setUnitPrice('');
      }
      setError(null);
      // Autofocus
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const parsedPrice = parseFloat(unitPrice) || 0;
  const lineTotal = quantity * parsedPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Veuillez saisir une description pour la prestation ou l\'article.');
      return;
    }
    if (quantity < 1) {
      setError('La quantité doit être d\'au moins 1.');
      return;
    }
    if (parsedPrice < 0) {
      setError('Le prix unitaire ne peut pas être négatif.');
      return;
    }

    onSave({
      description: description.trim(),
      quantity,
      unitPrice: parsedPrice
    }, editingItem ? editingItem.id : undefined);

    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6 font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 flex flex-col animate-scale-in border border-border overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shadow-xs">
              <Layers size={17} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {editingItem ? 'Modifier la prestation' : 'Ajouter une prestation'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {editingItem ? 'Mettez à jour les détails de la ligne' : 'Complétez les informations de l\'article ou service'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Description de la prestation / article *
            </label>
            <input 
              ref={inputRef}
              type="text"
              placeholder="Ex: Conception logo & charte graphique..."
              value={description}
              onChange={e => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-secondary/15 focus:border-secondary outline-none transition-all text-xs font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Quantité et Prix unitaire */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quantité */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Quantité *
              </label>
              <div className="flex items-center border border-border rounded-xl bg-slate-50/70 focus-within:bg-white focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="px-3 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold text-sm cursor-pointer select-none"
                >
                  -
                </button>
                <input 
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full py-2 text-center text-xs font-mono font-bold outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-bold text-sm cursor-pointer select-none"
                >
                  +
                </button>
              </div>
            </div>

            {/* Prix unitaire */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Prix unitaire *
              </label>
              <div className="flex items-center border border-border rounded-xl bg-slate-50/70 focus-within:bg-white focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/15 overflow-hidden transition-all">
                <input 
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="0"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 text-right text-xs font-mono font-bold outline-none bg-transparent"
                />
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-2 border-l border-border shrink-0 select-none">
                  FCFA
                </span>
              </div>
            </div>
          </div>

          {/* Carte Récapitulative du Total de la Ligne */}
          <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Montant total pour cette ligne</span>
            <span className="font-mono font-black text-sm text-slate-900">
              {lineTotal.toLocaleString()} <span className="text-[10px] text-slate-500 font-bold">F CFA</span>
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              {editingItem ? <Check size={15} /> : <Plus size={15} />}
              <span>{editingItem ? 'Mettre à jour la ligne' : 'Ajouter au document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemModal;
