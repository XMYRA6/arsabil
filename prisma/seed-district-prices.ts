import { PrismaClient } from '@prisma/client';
import { ILCE_FIYATLARI } from '../src/lib/districtPrices/data';
import { dogrulaIlceFiyatlari } from '../src/lib/districtPrices/validate';

const prisma = new PrismaClient();

async function main() {
  const hatalar = dogrulaIlceFiyatlari(ILCE_FIYATLARI);
  if (hatalar.length > 0) {
    // HICBIR SEY YAZMADAN cik: yarim yazilmis fiyat tablosu, hic
    // yazilmamisindan kotudur.
    console.error(`❌ Veri dosyasinda ${hatalar.length} sorun bulundu, hicbir kayit yazilmadi:`);
    for (const h of hatalar) console.error(`   [${h.indeks}] ${h.mesaj}`);
    process.exitCode = 1;
    return;
  }

  if (ILCE_FIYATLARI.length === 0) {
    console.log('ℹ️ Veri dosyasi bos, yazilacak kayit yok.');
    return;
  }

  let yazilan = 0;
  for (const k of ILCE_FIYATLARI) {
    // UPSERT + SILME YOK: admin panelinden elle duzeltilmis satirlar
    // korunur; yalnizca veri dosyasindaki ciftler guncellenir.
    await prisma.districtPrice.upsert({
      where: { il_ilce: { il: k.il, ilce: k.ilce } },
      create: k,
      update: {
        avgSalesPricePerM2: k.avgSalesPricePerM2,
        avgUnitConstructionPrice: k.avgUnitConstructionPrice,
      },
    });
    yazilan++;
  }

  const toplam = await prisma.districtPrice.count();
  console.log(`✅ ${yazilan} ilce fiyati yazildi/guncellendi. Tabloda toplam ${toplam} kayit var.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
