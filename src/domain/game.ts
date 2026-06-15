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
    managerName: "Vito Marchetti",
    clubName: "FC Ironwall",
    color: "#1f3a5f",
    philosophy: "Defense wins titles. Concede nothing and you cannot lose.",
    tactic: "로우블록",
    preferredFormations: ["5-3-2", "4-1-4-1"],
    axisWeights: { defense: 1.6, physical: 1.3, mental: 1.2 },
    starHunger: 0.4,
  },
  {
    id: "tikitaka",
    managerName: "Joan Vidal",
    clubName: "Tiki-Taka United",
    color: "#7a1f3d",
    philosophy: "A team that owns the ball fears nothing.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-2-3-1"],
    axisWeights: { control: 1.6, creation: 1.4, progression: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "gegen",
    managerName: "Ralf Schneider",
    clubName: "Gegenpress 09",
    color: "#b3541e",
    philosophy: "The best playmaker is a relentless press.",
    tactic: "강한 압박",
    preferredFormations: ["4-2-3-1", "4-4-2"],
    axisWeights: { mobility: 1.5, physical: 1.3, mental: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "counter",
    managerName: "Diego Fuente",
    clubName: "Counter Attack FC",
    color: "#2e6b34",
    philosophy: "Space is our weapon — three passes to goal.",
    tactic: "역습",
    preferredFormations: ["4-4-2", "3-5-2"],
    axisWeights: { mobility: 1.5, progression: 1.4, scoring: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "galactico",
    managerName: "Floren Perez",
    clubName: "Galaxy Stars",
    color: "#5b2c83",
    philosophy: "Only the brightest stars. Names win matches.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-3-1-2"],
    axisWeights: { scoring: 1.2, creation: 1.2 },
    starHunger: 1.0,
  },
  {
    id: "balance",
    managerName: "Markus Lind",
    clubName: "All-Round City",
    color: "#1d6f6b",
    philosophy: "A team with no weakness rules the long season.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-4-2"],
    axisWeights: {},
    starHunger: 0.6,
  },
  {
    id: "aerial",
    managerName: "Tony McBride",
    clubName: "Aerial Kings",
    color: "#8c2f2f",
    philosophy: "Crosses and set pieces — the sky is ours.",
    tactic: "역습",
    preferredFormations: ["4-4-2", "5-3-2"],
    axisWeights: { physical: 1.6, scoring: 1.2, defense: 1.1 },
    starHunger: 0.4,
  },
  {
    id: "totaal",
    managerName: "Rinus de Jong",
    clubName: "Totaal AFC",
    color: "#3d5a80",
    philosophy: "Everyone attacks, everyone defends.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "3-4-3"],
    axisWeights: { control: 1.4, progression: 1.4, mobility: 1.2 },
    starHunger: 0.6,
  },
  {
    id: "wingplay",
    managerName: "Kevin O'Reilly",
    clubName: "Wingers FC",
    color: "#9c6644",
    philosophy: "Break the flanks and the game is won.",
    tactic: "역습",
    preferredFormations: ["3-4-3", "4-3-3"],
    axisWeights: { mobility: 1.6, creation: 1.3 },
    starHunger: 0.5,
  },
  {
    id: "midblock",
    managerName: "Stefan Cole",
    clubName: "Midblock SC",
    color: "#6a4c93",
    philosophy: "Lock the middle and wait for mistakes.",
    tactic: "로우블록",
    preferredFormations: ["4-1-4-1", "4-4-2"],
    axisWeights: { control: 1.3, defense: 1.3, mental: 1.2 },
    starHunger: 0.45,
  },
  {
    id: "direct",
    managerName: "Greg Thompson",
    clubName: "Direct Rovers",
    color: "#1b998b",
    philosophy: "The fastest route is a straight line.",
    tactic: "역습",
    preferredFormations: ["4-4-2", "4-2-3-1"],
    axisWeights: { physical: 1.4, scoring: 1.3, mobility: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "fullback",
    managerName: "Andrea Conti",
    clubName: "Overlap Calcio",
    color: "#c1121f",
    philosophy: "Full-backs are wingers — storm the flanks.",
    tactic: "점유율",
    preferredFormations: ["3-5-2", "4-3-3"],
    axisWeights: { mobility: 1.4, progression: 1.3, control: 1.1 },
    starHunger: 0.55,
  },
  {
    id: "press-high",
    managerName: "Jurgen Bachmann",
    clubName: "High Press BV",
    color: "#386641",
    philosophy: "Win the ball in their half.",
    tactic: "강한 압박",
    preferredFormations: ["4-3-3", "4-2-3-1"],
    axisWeights: { mobility: 1.5, mental: 1.3, control: 1.2 },
    starHunger: 0.55,
  },
  {
    id: "playmaker",
    managerName: "Fabio Ricci",
    clubName: "Regista FC",
    color: "#5e548e",
    philosophy: "One genius dictates the game.",
    tactic: "점유율",
    preferredFormations: ["4-3-1-2", "4-2-3-1"],
    axisWeights: { creation: 1.6, control: 1.3 },
    starHunger: 0.7,
  },
  {
    id: "pragmatic",
    managerName: "Jose Morales",
    clubName: "Pragma United",
    color: "#bc6c25",
    philosophy: "Every match is won a different way.",
    tactic: "역습",
    preferredFormations: ["4-2-3-1", "4-4-2"],
    axisWeights: { mental: 1.3, defense: 1.2 },
    starHunger: 0.6,
  },
  {
    id: "iron",
    managerName: "Viktor Novak",
    clubName: "Iron Gate",
    color: "#2b2d42",
    philosophy: "An iron defense stops any attack.",
    tactic: "로우블록",
    preferredFormations: ["5-3-2", "4-1-4-1"],
    axisWeights: { defense: 1.7, physical: 1.3 },
    starHunger: 0.4,
  },
  {
    id: "academy",
    managerName: "Mateo Santos",
    clubName: "Cantera FC",
    color: "#780000",
    philosophy: "Skill and smarts beat strength.",
    tactic: "점유율",
    preferredFormations: ["4-3-3", "4-3-1-2"],
    axisWeights: { control: 1.4, creation: 1.3, progression: 1.2 },
    starHunger: 0.5,
  },
  {
    id: "transition",
    managerName: "Niko Petrov",
    clubName: "Transition SK",
    color: "#4a4e69",
    philosophy: "Defense to attack in five seconds.",
    tactic: "강한 압박",
    preferredFormations: ["4-2-3-1", "3-4-3"],
    axisWeights: { mobility: 1.5, progression: 1.3, physical: 1.1 },
    starHunger: 0.5,
  },
  {
    id: "tempo",
    managerName: "Luca Bianchi",
    clubName: "Tempo Metropolitan",
    color: "#005f73",
    philosophy: "We set the tempo of the game.",
    tactic: "점유율",
    preferredFormations: ["4-2-3-1", "4-3-3"],
    axisWeights: { control: 1.4, mental: 1.2, creation: 1.2 },
    starHunger: 0.6,
  },
] as const

export function createUserClub(name: string, formation: FormationType, tactic: TacticType): Club {
  return {
    id: USER_CLUB_ID,
    name: name.trim() === "" ? "My Eleven" : name.trim(),
    managerName: "Me",
    color: "#10201b",
    philosophy: "Chase the title with eleven legends you drafted yourself.",
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
