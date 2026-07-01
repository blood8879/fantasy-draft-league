import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { App } from "./App"
import { createMockAdProvider } from "./ads/mockAdProvider"

function renderApp() {
  // 광고 지연 0ms 주입 + 한국어 로케일 고정(검증 문구가 한국어 기준)
  render(<App adProvider={createMockAdProvider({ delayMs: 0 })} initialLocale="ko" />)
}

function clickIfPresent(name: RegExp): boolean {
  const button = screen.queryByRole("button", { name })
  if (button === null || button.hasAttribute("disabled")) {
    return false
  }
  fireEvent.click(button)
  return true
}

function completeDraft(): void {
  for (let guard = 0; guard < 400; guard += 1) {
    if (screen.queryByText("드래프트 완료!") !== null) {
      return
    }
    if (clickIfPresent(/내 차례까지 빨리 감기/)) {
      continue
    }
    // 유저 차례: 제시된 후보 카드 중 첫 장을 지명
    // 후보 카드의 포지션 지명 버튼(멀티포지션이면 여러 개 중 첫 번째)을 누른다
    const candidate = document.querySelector<HTMLButtonElement>(".candidate-card .cc-cta")
    if (candidate !== null) {
      fireEvent.click(candidate)
      continue
    }
    break
  }
  throw new Error("draft did not complete")
}

// 킥오프 후 라이브 경기면 "건너뛰기"로 즉시 종료하고, 결과 화면에서 다음으로 넘어간다.
async function advancePastMatch(): Promise<void> {
  const button = await screen.findByRole("button", {
    name: /건너뛰기|계속 진행|시즌 결산 보기/,
  })
  if (button.textContent?.includes("건너뛰기")) {
    fireEvent.click(button)
    fireEvent.click(await screen.findByRole("button", { name: /계속 진행|시즌 결산 보기/ }))
  } else {
    fireEvent.click(button)
  }
}

describe("레전드 드래프트 리그 앱", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("홈 화면에서 컨셉과 시즌 설정을 보여준다", () => {
    renderApp()

    expect(screen.getByText(/레전드/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "드래프트 시작" })).toBeInTheDocument()
    expect(screen.getByText("리그 시즌")).toBeInTheDocument()
    expect(screen.getByText("녹아웃 컵")).toBeInTheDocument()
  })

  it("리그 20팀: 드래프트 후 개막하고 라운드가 진행된다", async () => {
    renderApp()

    fireEvent.change(screen.getByLabelText("내 구단 이름"), {
      target: { value: "한강 유나이티드" },
    })
    fireEvent.click(screen.getByRole("button", { name: "드래프트 시작" }))

    expect(screen.getByText(/랜덤 후보 드래프트/)).toBeInTheDocument()
    completeDraft()

    fireEvent.click(screen.getByRole("button", { name: "리그 개막" }))
    expect(screen.getByText("리그 순위표")).toBeInTheDocument()
    expect(screen.getAllByText("한강 유나이티드").length).toBeGreaterThan(0)

    // 38라운드 전체 완주는 느리므로 초반 3라운드 진행만 확인한다
    for (let round = 1; round <= 3; round += 1) {
      fireEvent.click(await screen.findByRole("button", { name: /킥오프|관전/ }))
      await advancePastMatch()
    }
    expect(await screen.findByText("리그 순위표")).toBeInTheDocument()
  }, 20000)

  it("컵 16팀: 16강부터 결승까지 진행된다", async () => {
    renderApp()

    fireEvent.click(screen.getByText("녹아웃 컵"))
    fireEvent.click(screen.getByRole("button", { name: "드래프트 시작" }))
    completeDraft()

    fireEvent.click(screen.getByRole("button", { name: "컵 대회 개막" }))
    expect(screen.getByText("대진표")).toBeInTheDocument()

    // 16강 → 8강 → 준결승 → 결승 (4라운드)
    for (let stage = 1; stage <= 4; stage += 1) {
      fireEvent.click(await screen.findByRole("button", { name: /킥오프|관전/ }))
      await advancePastMatch()
    }

    expect(await screen.findByText(/컵 우승/)).toBeInTheDocument()
  }, 20000)

  it("데일리 도전: 진입→드래프트→컵 시뮬 후 챔피언에서 종합점수와 PB가 표시된다", async () => {
    renderApp()

    // 데일리 진입(컵 + 오늘의 시드 + isDaily)
    fireEvent.click(screen.getByRole("button", { name: /오늘의 도전/ }))
    completeDraft()

    fireEvent.click(screen.getByRole("button", { name: "컵 대회 개막" }))

    // 1라운드: 리포트(풀타임) 화면에서 재경기(보상광고) 버튼이 데일리에선 노출되지 않음을 검증.
    fireEvent.click(await screen.findByRole("button", { name: /킥오프|관전/ }))
    const firstSkip = await screen.findByRole("button", {
      name: /건너뛰기|계속 진행|시즌 결산 보기/,
    })
    if (firstSkip.textContent?.includes("건너뛰기")) {
      fireEvent.click(firstSkip)
    }
    expect(screen.queryByRole("button", { name: /재경기/ })).toBeNull()
    fireEvent.click(await screen.findByRole("button", { name: /계속 진행|시즌 결산 보기/ }))

    // 8강 → 준결승 → 결승 (남은 3라운드)
    for (let stage = 2; stage <= 4; stage += 1) {
      fireEvent.click(await screen.findByRole("button", { name: /킥오프|관전/ }))
      await advancePastMatch()
    }

    // 데일리 결과 카드: 종합 점수 + 개인 최고 + 첫 기록 신기록 배지
    expect(await screen.findByText("데일리 결과")).toBeInTheDocument()
    expect(screen.getByText("종합 점수")).toBeInTheDocument()
    expect(screen.getByText("개인 최고")).toBeInTheDocument()
    expect(screen.getByText("신기록!")).toBeInTheDocument()
  }, 20000)

  it("스카우트 리포트: 광고 보상 후 다음 상대 전력이 공개된다", async () => {
    renderApp()

    fireEvent.click(screen.getByRole("button", { name: "드래프트 시작" }))
    completeDraft()
    fireEvent.click(screen.getByRole("button", { name: "리그 개막" }))

    expect(screen.getByText(/다음 상대 ·/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /전력 분석 보기/ }))

    // 광고(mock) 시청 후 능력치 막대(공격력 등)가 노출된다
    expect(await screen.findByText("공격력")).toBeInTheDocument()
    expect(screen.getByText("수비 안정")).toBeInTheDocument()
  }, 20000)
})
