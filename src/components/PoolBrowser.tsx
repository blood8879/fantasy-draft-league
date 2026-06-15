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

/**
 * 현재 남아있는(아직 아무도 지명 안 한) 선수 풀을, 내 빈 자리에 들어갈 수 있는 포지션별로
 * 보여준다. 유저가 "이 풀에 원하는 선수가 있는지" 확인하고 리롤 여부를 판단하게 한다.
 */
export function PoolBrowser({ draft, userSquad, onClose }: PoolBrowserProps) {
  const { t } = useI18n()
  const openPositions = useMemo(() => {
    const positions = getOpenSlots(userSquad).flatMap((slot) => slot.acceptedPositions)
    return Array.from(new Set(positions))
  }, [userSquad])

  const [position, setPosition] = useState<string>(openPositions[0] ?? "GK")
  const [search, setSearch] = useState("")

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
  const list = available
    // 검색 중에는 전체 풀에서 찾고, 평소에는 선택한 포지션 탭만 보여준다
    .filter((card) => searching || card.positions.includes(position))
    .filter(
      (card) =>
        !searching ||
        card.label.toLowerCase().includes(normalized) ||
        card.country.toLowerCase().includes(normalized),
    )
    .sort((left, right) => right.cost - left.cost)

  const countByPosition = (pos: string): number =>
    available.filter((card) => card.positions.includes(pos)).length

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
          <span className="candidate-count">{t("pool.count", { count: available.length })}</span>
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
          {list.map((card) => (
            <PoolRow card={card} key={card.id} />
          ))}
          {list.length === 0 ? <li className="pick-log-empty">{t("pool.empty")}</li> : null}
        </ul>
      </div>
    </div>
  )
}

function PoolRow({ card }: { readonly card: PlayerCard }) {
  return (
    <li className="pool-browser-row">
      <span className={`rarity-dot rarity-${card.rarity.toLowerCase()}`} />
      <span className="pool-browser-name">{card.label}</span>
      <span className="pool-browser-meta">
        {card.positions.join("/")} · {card.country}
      </span>
      <span className="pool-browser-cost">{card.cost}</span>
    </li>
  )
}
