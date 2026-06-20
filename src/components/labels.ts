import type { Competition } from "../domain/competition"
import type { I18nValue, Locale } from "../i18n"
import type { ChemistryLink } from "../simulation/chemistry"

/** 컵 라운드 이름을 현재 언어로. (결승/준결승/N강) */
export function cupRoundLabel(competition: Competition, round: number, t: I18nValue["t"]): string {
  const teamsInRound = 2 ** (competition.totalRounds - round + 1)
  if (teamsInRound === 2) {
    return t("cup.final")
  }
  if (teamsInRound === 4) {
    return t("cup.semi")
  }
  return t("cup.roundOf", { n: teamsInRound })
}

/** 라운드 표시: 리그는 "N라운드", 컵은 라운드 이름. */
export function roundLabel(competition: Competition, round: number, t: I18nValue["t"]): string {
  return competition.kind === "리그"
    ? t("season.roundN", { n: round })
    : cupRoundLabel(competition, round, t)
}

/** 전술 표시 라벨 */
export function tacticLabel(tactic: string, t: I18nValue["t"]): string {
  return t(`tactic.${tactic}`)
}

/** 대회 모드 표시 라벨 (리그/컵) */
export function modeLabel(mode: string, t: I18nValue["t"]): string {
  return t(`mode.${mode}`)
}

/** 케미 배지 표시 텍스트. 국가·클럽·리그명은 고유명사라 그대로, 라인·라이벌·지역·언더독은 번역. */
export function chemistryLinkText(link: ChemistryLink, t: I18nValue["t"]): string {
  switch (link.kind) {
    case "nation":
    case "club":
    case "league":
    case "era":
      return `${link.label} ×${link.count}`
    case "line":
      return `${t(`chem.line.${link.label}`)} ×${link.count}`
    case "rivalry":
    case "region":
      // label은 i18n 키(예: chem.rival.argEng)
      return `${t(link.label)} ×${link.count}`
    case "underdog":
      return t("chem.underdog")
    default:
      return link.label
  }
}

/** 현재 로케일 기준 순위 서수(1st, 1위, 1位, 1º) */
export function ordinal(rank: number, locale: Locale): string {
  if (locale === "ko") {
    return `${rank}위`
  }
  if (locale === "ja") {
    return `${rank}位`
  }
  if (locale === "es") {
    return `${rank}º`
  }
  const mod100 = rank % 100
  const mod10 = rank % 10
  const suffix =
    mod10 === 1 && mod100 !== 11
      ? "st"
      : mod10 === 2 && mod100 !== 12
        ? "nd"
        : mod10 === 3 && mod100 !== 13
          ? "rd"
          : "th"
  return `${rank}${suffix}`
}
