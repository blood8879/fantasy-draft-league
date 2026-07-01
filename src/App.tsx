import { useEffect, useReducer, useState } from "react"
import type { AdProvider } from "./ads"
import { AdsProvider } from "./ads/useAds"
import { todayDailySeed } from "./app/dailySeed"
import {
  type GameState,
  gameReducer,
  initialGameState,
  loadSavedGame,
  saveGame,
} from "./app/gameStore"
import { AppShell } from "./components/AppShell"
import { ChampionScreen } from "./components/ChampionScreen"
import { DraftRoom } from "./components/DraftRoom"
import { HomeScreen } from "./components/HomeScreen"
import { MatchReport } from "./components/MatchReport"
import { SeasonScreen } from "./components/SeasonScreen"
import { getCurrentClubId } from "./domain/fantasyDraft"
import { USER_CLUB_ID } from "./domain/game"
import { I18nProvider } from "./i18n"
import type { Locale } from "./i18n"

const AI_PICK_DELAY_MS = 240

export function App({
  adProvider,
  initialLocale,
}: {
  readonly adProvider?: AdProvider
  readonly initialLocale?: Locale | undefined
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <AdsProvider provider={adProvider}>
        <GameApp />
      </AdsProvider>
    </I18nProvider>
  )
}

function GameApp() {
  const [savedGame, setSavedGame] = useState<GameState | undefined>(() => loadSavedGame())
  const [state, dispatch] = useReducer(gameReducer, initialGameState)

  useEffect(() => {
    saveGame(state)
  }, [state])

  const phase = state.phase
  const draft = state.draft

  useEffect(() => {
    if (phase !== "draft" || draft === undefined) {
      return undefined
    }
    const currentClubId = getCurrentClubId(draft)
    if (currentClubId === undefined || currentClubId === USER_CLUB_ID) {
      return undefined
    }
    const timer = setTimeout(() => dispatch({ type: "AI_PICK_STEP" }), AI_PICK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [phase, draft])

  return (
    <AppShell phase={state.phase}>
      {state.phase === "home" ? (
        <HomeScreen
          hasSave={savedGame !== undefined}
          onResume={() => {
            if (savedGame !== undefined) {
              dispatch({ type: "RESUME_GAME", saved: savedGame })
              setSavedGame(undefined)
            }
          }}
          onStart={(mode, clubName, formation, tactic) => {
            setSavedGame(undefined)
            dispatch({
              type: "START_GAME",
              mode,
              clubName,
              formation,
              tactic,
              seed: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
            })
          }}
          onStartDaily={(clubName, formation, tactic) => {
            setSavedGame(undefined)
            dispatch({
              type: "START_GAME",
              mode: "컵",
              clubName,
              formation,
              tactic,
              seed: todayDailySeed(),
              isDaily: true,
            })
          }}
        />
      ) : null}
      {state.phase === "draft" ? <DraftRoom dispatch={dispatch} state={state} /> : null}
      {state.phase === "season" ? <SeasonScreen dispatch={dispatch} state={state} /> : null}
      {state.phase === "report" ? <MatchReport dispatch={dispatch} state={state} /> : null}
      {state.phase === "champion" ? <ChampionScreen dispatch={dispatch} state={state} /> : null}
    </AppShell>
  )
}
