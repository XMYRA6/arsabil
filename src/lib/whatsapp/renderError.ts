const HELP = 'Merhaba! Bir arsanın değerini öğrenmek için konumu ve ada/parsel numarasını yaz. Örnek: `Trabzon Ortahisar Uğurlu 123/45`'

export const renderError = {
  help: () => HELP,
  textOnly: () => 'Şimdilik sadece yazılı mesaj anlayabiliyorum. ' + HELP,
  rateLimited: () => 'Çok fazla sorgu geldi, 1 dakika sonra tekrar dener misin?',
}
