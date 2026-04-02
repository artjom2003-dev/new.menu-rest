import React from 'react';

export interface DishCardProps {
  id: number;
  name: string;
  description?: string;
  price: number;
  weightGrams?: number;
  photoUrl?: string;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  allergens?: string[];
  isAvailable?: boolean;
  prepTimeMin?: number;
  onAdd?: (id: number) => void;
  compact?: boolean;
  showStopBadge?: boolean;
}

export function DishCard({
  id, name, description, price, weightGrams, photoUrl,
  calories, protein, fat, carbs, allergens,
  isAvailable = true, prepTimeMin, onAdd, compact, showStopBadge,
}: DishCardProps) {
  const unavailable = showStopBadge && !isAvailable;

  return (
    <div className={`relative rounded-2xl border border-[#2A2A4A] bg-[#16213E] overflow-hidden transition-all ${unavailable ? 'opacity-50 grayscale' : 'hover:border-[#E8491D]/40'} ${compact ? 'flex gap-3 p-3' : ''}`}>
      {unavailable && (
        <div className="absolute top-2 right-2 z-10 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
          Стоп
        </div>
      )}

      {/* Photo */}
      {!compact && (
        <div className="h-36 bg-[#0F3460] relative overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🍽️</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#16213E] to-transparent" />
        </div>
      )}

      {compact && photoUrl && (
        <div className="w-16 h-16 rounded-xl bg-[#0F3460] overflow-hidden flex-shrink-0">
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className={compact ? 'flex-1 min-w-0' : 'p-3'}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={`font-semibold text-[#EAEAEA] leading-tight ${compact ? 'text-sm' : 'text-[15px]'}`}>
              {name}
            </h3>
            {description && !compact && (
              <p className="text-xs text-[#A0A0B0] mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          <span className={`font-bold text-[#E8491D] whitespace-nowrap ${compact ? 'text-sm' : 'text-base'}`}>
            {price} ₽
          </span>
        </div>

        {/* КБЖУ */}
        {(calories || protein || fat || carbs) && !compact && (
          <div className="flex gap-2 mt-2">
            {calories && <span className="text-[10px] text-[#6C6C80] bg-[#1E2A47] px-1.5 py-0.5 rounded">{calories} ккал</span>}
            {protein && <span className="text-[10px] text-[#6C6C80] bg-[#1E2A47] px-1.5 py-0.5 rounded">Б {protein}</span>}
            {fat && <span className="text-[10px] text-[#6C6C80] bg-[#1E2A47] px-1.5 py-0.5 rounded">Ж {fat}</span>}
            {carbs && <span className="text-[10px] text-[#6C6C80] bg-[#1E2A47] px-1.5 py-0.5 rounded">У {carbs}</span>}
          </div>
        )}

        {/* Allergens */}
        {allergens && allergens.length > 0 && !compact && (
          <div className="flex gap-1 mt-1.5">
            {allergens.map((a) => (
              <span key={a} className="text-[10px] text-yellow-400/80 bg-yellow-400/10 px-1.5 py-0.5 rounded">⚠ {a}</span>
            ))}
          </div>
        )}

        {/* Bottom row */}
        <div className={`flex items-center justify-between ${compact ? 'mt-1' : 'mt-3'}`}>
          <div className="flex items-center gap-2">
            {weightGrams && <span className="text-[11px] text-[#6C6C80]">{weightGrams} г</span>}
            {prepTimeMin && <span className="text-[11px] text-[#6C6C80]">~{prepTimeMin} мин</span>}
          </div>
          {onAdd && !unavailable && (
            <button
              onClick={() => onAdd(id)}
              className="w-8 h-8 rounded-full bg-[#E8491D] text-white flex items-center justify-center text-lg font-bold hover:bg-[#D43D15] active:scale-90 transition-all"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
