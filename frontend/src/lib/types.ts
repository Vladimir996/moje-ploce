export type Condition = "M" | "NM" | "VG+" | "VG" | "G+" | "G" | "P";
export type Format = "LP" | "EP" | "Singl" | "Dupli LP" | "Box set";
export type Speed = "33" | "45" | "78";

export type Track = {
  position: string;
  title: string;
  duration: string | null;
};

export type VinylRecord = {
  id: number;
  title: string;
  artist: { id: number; name: string };
  releaseYear: number | null;
  label: string | null;
  catalogNumber: string | null;
  country: string | null;
  format: Format;
  speed: Speed;
  mediaCondition: Condition | null;
  sleeveCondition: Condition | null;
  coverUrl: string | null;
  description: string | null;
  genres: string[];
  isFavorite: boolean;
  discogsId: number | null;
  createdAt: string;
  updatedAt: string;
};

// Detalji ploče — privatna polja stižu samo kad je admin prijavljen.
export type VinylRecordDetail = VinylRecord & {
  tracks: Track[];
  notes?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  purchasedFrom?: string | null;
};

export type RecordsPage = {
  items: VinylRecord[];
  total: number;
  page: number;
  pages: number;
};

export type DiscogsSearchResult = {
  id: number;
  artist: string;
  title: string;
  year: number | null;
  country: string | null;
  label: string | null;
  catno: string | null;
  formats: string;
  thumb: string | null;
};

// Podaci izdanja sa Discogs-a, već prevedeni u polja naše forme
export type DiscogsImport = {
  discogsId: number;
  discogsUrl: string;
  existingRecordId: number | null;
  title: string;
  artist: string;
  releaseYear: number | null;
  label: string | null;
  catalogNumber: string | null;
  country: string | null;
  format: Format;
  speed: Speed;
  genres: string[];
  tracks: Track[];
  coverUrl: string | null;
};

export type Artist = { id: number; name: string; recordCount: number };
export type Genre = { id: number; name: string; recordCount: number };

export type Stats = {
  records: number;
  artists: number;
  favorites: number;
  oldestYear: number | null;
  newestYear: number | null;
  lastAddedAt: string | null;
  formats: { format: Format; count: number }[];
  decades: { decade: number; count: number }[];
};
