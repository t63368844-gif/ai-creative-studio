const LIB_BASE = "https://ai-creative-studio.t63368844.workers.dev";

export type LibItem = { url: string; caption: string; keywords: string[] };

export const LIBRARIES: Record<string, LibItem[]> = {
  vance: [
    { url: LIB_BASE + "/vance/01-chasch-council.png",  caption: "совет часка с хрустальными посохами", keywords: ["часка", "chasch", "совет", "рептил", "посох", "рас"] },
    { url: LIB_BASE + "/vance/02-chasch-guards.png",   caption: "часка-стражи на площади",            keywords: ["часка", "страж", "охран", "площадь"] },
    { url: LIB_BASE + "/vance/03-dirdir-corridor.png", caption: "бледные дирдиры в коридоре",         keywords: ["дирдир", "dirdir", "коридор", "хищник", "бледн", "охот"] },
    { url: LIB_BASE + "/vance/04-pnir-bazaar.png",     caption: "пниры-торговцы на базаре",           keywords: ["пнир", "pnir", "базар", "торг", "весы", "амфиб", "купц"] },
    { url: LIB_BASE + "/vance/05-explorer-landing.png",caption: "звездолёт Explorer на платформе",    keywords: ["корабл", "звездолет", "explorer", "посадк", "челнок", "крушен"] },
    { url: LIB_BASE + "/vance/06-caravan-road.png",    caption: "караванный путь, четыре луны",       keywords: ["караван", "путь", "дорог", "верблюд", "черепах", "лун"] },
    { url: LIB_BASE + "/vance/07-cliff-market.png",    caption: "торг трёх рас на скалах",            keywords: ["рынок", "торг", "скал", "караван", "кристалл"] },
    { url: LIB_BASE + "/vance/08-reith-scouts.png",    caption: "наблюдатели над городом шпилей",     keywords: ["наблюд", "развед", "шпил", "закат", "огляд", "приключ"] },
    { url: LIB_BASE + "/vance/09-reith-companion.png", caption: "человек и бледный спутник",          keywords: ["человек", "спутник", "пришелец", "столиц", "землянин", "приключ"] },
    { url: LIB_BASE + "/vance/10-bridge-city.png",     caption: "город мостов",                       keywords: ["мост", "город", "рек", "башн"] },
    { url: LIB_BASE + "/vance/11-pergolus.png",        caption: "золотой Перголус с водопадами",      keywords: ["дворец", "золот", "водопад", "купол", "пергол"] },
    { url: LIB_BASE + "/vance/12-tschai-canals.png",   caption: "каналы Тшаи, гондолы",               keywords: ["канал", "гондол", "дворец", "вод", "венец"] },
    { url: LIB_BASE + "/vance/13-crashed-ship-market.png", caption: "рынок под рухнувшим звездолётом",keywords: ["крушен", "рухнувш", "рынок", "звездолет", "обломк", "авар"] },
    { url: LIB_BASE + "/vance/14-balcony-airships.png",caption: "терраса с дирижаблями",              keywords: ["террас", "дирижабл", "балкон", "воздух", "полёт"] },
    { url: LIB_BASE + "/vance/15-wankh-palanquin.png", caption: "ванг на паланкине носильщиков",      keywords: ["ванг", "wankh", "паланкин", "носильщ", "жрец", "птиц"] },
    { url: LIB_BASE + "/vance/16-mask-bazaar.png",     caption: "базар ритуальных масок",             keywords: ["маск", "базар", "колонн", "витрин", "ритуал", "культур"] },
  ],
};

export function pickLibraryImages(content: any, name: string): number {
  const lib = LIBRARIES[name];
  if (!lib || !content?.slides) return 0;
  let assigned = 0;
  const used = new Set<string>();
  for (const s of content.slides) {
    const text = String((s.title || "") + " " + (s.bullets || []).join(" ")).toLowerCase();
    let best: LibItem | null = null;
    let bestScore = 0;
    for (const item of lib) {
      if (used.has(item.url)) continue;
      let score = 0;
      for (const w of item.keywords) if (text.includes(w)) score++;
      if (score > bestScore) { bestScore = score; best = item; }
    }
    if (best && bestScore >= 1) { s.imageUrl = best.url; used.add(best.url); assigned++; }
  }
  return assigned;
}
