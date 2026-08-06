/** Shared spring transition for "Canlı Mühür" (Live Seal) stamp/settle moments —
 *  used wherever something stamps into its final confirmed state (a badge reveal,
 *  a wizard step completing). Values follow this project's apple-design skill
 *  guidance: damping ~0.8 / response 0.3-0.4s -> bounce 0.2 / duration 0.35s. */
export const sealTransition = { type: 'spring' as const, duration: 0.35, bounce: 0.2 };
