import type { PlayerCard, Rarity } from "../data/schema"
import type { DraftState } from "../domain/draft"
import { formationRows } from "../domain/formations"
import type { Club } from "../domain/game"
import type { TeamProfile } from "../simulation/types"

const BAR_AXES = [
  "attack",
  "chanceCreation",
  "midfieldControl",
  "pressResistance",
  "transition",
  "defensiveStability",
  "chemistry",
] as const

export type ShareCardInput = {
  readonly club: Club
  readonly squad: DraftState
  readonly cards: ReadonlyMap<string, PlayerCard>
  readonly profile: TeamProfile
  /** 큰 강조 문구(예: "우승", "2위"). */
  readonly badge: string
  /** 한 줄 설명(현지화된 결과 요약). */
  readonly subtitle: string
  /** 리그 기록 줄(승/무/패·득실). 컵이면 undefined. */
  readonly statsLine: string | undefined
  /** 현지화된 업적 이름(상위 몇 개). */
  readonly achievements: readonly string[]
  readonly avgOvr: number
  readonly labels: {
    readonly brand: string
    readonly ovr: string
    readonly chem: string
    readonly cta: string
    readonly url: string
    readonly axes: Readonly<Record<(typeof BAR_AXES)[number], string>>
  }
}

const SCALE = 2
const W = 760
const H = 1340

const DISP = "'Anton', sans-serif"
const BODY = "'Archivo', sans-serif"

function rarityColor(rarity: Rarity): string {
  switch (rarity) {
    case "Legend":
      return "#ffce3a"
    case "Epic":
      return "#bb7cff"
    case "Rare":
      return "#56c7ff"
    default:
      return "#9fb2a6"
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }
  let result = text
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value))
}

/** 시즌 결과(베스트 XI + 성적 + 업적 + 능력치)를 SNS 공유용 PNG 카드로 그린다. */
export async function buildShareCardBlob(input: ShareCardInput): Promise<Blob | null> {
  const canvas = document.createElement("canvas")
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext("2d")
  if (ctx === null) {
    return null
  }
  ctx.scale(SCALE, SCALE)

  // Anton/Archivo 웹폰트를 캔버스에서 쓰려면 먼저 로드돼 있어야 한다.
  if (typeof document.fonts?.load === "function") {
    try {
      await Promise.all([
        document.fonts.load("400 50px Anton"),
        document.fonts.load("700 16px Archivo"),
      ])
    } catch {
      // 폰트 로드 실패 시 시스템 폰트로 폴백
    }
  }

  // 배경(다크 피치) + 피치 라인 텍스처
  const bg = ctx.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, H * 1.1)
  bg.addColorStop(0, "#0f2618")
  bg.addColorStop(0.42, "#0b1c14")
  bg.addColorStop(1, "#081310")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = "rgba(205,242,74,0.035)"
  ctx.lineWidth = 1
  for (let lineY = 46; lineY < H; lineY += 46) {
    ctx.beginPath()
    ctx.moveTo(0, lineY)
    ctx.lineTo(W, lineY)
    ctx.stroke()
  }

  // 헤더
  ctx.textAlign = "left"
  ctx.fillStyle = "#cdf24a"
  ctx.font = `700 20px ${BODY}`
  ctx.fillText(input.labels.brand, 48, 54)

  ctx.fillStyle = "#ecfff2"
  ctx.font = `400 52px ${DISP}`
  ctx.fillText(input.badge, 48, 122)

  ctx.fillStyle = "#cdf24a"
  ctx.font = `400 30px ${DISP}`
  ctx.fillText(truncate(ctx, input.club.name, W - 96), 48, 160)

  ctx.fillStyle = "#7c9d88"
  ctx.font = `400 17px ${BODY}`
  ctx.fillText(truncate(ctx, input.subtitle, W - 96), 48, 188)

  if (input.statsLine !== undefined) {
    ctx.fillStyle = "#9fb8a6"
    ctx.font = `600 15px ${BODY}`
    ctx.fillText(truncate(ctx, input.statsLine, W - 96), 48, 214)
  }

  // 업적 칩
  let chipX = 48
  const chipY = 234
  ctx.font = `700 14px ${BODY}`
  for (const name of input.achievements.slice(0, 3)) {
    const textW = ctx.measureText(name).width
    const chipW = textW + 26
    if (chipX + chipW > W - 48) {
      break
    }
    roundRect(ctx, chipX, chipY, chipW, 28, 14)
    ctx.fillStyle = "rgba(205,242,74,0.16)"
    ctx.fill()
    ctx.strokeStyle = "rgba(205,242,74,0.5)"
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = "#cdf24a"
    ctx.textAlign = "left"
    ctx.fillText(name, chipX + 13, chipY + 19)
    chipX += chipW + 8
  }

  // 피치
  const px = 48
  const py = 278
  const pw = W - 96
  const ph = 560
  roundRect(ctx, px, py, pw, ph, 18)
  ctx.fillStyle = "#143324"
  ctx.fill()
  ctx.strokeStyle = "rgba(205,242,74,0.16)"
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.strokeStyle = "rgba(205,242,74,0.18)"
  ctx.beginPath()
  ctx.moveTo(px, py + ph / 2)
  ctx.lineTo(px + pw, py + ph / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(px + pw / 2, py + ph / 2, 46, 0, Math.PI * 2)
  ctx.stroke()

  const rows = formationRows[input.squad.formation]
  const pickBySlot = new Map(input.squad.picks.map((pick) => [pick.slotId, pick.cardId]))
  const padY = 60
  rows.forEach((row, rowIndex) => {
    const y = py + padY + ((rowIndex + 0.5) * (ph - 2 * padY)) / rows.length
    row.forEach((slotId, colIndex) => {
      const x = px + ((colIndex + 0.5) * pw) / row.length
      const cardId = pickBySlot.get(slotId)
      const card = cardId === undefined ? undefined : input.cards.get(cardId)
      ctx.beginPath()
      ctx.arc(x, y, 25, 0, Math.PI * 2)
      ctx.fillStyle = card === undefined ? "rgba(255,255,255,0.08)" : rarityColor(card.rarity)
      ctx.fill()
      if (card !== undefined) {
        ctx.fillStyle = "#0a140d"
        ctx.font = `400 22px ${DISP}`
        ctx.textAlign = "center"
        ctx.fillText(String(card.cost), x, y + 8)
      }
      ctx.fillStyle = card === undefined ? "rgba(236,255,242,0.4)" : "#ecfff2"
      ctx.font = `600 13px ${BODY}`
      ctx.textAlign = "center"
      ctx.fillText(truncate(ctx, card?.label ?? "—", row.length <= 3 ? 190 : 150), x, y + 44)
    })
  })

  // 능력치 막대
  const barTop = py + ph + 38
  const barLabelW = 124
  const valueW = 34
  const trackX = px + barLabelW
  const trackW = W - 48 - valueW - trackX
  const rowH = 28
  BAR_AXES.forEach((axis, index) => {
    const value = input.profile[axis] as number
    const y = barTop + index * rowH
    ctx.textAlign = "left"
    ctx.fillStyle = "rgba(236,255,242,0.8)"
    ctx.font = `600 14px ${BODY}`
    ctx.fillText(input.labels.axes[axis], px, y + 4)
    roundRect(ctx, trackX, y - 8, trackW, 10, 5)
    ctx.fillStyle = "rgba(255,255,255,0.08)"
    ctx.fill()
    const fillW = (trackW * clampPct(value)) / 100
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(trackX, 0, trackX + fillW, 0)
      grad.addColorStop(0, "#cdf24a")
      grad.addColorStop(1, "#e6ff74")
      roundRect(ctx, trackX, y - 8, fillW, 10, 5)
      ctx.fillStyle = grad
      ctx.fill()
    }
    ctx.textAlign = "right"
    ctx.fillStyle = "#cdf24a"
    ctx.font = `400 17px ${DISP}`
    ctx.fillText(String(Math.round(value)), W - 48, y + 5)
  })

  // 푸터
  const fy = barTop + BAR_AXES.length * rowH + 32
  ctx.textAlign = "left"
  ctx.fillStyle = "#cdf24a"
  ctx.font = `400 38px ${DISP}`
  ctx.fillText(String(input.avgOvr), 48, fy)
  ctx.fillStyle = "rgba(124,157,136,1)"
  ctx.font = `500 14px ${BODY}`
  ctx.fillText(input.labels.ovr, 48, fy + 21)

  ctx.textAlign = "right"
  ctx.fillStyle = "#ecfff2"
  ctx.font = `700 18px ${BODY}`
  ctx.fillText(input.labels.cta, W - 48, fy - 4)
  ctx.fillStyle = "#cdf24a"
  ctx.font = `600 16px ${BODY}`
  ctx.fillText(input.labels.url, W - 48, fy + 20)

  return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"))
}
