import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { canShowRewarded, recordRewardedShown } from "./adGuard"
import { createAdProvider } from "./index"
import type { AdProvider, RewardedAction, RewardedOutcome } from "./types"

type AdsContextValue = {
  readonly isNative: boolean
  /** 현재 광고를 표시 중인 액션 (없으면 undefined). 중복 클릭 방지/스피너용 */
  readonly pendingAction: RewardedAction | undefined
  showRewarded(action: RewardedAction): Promise<RewardedOutcome>
  showInterstitial(): Promise<void>
}

const AdsContext = createContext<AdsContextValue | undefined>(undefined)

export function AdsProvider({
  children,
  provider,
}: {
  readonly children: ReactNode
  /** 테스트에서 mock provider를 주입하기 위한 옵션 */
  readonly provider?: AdProvider | undefined
}) {
  const providerRef = useRef<AdProvider | undefined>(undefined)
  if (providerRef.current === undefined) {
    providerRef.current = provider ?? createAdProvider()
  }
  const ads = providerRef.current

  const [pendingAction, setPendingAction] = useState<RewardedAction | undefined>(undefined)

  useEffect(() => {
    ads.initialize().catch(() => {
      // 초기화 실패해도 게임은 계속된다 (mock/네이티브 공통)
    })
  }, [ads])

  const showRewarded = useCallback(
    async (action: RewardedAction): Promise<RewardedOutcome> => {
      const decision = canShowRewarded()
      if (!decision.allowed) {
        return { rewarded: false, reason: "capped" }
      }
      setPendingAction((current) => current ?? action)
      recordRewardedShown()
      try {
        return await ads.showRewarded(action)
      } catch {
        return { rewarded: false, reason: "failed" }
      } finally {
        setPendingAction(undefined)
      }
    },
    [ads],
  )

  const showInterstitial = useCallback(async () => {
    await ads.showInterstitial()
  }, [ads])

  const value = useMemo<AdsContextValue>(
    () => ({ isNative: ads.isNative, pendingAction, showRewarded, showInterstitial }),
    [ads.isNative, pendingAction, showRewarded, showInterstitial],
  )

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>
}

export function useAds(): AdsContextValue {
  const value = useContext(AdsContext)
  if (value === undefined) {
    throw new Error("useAds must be used within an AdsProvider")
  }
  return value
}
