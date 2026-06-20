import { useState } from "react"
import { type GameMode, gameModes } from "../domain/game"
import { type FormationType, type TacticType, formationTypes, tacticTypes } from "../domain/types"
import { type Locale, localeNames, locales, useI18n } from "../i18n"
import { FormationSelector } from "./FormationSelector"
import { tacticLabel } from "./labels"

type HomeScreenProps = {
  readonly hasSave: boolean
  readonly onResume: () => void
  readonly onStart: (
    mode: GameMode,
    clubName: string,
    formation: FormationType,
    tactic: TacticType,
  ) => void
}

const modeDescriptionKey: Readonly<Record<GameMode, string>> = {
  리그: "home.modeLeagueDesc",
  컵: "home.modeCupDesc",
}

const modeNameKey: Readonly<Record<GameMode, string>> = {
  리그: "home.modeLeague",
  컵: "home.modeCup",
}

export function HomeScreen({ hasSave, onResume, onStart }: HomeScreenProps) {
  const { t, locale, setLocale } = useI18n()
  const [mode, setMode] = useState<GameMode>("리그")
  const [clubName, setClubName] = useState("")
  const [formation, setFormation] = useState<FormationType>("4-3-3")
  const [tactic, setTactic] = useState<TacticType>("점유율")

  return (
    <section className="home-screen screen-in">
      <header className="home-hero">
        <p className="eyebrow home-eyebrow">{t("home.eyebrow")}</p>
        <h1>{t("home.title")}</h1>
        <p className="home-pitch">{t("home.pitch")}</p>
        <div className="home-stats">
          <div className="home-stat">
            <div className="home-stat-value">11R</div>
            <div className="home-stat-label">{t("home.statDraft")}</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">20</div>
            <div className="home-stat-label">{t("home.statTeams")}</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">xG</div>
            <div className="home-stat-label">{t("home.statEngine")}</div>
          </div>
        </div>
      </header>

      <div className="home-setup">
        <fieldset className="setup-field" aria-label={t("common.language")}>
          <span className="setup-label">{t("common.language")}</span>
          <div className="tactic-row">
            {locales.map((candidate: Locale) => (
              <button
                aria-pressed={locale === candidate}
                className="tactic-chip"
                key={candidate}
                onClick={() => setLocale(candidate)}
                type="button"
              >
                {localeNames[candidate]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="setup-field" aria-label={t("home.mode")}>
          <span className="setup-label">{t("home.mode")}</span>
          <div className="mode-grid">
            {gameModes.map((candidate) => (
              <button
                aria-pressed={mode === candidate}
                className="mode-card"
                key={candidate}
                onClick={() => setMode(candidate)}
                type="button"
              >
                <span className="mode-name">{t(modeNameKey[candidate])}</span>
                <span className="mode-desc">{t(modeDescriptionKey[candidate])}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="setup-field" htmlFor="club-name">
          <span className="setup-label">{t("home.clubName")}</span>
          <input
            className="club-name-input"
            id="club-name"
            maxLength={18}
            onChange={(event) => setClubName(event.target.value)}
            placeholder={t("home.clubNamePlaceholder")}
            value={clubName}
          />
        </label>

        <div className="setup-field">
          <span className="setup-label">{t("home.formation")}</span>
          <FormationSelector
            formations={formationTypes}
            onSelectFormation={setFormation}
            selectedFormation={formation}
          />
        </div>

        <fieldset className="setup-field" aria-label={t("home.tactic")}>
          <span className="setup-label">{t("home.tactic")}</span>
          <div className="tactic-row">
            {tacticTypes.map((candidate) => (
              <button
                aria-pressed={tactic === candidate}
                className="tactic-chip"
                key={candidate}
                onClick={() => setTactic(candidate)}
                type="button"
              >
                {tacticLabel(candidate, t)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="setup-actions">
          <button
            className="primary-action primary-action--bright home-start"
            onClick={() => onStart(mode, clubName, formation, tactic)}
            type="button"
          >
            {t("home.start")} <span aria-hidden="true">→</span>
            <span className="home-start-shine" />
          </button>
          {hasSave ? (
            <button className="ghost-action" onClick={onResume} type="button">
              {t("home.resume")}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
