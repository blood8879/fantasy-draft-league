import type { RatingAxis } from "../data/schema"
import type { FormationType, TacticType } from "./types"

export const gameModes = ["리그", "컵"] as const
export type GameMode = (typeof gameModes)[number]

export type ManagerPersona = {
  readonly id: string
  readonly managerName: string
  readonly clubName: string
  readonly color: string
  readonly philosophy: string
  readonly tactic: TacticType
  readonly preferredFormations: readonly FormationType[]
  readonly axisWeights: Readonly<Partial<Record<RatingAxis, number>>>
  readonly starHunger: number
}

export type Club = {
  readonly id: string
  readonly name: string
  readonly managerName: string
  readonly color: string
  readonly philosophy: string
  readonly isUser: boolean
  readonly tactic: TacticType
  readonly formation: FormationType
}

export const USER_CLUB_ID = "user"

export const aiPersonas: readonly ManagerPersona[] = [
  {
    id: "catenaccio",
    managerName: "비토 마르케티",
    clubName: "FC 철벽",
    color: "#1f3a5f",
    philosophy: "수비가 우승을 만든다. 실점하지 않으면 지지 않는다.",
    tactic: "로우블록",
    preferredFormations: ["5-3-2", "4-1-4-1"],
    axisWeights: { defense: 1.6, physical: 1.3, mental: 1.2 },
    starHunger: 0.4,
  },
  {
    id: "tikitaka",
    managerName: "조안 비달",
    clubName: "티키타카 유나이티드",
    color: "#7a1f3d",
    philosophy: "공을 소유한 팀은 두려울 것이 없다.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-2-3-1"],
    axisWeights: { control: 1.6, creation: 1.4, progression: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "gegen",
    managerName: "랄프 슈나이더",
    clubName: "게겐프레스 09",
    color: "#b3541e",
    philosophy: "최고의 플레이메이커는 강한 압박이다.",
    tactic: "강한 압박",
    preferredFormations: ["4-2-3-1", "4-4-2"],
    axisWeights: { mobility: 1.5, physical: 1.3, mental: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "counter",
    managerName: "디에고 푸엔테",
    clubName: "카운터 어택 FC",
    color: "#2e6b34",
    philosophy: "공간은 우리의 무기다. 세 번의 패스로 골문 앞까지.",
    tactic: "역습",
    preferredFormations: ["4-4-2", "3-5-2"],
    axisWeights: { mobility: 1.5, progression: 1.4, scoring: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "galactico",
    managerName: "플로렌 페레스",
    clubName: "갤럭시 스타즈",
    color: "#5b2c83",
    philosophy: "가장 빛나는 별만 모은다. 이름값이 곧 전력이다.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-3-1-2"],
    axisWeights: { scoring: 1.2, creation: 1.2 },
    starHunger: 1.0,
  },
  {
    id: "balance",
    managerName: "마르쿠스 린드",
    clubName: "올라운드 시티",
    color: "#1d6f6b",
    philosophy: "약점 없는 팀이 긴 시즌을 지배한다.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-4-2"],
    axisWeights: {},
    starHunger: 0.6,
  },
  {
    id: "aerial",
    managerName: "토니 맥브라이드",
    clubName: "에어리얼 킹스",
    color: "#8c2f2f",
    philosophy: "공중볼과 세트피스, 하늘은 우리 편이다.",
    tactic: "역습",
    preferredFormations: ["4-4-2", "5-3-2"],
    axisWeights: { physical: 1.6, scoring: 1.2, defense: 1.1 },
    starHunger: 0.4,
  },
  {
    id: "totaal",
    managerName: "리누스 더 종",
    clubName: "토탈풋볼 AFC",
    color: "#3d5a80",
    philosophy: "모두가 공격하고 모두가 수비한다.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "3-4-3"],
    axisWeights: { control: 1.4, progression: 1.4, mobility: 1.2 },
    starHunger: 0.6,
  },
  {
    id: "wingplay",
    managerName: "케빈 오라일리",
    clubName: "윙어스 FC",
    color: "#9c6644",
    philosophy: "측면을 무너뜨리면 경기는 끝난다.",
    tactic: "역습",
    preferredFormations: ["3-4-3", "4-3-3"],
    axisWeights: { mobility: 1.6, creation: 1.3 },
    starHunger: 0.5,
  },
  {
    id: "midblock",
    managerName: "스테판 콜",
    clubName: "미드블록 SC",
    color: "#6a4c93",
    philosophy: "중원을 닫고 실수를 기다린다.",
    tactic: "로우블록",
    preferredFormations: ["4-1-4-1", "4-4-2"],
    axisWeights: { control: 1.3, defense: 1.3, mental: 1.2 },
    starHunger: 0.45,
  },
  {
    id: "direct",
    managerName: "그렉 톰슨",
    clubName: "다이렉트 로버스",
    color: "#1b998b",
    philosophy: "가장 빠른 길은 직선이다.",
    tactic: "역습",
    preferredFormations: ["4-4-2", "4-2-3-1"],
    axisWeights: { physical: 1.4, scoring: 1.3, mobility: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "fullback",
    managerName: "안드레아 콘티",
    clubName: "오버랩 칼초",
    color: "#c1121f",
    philosophy: "풀백이 곧 윙어다. 측면을 폭주하라.",
    tactic: "점유율",
    preferredFormations: ["3-5-2", "4-3-3"],
    axisWeights: { mobility: 1.4, progression: 1.3, control: 1.1 },
    starHunger: 0.55,
  },
  {
    id: "press-high",
    managerName: "유르겐 바흐만",
    clubName: "하이프레스 BV",
    color: "#386641",
    philosophy: "상대 진영에서 공을 빼앗아라.",
    tactic: "강한 압박",
    preferredFormations: ["4-3-3", "4-2-3-1"],
    axisWeights: { mobility: 1.5, mental: 1.3, control: 1.2 },
    starHunger: 0.55,
  },
  {
    id: "playmaker",
    managerName: "파비오 리치",
    clubName: "레지스타 FC",
    color: "#5e548e",
    philosophy: "한 명의 천재가 경기를 지휘한다.",
    tactic: "점유율",
    preferredFormations: ["4-3-1-2", "4-2-3-1"],
    axisWeights: { creation: 1.6, control: 1.3 },
    starHunger: 0.7,
  },
  {
    id: "pragmatic",
    managerName: "호세 모랄레스",
    clubName: "프라그마 유나이티드",
    color: "#bc6c25",
    philosophy: "이기는 방법은 경기마다 다르다.",
    tactic: "역습",
    preferredFormations: ["4-2-3-1", "4-4-2"],
    axisWeights: { mental: 1.3, defense: 1.2 },
    starHunger: 0.6,
  },
  {
    id: "iron",
    managerName: "빅토르 노박",
    clubName: "아이언 게이트",
    color: "#2b2d42",
    philosophy: "철의 수비는 어떤 공격도 막는다.",
    tactic: "로우블록",
    preferredFormations: ["5-3-2", "4-1-4-1"],
    axisWeights: { defense: 1.7, physical: 1.3 },
    starHunger: 0.4,
  },
  {
    id: "academy",
    managerName: "마테오 산토스",
    clubName: "칸테라 FC",
    color: "#780000",
    philosophy: "기술과 영리함이 힘을 이긴다.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-3-1-2"],
    axisWeights: { control: 1.4, creation: 1.3, progression: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "transition",
    managerName: "니코 페트로프",
    clubName: "트랜지션 SK",
    color: "#4a4e69",
    philosophy: "수비에서 공격으로 5초 안에.",
    tactic: "강한 압박",
    preferredFormations: ["4-2-3-1", "3-4-3"],
    axisWeights: { mobility: 1.5, progression: 1.3, physical: 1.1 },
    starHunger: 0.5,
  },
  {
    id: "tempo",
    managerName: "루카 비안키",
    clubName: "템포 메트로폴리탄",
    color: "#005f73",
    philosophy: "경기의 속도를 우리가 정한다.",
    tactic: "점유율",
    preferredFormations: ["4-2-3-1", "4-3-3"],
    axisWeights: { control: 1.4, mental: 1.2, creation: 1.2 },
    starHunger: 0.6,
  },
] as const

export function createUserClub(name: string, formation: FormationType, tactic: TacticType): Club {
  return {
    id: USER_CLUB_ID,
    name: name.trim() === "" ? "마이 일레븐" : name.trim(),
    managerName: "나",
    color: "#10201b",
    philosophy: "직접 뽑은 레전드 11인으로 우승에 도전한다.",
    isUser: true,
    tactic,
    formation,
  }
}

export function createAiClub(persona: ManagerPersona, formation: FormationType): Club {
  return {
    id: persona.id,
    name: persona.clubName,
    managerName: persona.managerName,
    color: persona.color,
    philosophy: persona.philosophy,
    isUser: false,
    tactic: persona.tactic,
    formation,
  }
}
