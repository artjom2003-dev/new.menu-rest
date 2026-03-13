'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Photo {
  url: string;
  isCover: boolean;
  altText?: string;
}

interface Restaurant {
  name: string;
  cuisines?: Array<{ name: string }>;
  photos?: Array<Photo>;
}

export function RestaurantHero({ restaurant }: { restaurant: Restaurant }) {
  const validPhotos = restaurant.photos?.filter(p => /^https?:\/\//.test(p.url)) || [];
  const cover = validPhotos.find(p => p.isCover) || validPhotos[0];
  const gallery = validPhotos.filter(p => p !== cover).slice(0, 3);
  const [imgError, setImgError] = useState<Set<string>>(new Set());

  if (validPhotos.length === 0) return null;

  const hasError = (url: string) => imgError.has(url);
  const onError = (url: string) => setImgError(prev => new Set(prev).add(url));

  // Single photo layout
  if (gallery.length === 0 && cover) {
    return (
      <div className="max-w-[1400px] mx-auto px-10 pt-8 pb-4">
        <div className="relative h-[360px] rounded-2xl overflow-hidden">
          {!hasError(cover.url) ? (
            <Image
              src={cover.url}
              alt={cover.altText || restaurant.name}
              fill
              className="object-cover"
              priority
              onError={() => onError(cover.url)}
            />
          ) : null}
        </div>
      </div>
    );
  }

  // Multi-photo grid: cover left + up to 3 smaller on the right
  return (
    <div className="max-w-[1400px] mx-auto px-10 pt-8 pb-4">
      <div className="grid grid-cols-3 gap-3 h-[360px]" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Cover */}
        <div className="relative rounded-2xl overflow-hidden">
          {cover && !hasError(cover.url) ? (
            <Image
              src={cover.url}
              alt={cover.altText || restaurant.name}
              fill
              className="object-cover"
              priority
              onError={() => onError(cover.url)}
            />
          ) : null}
        </div>

        {/* Side gallery */}
        <div className="flex flex-col gap-3">
          {gallery.map((photo, i) => (
            <div key={i} className="relative flex-1 rounded-2xl overflow-hidden min-h-0">
              {!hasError(photo.url) ? (
                <Image
                  src={photo.url}
                  alt={photo.altText || `${restaurant.name} ${i + 2}`}
                  fill
                  className="object-cover"
                  onError={() => onError(photo.url)}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
