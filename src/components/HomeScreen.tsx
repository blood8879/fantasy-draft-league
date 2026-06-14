import { useState } from "react"
import { type GameMode, gameModes } from "../domain/game"
import { type FormationType, type TacticType, formationTypes, tacticTypes } from "../domain/types"
import { FormationSelector } from "./FormationSelector"

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

const modeDescriptions: Readonly<Record<GameMode, string>> = {
  리그: "8개 구단 풀리그 7라운드. 승점으로 우승을 가립니다.",
  컵: "8강 싱글 엘리미네이션. 지면 끝, 무승부는 승부차기.",
}

export function HomeScreen({ hasSave, onResume, onStart }: HomeScreenProps) {
  const [mode, setMode] = useState<GameMode>("리그")
  const [clubName, setClubName] = useState("")
  const [formation, setFormation] = useState<FormationType>("4-3-3")
  const [tactic, setTactic] = useState<TacticType>("점유율")

  return (
    <section className="home-screen">
      <header className="home-hero">
        <p className="eyebrow">Legend Draft League</p>
        <h1>
          레전드
          <br />
          드래프트 리그
        </h1>
        <p className="home-pitch">
          역대 최고의 선수 500인이 한 풀에 모였습니다. 나와 AI 감독 7명이 한 명씩 번갈아 지명하는
          스네이크 드래프트로 스쿼드를 완성하고, 그 팀으로 한 시즌을 치러 우승에 도전하세요. 내가
          지명한 선수는 다른 구단이 영입할 수 없습니다.
        </p>
        <ol className="home-steps">
          <li>
            <strong>1. 드래프트</strong> 8개 구단이 11라운드 스네이크 픽으로 베스트 XI 구성
          </li>
          <li>
            <strong>2. 대회</strong> 풀리그 또는 8강 토너먼트를 라운드별로 진행
          </li>
          <li>
            <strong>3. 시상</strong> 우승 트로피와 득점왕까지, 시즌 기록 정산
          </li>
        </ol>
      </header>

      <div className="home-setup draft-aside">
        <h2 className="home-setup-title">새 시즌 설정</h2>

        <fieldset className="setup-field" aria-label="대회 방식">
          <span className="setup-label">대회 방식</span>
          <div className="mode-grid">
            {gameModes.map((candidate) => (
              <button
                aria-pressed={mode === candidate}
                className="mode-card"
                key={candidate}
                onClick={() => setMode(candidate)}
                type="button"
              >
                <span className="mode-name">
                  {candidate === "리그" ? "리그 시즌" : "녹아웃 컵"}
                </span>
                <span className="mode-desc">{modeDescriptions[candidate]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="setup-field" htmlFor="club-name">
          <span className="setup-label">내 구단 이름</span>
          <input
            className="club-name-input"
            id="club-name"
            maxLength={18}
            onChange={(event) => setClubName(event.target.value)}
            placeholder="마이 일레븐"
            value={clubName}
          />
        </label>

        <div className="setup-field">
          <span className="setup-label">포메이션</span>
          <FormationSelector
            formations={formationTypes}
            onSelectFormation={setFormation}
            selectedFormation={formation}
          />
        </div>

        <fieldset className="setup-field" aria-label="기본 전술">
          <span className="setup-label">기본 전술 (라운드마다 변경 가능)</span>
          <div className="tactic-row">
            {tacticTypes.map((candidate) => (
              <button
                aria-pressed={tactic === candidate}
                className="tactic-chip"
                key={candidate}
                onClick={() => setTactic(candidate)}
                type="button"
              >
                {candidate}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="setup-actions">
          <button
            className="primary-action primary-action--bright"
            onClick={() => onStart(mode, clubName, formation, tactic)}
            type="button"
          >
            드래프트 시작
          </button>
          {hasSave ? (
            <button className="ghost-action" onClick={onResume} type="button">
              진행 중인 시즌 이어하기
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
