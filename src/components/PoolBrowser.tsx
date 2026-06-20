import { useMemo, useState } from "react"
import { cardsById } from "../app/gameStore"
import type { PlayerCard } from "../data/schema"
import { type DraftState, getOpenSlots } from "../domain/draft"
import type { FantasyDraftState } from "../domain/fantasyDraft"
import { useI18n } from "../i18n"

type PoolBrowserProps = {
  readonly draft: FantasyDraftState
  readonly userSquad: DraftState
  readonly onClose: () => void
}

type PlayerGroup = {
  readonly playerId: string
  readonly best: PlayerCard
  readonly seasons: readonly PlayerCard[]
}

/**
 * 남아있는 선수 풀을 내 빈 자리 포지션별로 보여준다. 같은 선수의 여러 시즌 카드는
 * 한 줄로 묶고, 이름을 누르면 연도별 카드(능력치/등급)가 펼쳐진다.
 */
export function PoolBrowser({ draft, userSquad, onClose }: PoolBrowserProps) {
  const { t } = useI18n()
  const openPositions = useMemo(() => {
    const positions = getOpenSlots(userSquad).flatMap((slot) => slot.acceptedPositions)
    return Array.from(new Set(positions))
  }, [userSquad])

  const [position, setPosition] = useState<string>(openPositions[0] ?? "GK")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | undefined>(undefined)

  const available = useMemo(
    () =>
      draft.availableCardIds.flatMap((id) => {
        const card = cardsById.get(id)
        return card === undefined ? [] : [card]
      }),
    [draft.availableCardIds],
  )

  const normalized = search.trim().toLowerCase()
  const searching = normalized !== ""

  // 카드들을 선수(playerId)별로 묶는다.
  const groups = useMemo<readonly PlayerGroup[]>(() => {
    const map = new Map<string, PlayerCard[]>()
    for (const card of available) {
      const inPosition = searching || card.positions.includes(position)
      const matchesSearch =
        !searching ||
        card.label.toLowerCase().includes(normalized) ||
        card.country.toLowerCase().includes(normalized)
      if (!inPosition || !matchesSearch) {
        continue
      }
      const bucket = map.get(card.playerId) ?? []
      bucket.push(card)
      map.set(card.playerId, bucket)
    }
    return Array.from(map.values())
      .map((cards) => {
        const best = cards.reduce((top, card) => (card.cost > top.cost ? card : top))
        const seasons = [...cards].sort((left, right) => (left.year ?? 0) - (right.year ?? 0))
        return { playerId: best.playerId, best, seasons }
      })
      .sort((left, right) => right.best.cost - left.best.cost)
  }, [available, position, searching, normalized])

  const uniqueCount = useMemo(
    () => new Set(available.map((card) => card.playerId)).size,
    [available],
  )
  const countByPosition = (pos: string): number =>
    new Set(available.filter((card) => card.positions.includes(pos)).map((card) => card.playerId))
      .size

  return (
    <div
      className="pitch-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose()
        }
      }}
      role="presentation"
    >
      <div className="pitch-modal pool-modal">
        <button className="pitch-modal-close" onClick={onClose} type="button">
          {t("common.close")}
        </button>
        <h3 className="pool-modal-title">
          {t("pool.title")}{" "}
          <span className="candidate-count">{t("pool.count", { count: uniqueCount })}</span>
        </h3>
        <p className="pool-modal-hint">{t("pool.hint")}</p>

        <div className="pool-tabs">
          {openPositions.map((pos) => (
            <button
              aria-selected={position === pos}
              className="pool-tab"
              key={pos}
              onClick={() => setPosition(pos)}
              type="button"
            >
              {pos} <span className="pool-tab-count">{countByPosition(pos)}</span>
            </button>
          ))}
        </div>

        <input
          aria-label={t("pool.search")}
          className="pool-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("pool.search")}
          value={search}
        />

        <ul className="pool-browser-list">
          {groups.map((group) => (
            <PoolPlayerRow
              expanded={expanded === group.playerId}
              group={group}
              key={group.playerId}
              onToggle={() =>
                setExpanded((current) => (current === group.playerId ? undefined : group.playerId))
              }
            />
          ))}
          {groups.length === 0 ? <li className="pick-log-empty">{t("pool.empty")}</li> : null}
        </ul>
      </div>
    </div>
  )
}

function PoolPlayerRow({
  group,
  expanded,
  onToggle,
}: {
  readonly group: PlayerGroup
  readonly expanded: boolean
  readonly onToggle: () => void
}) {
  const { best, seasons } = group
  const multi = seasons.length > 1
  return (
    <li className="pool-player">
      <button className="pool-player-head" onClick={onToggle} type="button">
        <span className={`rarity-dot rarity-${best.rarity.toLowerCase()}`} />
        <span className="pool-browser-name">{best.label}</span>
        <span className="pool-browser-meta">
          {best.positions.join("/")} · {best.country}
        </span>
        {multi ? <span className="pool-player-seasons">{seasons.length}시즌</span> : null}
        <span className="pool-browser-cost">{best.cost}</span>
        <span className="pool-player-caret" data-open={expanded ? "true" : undefined}>
          ›
        </span>
      </button>
      {expanded ? (
        <ul className="pool-seasons">
          {seasons.map((card) => (
            <li className="pool-season-row" key={card.id}>
              <span className="pool-season-year">{card.year ?? "—"}</span>
              <span className="pool-season-club">{card.club ?? ""}</span>
              <span className="pool-season-cost" data-rarity={card.rarity.toLowerCase()}>
                {card.cost}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
