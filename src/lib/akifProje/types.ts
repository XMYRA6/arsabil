// Akif-5c — Proje Kartı ortak tipleri.

export const FACT_KEYS = [
  'areaSqm',
  'imarDurumu',
  'emsal',
  'katAdedi',
  'taks',
  'hmax',
  'malik',
  'daireFiyati',
] as const
export type FactKey = (typeof FACT_KEYS)[number]

export const FACT_SOURCES = ['tkgm', 'goruntu', 'kullanici', 'ilan'] as const
export type FactSource = (typeof FACT_SOURCES)[number]

// Proje girdileri (revizyon günlüğüne giren alanlar).
export const INPUT_KEYS = [
  'arsaAlani',
  'emsal',
  'arsaSahibiPayiYuzde',
  'daireBuyuklugu',
  'katAdedi',
  'birimMaliyet',
  'kaliteSinifi',
] as const
export type InputKey = (typeof INPUT_KEYS)[number]
export type ProjectInputs = Partial<Record<InputKey, number | string>>

export type Channel = 'whatsapp' | 'web'

export interface ParcelRef {
  il: string
  ilce: string
  mahalle: string
  ada: string
  parsel: string
}

export interface FactInput {
  key: FactKey
  value: unknown
  source: FactSource
}

export interface ProjectParcelInput extends ParcelRef {
  facts?: FactInput[]
}

export interface CreateProjectInput {
  name?: string | null
  parcels: ProjectParcelInput[]
  inputs: ProjectInputs
}

export interface InputChange {
  field: string
  oldValue: unknown
  newValue: unknown
}
