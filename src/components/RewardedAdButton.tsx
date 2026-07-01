import { Film } from "lucide-react"
import { type ReactNode, useState } from "react"
import type { RewardedAction } from "../ads"
import { useAds } from "../ads/useAds"
import { useI18n } from "../i18n"

type RewardedAdButtonProps = {
  readonly action: RewardedAction
  readonly onReward: () => void
  readonly children: ReactNode
  readonly className?: string
  readonly disabled?: boolean
}

/**
 * 보상형 광고 버튼. 클릭하면 광고를 표시하고, 끝까지 시청해 보상 조건을 충족했을 때만
 * onReward를 호출한다. 광고 재생 중에는 모든 광고 버튼이 잠긴다(pendingAction 공유).
 */
export function RewardedAdButton({
  action,
  onReward,
  children,
  className,
  disabled,
}: RewardedAdButtonProps) {
  const { showRewarded, pendingAction } = useAds()
  const { t } = useI18n()
  const busy = pendingAction !== undefined
  const isPlaying = pendingAction === action
  const [capped, setCapped] = useState(false)

  async function handleClick() {
    setCapped(false)
    const outcome = await showRewarded(action)
    if (outcome.rewarded) {
      onReward()
    } else if (outcome.reason === "capped") {
      setCapped(true)
    }
  }

  return (
    <>
      <button
        className={`rewarded-ad-button${className === undefined ? "" : ` ${className}`}`}
        disabled={disabled === true || busy}
        onClick={handleClick}
        type="button"
      >
        <Film aria-hidden="true" size={15} />
        <span>{isPlaying ? t("ad.playing") : children}</span>
      </button>
      {capped ? <output className="ad-capped-note">{t("ad.capped")}</output> : null}
    </>
  )
}
