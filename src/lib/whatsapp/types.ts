export type AreaLevel = 'il' | 'ilce' | 'mahalle'

export interface InboundMessage {
  from: string           // sadece rakam, baştaki + yok
  text: string
  messageId: string
  timestamp: number      // saniye
  type: 'text' | 'other'
}

export interface ConvFields {
  ilText?: string; ilId?: number
  ilceText?: string; ilceId?: number
  mahalleText?: string; mahalleId?: number
  ada?: string; parsel?: string
}

export interface AreaOption { id: number; text: string }

export type ResolveResult =
  | { kind: 'resolved'; mahalleId: number; il: string; ilce: string; mahalle: string }
  | { kind: 'ambiguous'; level: AreaLevel; candidates: AreaOption[] }
  | { kind: 'notfound'; level: AreaLevel; term: string }
