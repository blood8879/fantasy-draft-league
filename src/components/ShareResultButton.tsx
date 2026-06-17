import { Share2 } from "lucide-react"
import { useState } from "react"
import { getShareUrl, getShareUrlLabel } from "../ads/config"
import type { PlayerCard } from "../data/schema"
import type { DraftState } from "../domain/draft"
import type { Club } from "../domain/game"
import { useI18n } from "../i18n"
import { buildShareCardBlob } from "../share/shareCard"
import { shareResult } from "../share/shareResult"
import type { TeamProfile } from "../simulation/types"

type ShareResultButtonProps = {
  readonly club: Club
  readonly squad: DraftState
  readonly cards: ReadonlyMap<string, PlayerCard>
  readonly profile: TeamProfile
  readonly badge: string
  readonly subtitle: string
  readonly statsLine: string | undefined
  readonly achievements: readonly string[]
  readonly avgOvr: number
}

type Status = "idle" | "working" | "shared" | "copied" | "failed"

export function ShareResultButton(props: ShareResultButtonProps) {
  const { t } = useI18n()
  const [status, setStatus] = useState<Status>("idle")

  async function handleShare() {
    setStatus("working")
    try {
      const blob = await buildShareCardBlob({
        club: props.club,
        squad: props.squad,
        cards: props.cards,
        profile: props.profile,
        badge: props.badge,
        subtitle: props.subtitle,
        statsLine: props.statsLine,
        achievements: props.achievements,
        avgOvr: props.avgOvr,
        labels: {
          brand: t("share.brand"),
          ovr: t("share.ovr"),
          chem: t("share.chem"),
          cta: t("share.cta"),
          url: getShareUrlLabel(),
          axes: {
            attack: t("axis.attack"),
            chanceCreation: t("axis.chanceCreation"),
            midfieldControl: t("axis.midfieldControl"),
            pressResistance: t("axis.pressResistance"),
            transition: t("axis.transition"),
            defensiveStability: t("axis.defensiveStability"),
            chemistry: t("chem.title"),
          },
        },
      })
      const outcome = await shareResult(
        blob,
        t("share.text"),
        getShareUrl(),
        "legend-draft-result.png",
      )
      if (outcome === "shared") {
        setStatus("shared")
      } else if (outcome === "copied") {
        setStatus("copied")
      } else if (outcome === "cancelled") {
        setStatus("idle")
      } else {
        setStatus("failed")
      }
    } catch {
      setStatus("failed")
    }
  }

  return (
    <div className="share-result">
      <button
        className="primary-action primary-action--bright"
        disabled={status === "working"}
        onClick={handleShare}
        type="button"
      >
        <Share2 aria-hidden="true" size={16} />
        {status === "working" ? t("share.working") : t("share.button")}
      </button>
      {status === "shared" ? <span className="share-hint">{t("share.done")}</span> : null}
      {status === "copied" ? <span className="share-hint">{t("share.copied")}</span> : null}
      {status === "failed" ? (
        <span className="share-hint share-hint--err">{t("share.failed")}</span>
      ) : null}
    </div>
  )
}
