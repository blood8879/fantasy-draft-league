import { useState } from "react"
import { type GameAction, type GameState, cardsById } from "../app/gameStore"
import { modeLabel } from "../components/labels"
import type { PlayerCard } from "../data/schema"
import { getSlotsForFormation } from "../domain/draft"
import {
  SQUAD_SIZE,
  drawCandidates,
  getCurrentClubId,
  getCurrentRound,
  getTotalPicks,
  getUpcomingClubIds,
  hasPickFrom,
  isFantasyDraftComplete,
  placeCardInBestSlot,
} from "../domain/fantasyDraft"
import { USER_CLUB_ID } from "../domain/game"
import { type I18nValue, useI18n } from "../i18n"
import { PoolBrowser } from "./PoolBrowser"
import { RewardedAdButton } from "./RewardedAdButton"
import { SquadPitch } from "./SquadPitch"

type DraftRoomProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

export function DraftRoom({ state, dispatch }: DraftRoomProps) {
  const { t } = useI18n()
  const [scoutClubId, setScoutClubId] = useState<string | undefined>(undefined)
  const [poolOpen, setPoolOpen] = useState(false)
  const draft = state.draft
  if (draft === undefined) {
    return null
  }

  const clubsById = new Map(state.clubs.map((club) => [club.id, club]))
  const userClub = state.clubs.find((club) => club.isUser)
  const userSquad = draft.squads[USER_CLUB_ID]
  if (userClub === undefined || userSquad === undefined) {
    return null
  }

  const complete = isFantasyDraftComplete(draft)
  const currentClubId = getCurrentClubId(draft)
  const currentClub = currentClubId === undefined ? undefined : clubsById.get(currentClubId)
  const isUserTurn = currentClubId === USER_CLUB_ID
  const candidates = isUserTurn
    ? drawCandidates(draft, USER_CLUB_ID, state.rerollNonce, cardsById).flatMap((id) => {
        const card = cardsById.get(id)
        return card === undefined ? [] : [card]
      })
    : []
  // 후보가 하나도 없으면(남은 빈 자리에 맞는 카드가 풀에 소진) 광고 없이 다시 뽑게 한다.
  const candidatesEmpty = isUserTurn && candidates.length === 0

  const currentRound = getCurrentRound(draft)
  const shownRound =
    draft.log.some((entry) => entry.round === currentRound) || currentRound <= 1
      ? currentRound
      : currentRound - 1
  const roundPicks = draft.log.filter((entry) => entry.round === shownRound).reverse()
  const clubCount = state.clubs.length
  const upcoming = getUpcomingClubIds(draft, Math.min(clubCount, 10))

  const scoutClub = scoutClubId === undefined ? undefined : clubsById.get(scoutClubId)
  const scoutSquad = scoutClubId === undefined ? undefined : draft.squads[scoutClubId]

  return (
    <section className="draft-room">
      <header className="draft-room-header">
        <div>
          <p className="eyebrow">{t("draft.eyebrow")}</p>
          <h2>
            {t("draft.round", {
              round: Math.min(getCurrentRound(draft), SQUAD_SIZE),
              size: SQUAD_SIZE,
              pick: Math.min(draft.log.length + 1, getTotalPicks(draft)),
              total: getTotalPicks(draft),
            })}
          </h2>
        </div>
        <div className={isUserTurn ? "turn-banner turn-banner--user" : "turn-banner"}>
          {complete
            ? t("draft.complete")
            : isUserTurn
              ? t("draft.yourTurn")
              : t("draft.aiPicking", { club: currentClub?.name ?? "" })}
        </div>
        <div className="draft-header-actions">
          {!complete && hasPickFrom(draft, USER_CLUB_ID) && isUserTurn ? (
            <RewardedAdButton
              action="undo_pick"
              onReward={() => dispatch({ type: "UNDO_LAST_USER_PICK" })}
            >
              {t("draft.undoPick")}
            </RewardedAdButton>
          ) : null}
          {!complete && !isUserTurn ? (
            <button
              className="ghost-action"
              onClick={() => dispatch({ type: "FAST_FORWARD_PICKS" })}
              type="button"
            >
              {t("draft.fastForward")}
            </button>
          ) : null}
          {complete ? (
            <button
              className="primary-action primary-action--bright"
              onClick={() => dispatch({ type: "START_SEASON" })}
              type="button"
            >
              {state.mode === "리그" ? t("draft.openLeague") : t("draft.openCup")}
            </button>
          ) : null}
        </div>
      </header>

      {!complete ? (
        <ol className="pick-order-strip" aria-label="Pick order">
          {upcoming.map((clubId, index) => {
            const club = clubsById.get(clubId)
            return (
              <li
                className={index === 0 ? "order-chip order-chip--now" : "order-chip"}
                data-user={clubId === USER_CLUB_ID ? "true" : undefined}
                key={`${clubId}-${draft.log.length + index}`}
              >
                {club?.name ?? clubId}
              </li>
            )
          })}
        </ol>
      ) : null}

      <div className="club-scout-strip" aria-label={t("draft.scoutStrip")}>
        <span className="scout-strip-label">{t("draft.scoutStrip")}</span>
        {state.clubs.map((club) => {
          const squad = draft.squads[club.id]
          return (
            <button
              className="scout-chip"
              data-user={club.isUser ? "true" : undefined}
              key={club.id}
              onClick={() => setScoutClubId(club.id)}
              type="button"
            >
              <span className="club-swatch" style={{ background: club.color }} />
              {club.name}
              <span className="scout-chip-count">{squad?.picks.length ?? 0}/11</span>
            </button>
          )
        })}
      </div>

      {poolOpen ? (
        <PoolBrowser draft={draft} onClose={() => setPoolOpen(false)} userSquad={userSquad} />
      ) : null}

      {scoutClub !== undefined && scoutSquad !== undefined ? (
        <div
          className="pitch-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setScoutClubId(undefined)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setScoutClubId(undefined)
            }
          }}
          role="presentation"
        >
          <div className="pitch-modal">
            <button
              className="pitch-modal-close"
              onClick={() => setScoutClubId(undefined)}
              type="button"
            >
              {t("common.close")}
            </button>
            <SquadPitch club={scoutClub} squad={scoutSquad} />
          </div>
        </div>
      ) : null}

      <div className="draft-room-grid">
        <aside className="draft-aside my-squad-panel">
          <SquadPitch club={userClub} squad={userSquad} />
        </aside>

        <div className="draft-right-col">
          <div className="candidate-panel">
            {complete ? (
              <div className="candidate-empty">
                <h3>{t("draft.squadComplete")}</h3>
                <p>{t("draft.squadCompleteBody", { mode: modeLabel(state.mode, t) })}</p>
              </div>
            ) : isUserTurn ? (
              <>
                <div className="candidate-head">
                  <h3>
                    {t("draft.candidates")}{" "}
                    <span className="candidate-count">
                      {t("draft.cards", { count: candidates.length })}
                    </span>
                  </h3>
                  <button className="ghost-action" onClick={() => setPoolOpen(true)} type="button">
                    {t("draft.poolView")}
                  </button>
                  {candidatesEmpty ? (
                    <button
                      className="ghost-action"
                      onClick={() => dispatch({ type: "REROLL_CANDIDATES" })}
                      type="button"
                    >
                      {t("draft.rerollFree")}
                    </button>
                  ) : (
                    <RewardedAdButton
                      action="reroll_candidates"
                      onReward={() => dispatch({ type: "REROLL_CANDIDATES" })}
                    >
                      {t("draft.reroll")}
                    </RewardedAdButton>
                  )}
                </div>
                {state.pickError !== undefined ? (
                  <p className="pick-error" role="alert">
                    {state.pickError}
                  </p>
                ) : null}
                {candidatesEmpty ? (
                  <div className="candidate-empty">
                    <p>{t("draft.candidatesEmpty")}</p>
                  </div>
                ) : (
                  <div className="candidate-grid">
                    {candidates.map((card) => (
                      <CandidateCard
                        card={card}
                        key={card.id}
                        onPick={() => dispatch({ type: "USER_PICK", cardId: card.id })}
                        slotLabel={placeCardInBestSlot(userSquad, card)?.label}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="candidate-empty">
                <h3>{t("draft.aiPicking", { club: currentClub?.name ?? "" })}</h3>
                <p>{t("draft.aiPickingBody")}</p>
              </div>
            )}
          </div>

          <aside className="draft-aside pick-log-panel">
            <h3>
              {t("draft.roundPicks", { round: shownRound })}{" "}
              <span className="candidate-count">{roundPicks.length}/8</span>
            </h3>
            <ul className="pick-log">
              {roundPicks.map((entry) => {
                const club = clubsById.get(entry.clubId)
                const card = cardsById.get(entry.cardId)
                const slot = getSlotsForFormation(
                  draft.squads[entry.clubId]?.formation ?? "4-3-3",
                ).find((candidate) => candidate.id === entry.slotId)
                return (
                  <li
                    data-user={entry.clubId === USER_CLUB_ID ? "true" : undefined}
                    key={entry.overall}
                  >
                    <span className="pick-log-no">{slot?.label ?? "—"}</span>
                    <span className="pick-log-club">{club?.name ?? entry.clubId}</span>
                    <span className="pick-log-player">{card?.label ?? entry.cardId}</span>
                  </li>
                )
              })}
              {roundPicks.length === 0 ? (
                <li className="pick-log-empty">{t("draft.waitingPicks")}</li>
              ) : null}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  )
}

function CandidateCard({
  card,
  onPick,
  slotLabel,
  t,
}: {
  readonly card: PlayerCard
  readonly onPick: () => void
  readonly slotLabel: string | undefined
  readonly t: I18nValue["t"]
}) {
  return (
    <button
      className={`candidate-card rarity-border-${card.rarity.toLowerCase()}`}
      onClick={onPick}
      type="button"
    >
      <div className="candidate-card-top">
        <span className={`rarity-dot rarity-${card.rarity.toLowerCase()}`} />
        <span className="candidate-ovr">{card.cost}</span>
      </div>
      <span className="candidate-name">{card.label}</span>
      <span className="candidate-meta">
        {card.positions.join("/")} · {card.country}
      </span>
      <span className="candidate-pick-cta">
        {slotLabel === undefined ? t("draft.pick") : t("draft.pickTo", { slot: slotLabel })}
      </span>
    </button>
  )
}
