import { Film } from "lucide-react"
import { useMemo, useState } from "react"
import { useAds } from "../ads/useAds"
import { type GameAction, type GameState, cardsById, draftPool } from "../app/gameStore"
import { modeLabel } from "../components/labels"
import { positionOvr } from "../data/cardFactory"
import type { PlayerCard } from "../data/schema"
import { getOpenSlots, getSlotsForFormation } from "../domain/draft"
import {
  SQUAD_SIZE,
  drawCandidates,
  getCurrentClubId,
  getCurrentRound,
  getTotalPicks,
  getUpcomingClubIds,
  hasPickFrom,
  isFantasyDraftComplete,
} from "../domain/fantasyDraft"
import { USER_CLUB_ID } from "../domain/game"
import { type I18nValue, useI18n } from "../i18n"
import { averageProfiles, createTeamProfile } from "../simulation/teamProfile"
import { ChemistryBadges } from "./ChemistryBadges"
import { PoolBrowser } from "./PoolBrowser"
import { RadarChart } from "./RadarChart"
import { RewardedAdButton } from "./RewardedAdButton"
import { SquadPitch } from "./SquadPitch"
import { TeamStatBars } from "./TeamStatBars"

type DraftRoomProps = {
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

/** 리롤 시 보상 광고가 뜰 확률(나머지는 광고 없이 즉시 리롤). */
const REROLL_AD_CHANCE = 0.25

export function DraftRoom({ state, dispatch }: DraftRoomProps) {
  const { t } = useI18n()
  const { showRewarded, pendingAction } = useAds()
  const [scoutClubId, setScoutClubId] = useState<string | undefined>(undefined)
  const [poolOpen, setPoolOpen] = useState(false)
  const [pitchOpen, setPitchOpen] = useState(false)
  const [strengthOpen, setStrengthOpen] = useState(false)

  // 리롤은 매번이 아니라 일정 확률로만 보상 광고를 띄운다(나머지는 광고 없이 즉시 리롤).
  async function handleReroll() {
    if (Math.random() < REROLL_AD_CHANCE) {
      const outcome = await showRewarded("reroll_candidates")
      if (outcome.rewarded) {
        dispatch({ type: "REROLL_CANDIDATES" })
      }
      return
    }
    dispatch({ type: "REROLL_CANDIDATES" })
  }

  // 우리 팀 능력치 + 리그 평균(픽이 있는 전 구단). 픽마다 draft가 갱신되어 자동 재계산된다.
  const teamView = useMemo(() => {
    const currentDraft = state.draft
    const club = state.clubs.find((candidate) => candidate.isUser)
    const squad = currentDraft?.squads[USER_CLUB_ID]
    if (currentDraft === undefined || club === undefined || squad === undefined) {
      return undefined
    }
    const myProfile = createTeamProfile(squad, draftPool, club.tactic)
    const profiles = state.clubs.flatMap((candidate) => {
      const candidateSquad = currentDraft.squads[candidate.id]
      if (candidateSquad === undefined || candidateSquad.picks.length === 0) {
        return []
      }
      return [createTeamProfile(candidateSquad, draftPool, candidate.tactic)]
    })
    return { myProfile, leagueAvg: averageProfiles(profiles) }
  }, [state.draft, state.clubs])

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
  // 내 빈 자리가 받을 수 있는 포지션(후보 카드의 멀티포지션 선택지에 쓰임)
  const openPositions = Array.from(
    new Set(getOpenSlots(userSquad).flatMap((slot) => slot.acceptedPositions)),
  )

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
  const teamOvr =
    userSquad.picks.length > 0
      ? Math.round(
          userSquad.picks.reduce((sum, pick) => sum + (cardsById.get(pick.cardId)?.cost ?? 0), 0) /
            userSquad.picks.length,
        )
      : 0

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
                    <button
                      className="rewarded-ad-button"
                      disabled={pendingAction !== undefined}
                      onClick={handleReroll}
                      type="button"
                    >
                      <Film aria-hidden="true" size={15} />
                      <span>
                        {pendingAction === "reroll_candidates"
                          ? t("ad.playing")
                          : t("draft.reroll")}
                      </span>
                    </button>
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
                        onPick={(position) =>
                          dispatch({ type: "USER_PICK", cardId: card.id, position })
                        }
                        positions={card.positions.filter((pos) => openPositions.includes(pos))}
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

      {teamView !== undefined ? (
        <div className="draft-bottom-bar">
          <div className="dbb-top">
            <span className="dbb-power">
              {t("draft.teamPower")} <strong>{teamOvr}</strong>
            </span>
            <div className="dbb-actions">
              <button className="dbb-link" onClick={() => setPitchOpen(true)} type="button">
                {t("draft.viewFormation")} ›
              </button>
              <button className="dbb-link" onClick={() => setStrengthOpen(true)} type="button">
                {t("draft.viewStrength")} ›
              </button>
            </div>
          </div>
          <div className="dbb-bars">
            {(
              [
                ["ATK", "attack"],
                ["MID", "midfieldControl"],
                ["DEF", "defensiveStability"],
              ] as const
            ).map(([label, key]) => {
              const val = teamView.myProfile[key] as number
              return (
                <div className="dbb-bar" key={key}>
                  <div className="dbb-bar-head">
                    <span>{label}</span>
                    <span>{Math.round(val)}</span>
                  </div>
                  <div className="dbb-bar-track">
                    <div
                      className="dbb-bar-fill"
                      style={{ width: `${Math.max(0, Math.min(100, val))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {pitchOpen ? (
        <div
          className="pitch-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPitchOpen(false)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setPitchOpen(false)
            }
          }}
          role="presentation"
        >
          <div className="pitch-modal">
            <button className="pitch-modal-close" onClick={() => setPitchOpen(false)} type="button">
              {t("common.close")}
            </button>
            <SquadPitch club={userClub} squad={userSquad} />
          </div>
        </div>
      ) : null}

      {strengthOpen && teamView !== undefined ? (
        <div
          className="pitch-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setStrengthOpen(false)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setStrengthOpen(false)
            }
          }}
          role="presentation"
        >
          <div className="pitch-modal">
            <button
              className="pitch-modal-close"
              onClick={() => setStrengthOpen(false)}
              type="button"
            >
              {t("common.close")}
            </button>
            <div className="team-strength">
              <h3 className="team-strength-title">{t("radar.title")}</h3>
              <RadarChart average={teamView.leagueAvg} team={teamView.myProfile} />
              <div className="radar-legend">
                <span className="radar-legend-item radar-legend-item--team">{t("radar.you")}</span>
                <span className="radar-legend-item radar-legend-item--avg">
                  {t("radar.leagueAvg")}
                </span>
              </div>
              <TeamStatBars average={teamView.leagueAvg} team={teamView.myProfile} />
              <ChemistryBadges
                links={teamView.myProfile.chemistryLinks}
                score={teamView.myProfile.chemistry}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function CandidateCard({
  card,
  positions,
  onPick,
  t,
}: {
  readonly card: PlayerCard
  readonly positions: readonly string[]
  readonly onPick: (position: string) => void
  readonly t: I18nValue["t"]
}) {
  // 멀티포지션: 내 빈 자리에 들어갈 수 있는 포지션이 여러 개면 각각 선택할 수 있게 한다.
  const choices = positions.length > 0 ? positions : card.positions
  return (
    <div className="candidate-card" data-rarity={card.rarity.toLowerCase()}>
      <span aria-hidden="true" className="cc-overlay" />
      <span aria-hidden="true" className="cc-shine" />
      <div className="cc-top">
        <div className="cc-ovr-box">
          <div className="cc-ovr">{card.cost}</div>
          <div className="cc-group">{positionGroup(card.positions)}</div>
        </div>
        <div className="cc-top-right">
          <div className="cc-rarity">{card.rarity}</div>
          <div className="cc-country">{card.country}</div>
        </div>
      </div>
      <div className="cc-foot">
        <div className="cc-name">{card.label}</div>
        <div className="cc-pos">
          {card.positions.join("/")}
          {card.year != null ? <span className="cc-year">{card.year}</span> : null}
        </div>
        <div className="cc-ctas">
          {choices.map((pos) => (
            <button className="cc-cta" key={pos} onClick={() => onPick(pos)} type="button">
              <span className="cc-cta-label">{t("draft.pickTo", { slot: pos })}</span>
              <span className="cc-cta-ovr">{positionOvr(card.internalScores, pos)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 포지션 약어를 피치 그룹(GK/DEF/MID/FWD)으로 묶는다. */
function positionGroup(positions: readonly string[]): string {
  const p = positions[0] ?? ""
  if (p === "GK") {
    return "GK"
  }
  if (["CB", "RB", "LB", "RWB", "LWB"].includes(p)) {
    return "DEF"
  }
  if (["DM", "CM", "AM", "RM", "LM"].includes(p)) {
    return "MID"
  }
  return "FWD"
}
