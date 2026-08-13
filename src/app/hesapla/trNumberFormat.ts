/**
 * Ham bir metni (rakam disi karakterler dahil) Turkce binlik ayiracli
 * gorunuma cevirir ("12000" -> "12.000"). Idempotent: zaten formatli bir
 * girdi (kendi eski cikisi) tekrar verilirse ayni sonucu uretir — bu, bir
 * `<input onChange>` handler'inda dogrudan `e.target.value`e uygulanabilir
 * olmasi icin sart (kullanici her tus vurusunda hem eski ayiraclari hem
 * yeni rakami birlikte gonderir).
 */
export function formatTRThousands(raw: string): string {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) return '';
    return Number(digitsOnly).toLocaleString('tr-TR');
}

/**
 * Salt-okunur bir TL tutarini binlik ayirac + iki ondalik + "₺" sembolu ile
 * gosterir ("2352000" -> "2.352.000,00 ₺"). Yalnizca GORUNTU icin — bu
 * bicimdeki bir metin geri parse edilmeye calisilmamali (bkz.
 * `formatTRThousands`, giris alanlari icin ayri tutulur).
 */
export function formatTRCurrency(n: number): string {
    return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}
