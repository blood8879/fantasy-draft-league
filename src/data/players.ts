import { curatedPoolPlayers } from "./curatedPlayerPool"
import type { Player } from "./schema"
import { seasonPlayers } from "./seasonCards"

function wiki(displayName: string, slug: string) {
  return {
    type: "biography",
    label: `${displayName} public career summary`,
    url: `https://en.wikipedia.org/wiki/${slug}`,
  } satisfies Player["sourceRefs"][number]
}

function player(
  id: string,
  displayName: string,
  country: string,
  birthYear: number,
  primaryPositions: readonly string[],
  slug: string,
): Player {
  return {
    id,
    displayName,
    country,
    birthYear,
    primaryPositions,
    publicSourceNotes: ["Public biographical and career facts only"],
    sourceRefs: [wiki(displayName, slug)],
    rightsRiskNotes: [
      "Text-only name usage; no photo, crest, kit, or official competition branding",
    ],
  }
}

const basePlayers = [
  player("lionel_messi", "Lionel Messi", "Argentina", 1987, ["RW", "AM", "ST"], "Lionel_Messi"),
  player(
    "cristiano_ronaldo",
    "Cristiano Ronaldo",
    "Portugal",
    1985,
    ["LW", "ST", "RW"],
    "Cristiano_Ronaldo",
  ),
  player("ronaldo_nazario", "Ronaldo", "Brazil", 1976, ["ST"], "Ronaldo_(Brazilian_footballer)"),
  player("zinedine_zidane", "Zinedine Zidane", "France", 1972, ["AM", "CM"], "Zinedine_Zidane"),
  player("ronaldinho", "Ronaldinho", "Brazil", 1980, ["AM", "LW"], "Ronaldinho"),
  player("thierry_henry", "Thierry Henry", "France", 1977, ["ST", "LW"], "Thierry_Henry"),
  player("xavi", "Xavi", "Spain", 1980, ["CM"], "Xavi"),
  player("andres_iniesta", "Andres Iniesta", "Spain", 1984, ["CM", "AM"], "Andr%C3%A9s_Iniesta"),
  player("andrea_pirlo", "Andrea Pirlo", "Italy", 1979, ["CM", "DM"], "Andrea_Pirlo"),
  player("luka_modric", "Luka Modric", "Croatia", 1985, ["CM"], "Luka_Modri%C4%87"),
  player("patrick_vieira", "Patrick Vieira", "France", 1976, ["CM", "DM"], "Patrick_Vieira"),
  player(
    "claude_makelele",
    "Claude Makelele",
    "France",
    1973,
    ["DM"],
    "Claude_Mak%C3%A9l%C3%A9l%C3%A9",
  ),
  player("paolo_maldini", "Paolo Maldini", "Italy", 1968, ["LB", "CB"], "Paolo_Maldini"),
  player("fabio_cannavaro", "Fabio Cannavaro", "Italy", 1973, ["CB"], "Fabio_Cannavaro"),
  player("cafu", "Cafu", "Brazil", 1970, ["RB"], "Cafu"),
  player("roberto_carlos", "Roberto Carlos", "Brazil", 1973, ["LB"], "Roberto_Carlos"),
  player("sergio_ramos", "Sergio Ramos", "Spain", 1986, ["CB", "RB"], "Sergio_Ramos"),
  player("alessandro_nesta", "Alessandro Nesta", "Italy", 1976, ["CB"], "Alessandro_Nesta"),
  player("carles_puyol", "Carles Puyol", "Spain", 1978, ["CB", "RB"], "Carles_Puyol"),
  player("rio_ferdinand", "Rio Ferdinand", "England", 1978, ["CB"], "Rio_Ferdinand"),
  player("john_terry", "John Terry", "England", 1980, ["CB"], "John_Terry"),
  player("nemanja_vidic", "Nemanja Vidic", "Serbia", 1981, ["CB"], "Nemanja_Vidi%C4%87"),
  player("thiago_silva", "Thiago Silva", "Brazil", 1984, ["CB"], "Thiago_Silva"),
  player("virgil_van_dijk", "Virgil van Dijk", "Netherlands", 1991, ["CB"], "Virgil_van_Dijk"),
  player("vincent_kompany", "Vincent Kompany", "Belgium", 1986, ["CB"], "Vincent_Kompany"),
  player("lucio", "Lucio", "Brazil", 1978, ["CB"], "L%C3%BAcio"),
  player("sol_campbell", "Sol Campbell", "England", 1974, ["CB"], "Sol_Campbell"),
  player("philipp_lahm", "Philipp Lahm", "Germany", 1983, ["RB", "LB", "DM"], "Philipp_Lahm"),
  player("dani_alves", "Dani Alves", "Brazil", 1983, ["RB"], "Dani_Alves"),
  player("ashley_cole", "Ashley Cole", "England", 1980, ["LB"], "Ashley_Cole"),
  player(
    "javier_zanetti",
    "Javier Zanetti",
    "Argentina",
    1973,
    ["RB", "LB", "DM"],
    "Javier_Zanetti",
  ),
  player("marcelo", "Marcelo", "Brazil", 1988, ["LB", "LW"], "Marcelo_(footballer,_born_1988)"),
  player(
    "gianluca_zambrotta",
    "Gianluca Zambrotta",
    "Italy",
    1977,
    ["LB", "RB"],
    "Gianluca_Zambrotta",
  ),
  player("manuel_neuer", "Manuel Neuer", "Germany", 1986, ["GK"], "Manuel_Neuer"),
  player("gianluigi_buffon", "Gianluigi Buffon", "Italy", 1978, ["GK"], "Gianluigi_Buffon"),
  player("iker_casillas", "Iker Casillas", "Spain", 1981, ["GK"], "Iker_Casillas"),
  player("petr_cech", "Petr Cech", "Czech Republic", 1982, ["GK"], "Petr_%C4%8Cech"),
  player(
    "edwin_van_der_sar",
    "Edwin van der Sar",
    "Netherlands",
    1970,
    ["GK"],
    "Edwin_van_der_Sar",
  ),
  player("dida", "Dida", "Brazil", 1973, ["GK"], "Dida_(footballer,_born_1973)"),
] as const

const basePlayerIds = new Set(basePlayers.map((player) => player.id))

export const players: readonly Player[] = [
  ...basePlayers,
  ...seasonPlayers.filter((player) => !basePlayerIds.has(player.id)),
  ...curatedPoolPlayers,
] as const
