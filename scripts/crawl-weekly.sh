#!/bin/sh
# Haftalik tam tur: 81 il baseline + kalabalik illerde ilce bolme, sonra istatistik toplamalari.
# Kirklareli-Vize PerimeterX nedeniyle kronik engelli; blocked olarak loglanir, tur devam eder.
set -u
export CRAWL_WORKERS="${CRAWL_WORKERS:-1}"
DEEP="ankara,antalya,aydin,balikesir,bilecik,istanbul,adana,bursa,denizli,edirne,eskisehir,kayseri,kocaeli,konya,manisa,mersin,mugla,sakarya,samsun,tekirdag,canakkale"

echo "== baseline (il duzeyi) =="
npm run crawl:all -- --force-all --fast --delay=10-20 --no-breaks || echo "baseline cikis kodu: $?"

echo "== derin tur (ilce bolme) =="
npm run crawl:all -- --only="$DEEP" --force-all --split-districts --fast --delay=10-20 --no-breaks || echo "derin tur cikis kodu: $?"

echo "== istatistikler =="
for s in aggregate-area-prices aggregate-konut-prices aggregate-trend; do
  TS_NODE_PROJECT=crawler/tsconfig.json npx ts-node --transpile-only -r tsconfig-paths/register "scripts/$s.ts" || echo "$s basarisiz"
done
