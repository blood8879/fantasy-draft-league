import type { PlayerCard } from "../data/schema"
import type { DraftState } from "../domain/draft"
import { formationRows } from "../domain/formations"
import type { Club } from "../domain/game"

export type ShareCardInput = {
  readonly club: Club
  readonly squad: DraftState
  readonly cards: ReadonlyMap<string, PlayerCard>
  /** 큰 강조 문구(예: "CHAMPIONS", "2nd"). */
  readonly badge: string
  /** 한 줄 설명(현지화된 결과 요약). */
  readonly subtitle: string
  readonly avgOvr: number
  readonly chemistry: number
  readonly labels: {
    readonly brand: string
    readonly ovr: string
    readonly chem: string
    readonly cta: string
    readonly url: string
  }
}

const SCALE = 2
const W = 760
const H = 1180

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

/** 시즌 결과(베스트 XI + 성적)를 SNS 공유용 PNG 카드로 그린다. */
export async function buildShareCardBlob(input: ShareCardInput): Promise<Blob | null> {
  const canvas = document.createElement("canvas")
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext("2d")
  if (ctx === null) {
    return null
  }
  ctx.scale(SCALE, SCALE)

  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, "#13261d")
  bg.addColorStop(1, "#0b1611")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // 헤더
  ctx.textAlign = "left"
  ctx.fillStyle = "#e6ff74"
  ctx.font = "700 21px sans-serif"
  ctx.fillText(input.labels.brand, 48, 58)

  ctx.fillStyle = "#f4f0df"
  ctx.font = "800 52px sans-serif"
  ctx.fillText(input.badge, 48, 124)

  ctx.fillStyle = "#e6ff74"
  ctx.font = "700 30px sans-serif"
  ctx.fillText(truncate(ctx, input.club.name, W - 96), 48, 168)

  ctx.fillStyle = "rgba(244,240,223,0.75)"
  ctx.font = "400 18px sans-serif"
  ctx.fillText(truncate(ctx, input.subtitle, W - 96), 48, 200)

  // 피치
  const px = 48
  const py = 240
  const pw = W - 96
  const ph = 700
  roundRect(ctx, px, py, pw, ph, 22)
  ctx.fillStyle = "#16301f"
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(px, py + ph / 2)
  ctx.lineTo(px + pw, py + ph / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(px + pw / 2, py + ph / 2, 52, 0, Math.PI * 2)
  ctx.stroke()

  // 선수 배치
  const rows = formationRows[input.squad.formation]
  const pickBySlot = new Map(input.squad.picks.map((pick) => [pick.slotId, pick.cardId]))
  const padY = 72
  rows.forEach((row, rowIndex) => {
    const y = py + padY + ((rowIndex + 0.5) * (ph - 2 * padY)) / rows.length
    row.forEach((slotId, colIndex) => {
      const x = px + ((colIndex + 0.5) * pw) / row.length
      const cardId = pickBySlot.get(slotId)
      const card = cardId === undefined ? undefined : input.cards.get(cardId)
      ctx.beginPath()
      ctx.arc(x, y, 26, 0, Math.PI * 2)
      ctx.fillStyle = card === undefined ? "rgba(255,255,255,0.10)" : "#e6ff74"
      ctx.fill()
      if (card !== undefined) {
        ctx.fillStyle = "#10201b"
        ctx.font = "800 20px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(String(card.cost), x, y + 7)
      }
      ctx.fillStyle = card === undefined ? "rgba(244,240,223,0.4)" : "#f4f0df"
      ctx.font = "600 14px sans-serif"
      ctx.textAlign = "center"
      const name = card?.label ?? "—"
      ctx.fillText(truncate(ctx, name, row.length <= 3 ? 190 : 150), x, y + 46)
    })
  })

  // 하단 스탯 + CTA
  const fy = py + ph + 56
  ctx.textAlign = "left"
  ctx.fillStyle = "#e6ff74"
  ctx.font = "800 38px sans-serif"
  ctx.fillText(String(input.avgOvr), 48, fy)
  ctx.fillStyle = "rgba(244,240,223,0.7)"
  ctx.font = "500 15px sans-serif"
  ctx.fillText(input.labels.ovr, 48, fy + 22)

  ctx.fillStyle = "#e6ff74"
  ctx.font = "800 38px sans-serif"
  ctx.fillText(String(input.chemistry), 210, fy)
  ctx.fillStyle = "rgba(244,240,223,0.7)"
  ctx.font = "500 15px sans-serif"
  ctx.fillText(input.labels.chem, 210, fy + 22)

  ctx.textAlign = "right"
  ctx.fillStyle = "#f4f0df"
  ctx.font = "700 18px sans-serif"
  ctx.fillText(input.labels.cta, W - 48, fy - 2)
  ctx.fillStyle = "#e6ff74"
  ctx.font = "600 16px sans-serif"
  ctx.fillText(input.labels.url, W - 48, fy + 22)

  return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"))
}
