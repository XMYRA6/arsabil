export interface WhatsappConfig {
  verifyToken: string
  appSecret: string
  accessToken: string
  phoneNumberId: string
  graphVersion: string
}

export function readWhatsappConfig(env: NodeJS.ProcessEnv = process.env): WhatsappConfig {
  const need = (k: string): string => {
    const v = env[k]
    if (!v) throw new Error(`WhatsApp config eksik: ${k}`)
    return v
  }
  return {
    verifyToken: need('WHATSAPP_VERIFY_TOKEN'),
    appSecret: need('WHATSAPP_APP_SECRET'),
    accessToken: need('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: need('WHATSAPP_PHONE_NUMBER_ID'),
    graphVersion: env.WHATSAPP_GRAPH_VERSION || 'v21.0',
  }
}
