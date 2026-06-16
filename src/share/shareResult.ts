export type ShareOutcome = "shared" | "copied" | "cancelled" | "unsupported"

type ShareCapableNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/**
 * 결과 카드를 공유한다. 우선순위:
 * 1) Web Share API로 이미지 파일 + 텍스트 공유(모바일/지원 브라우저)
 * 2) 텍스트만 공유
 * 3) 둘 다 불가하면 링크를 클립보드에 복사하고 이미지를 다운로드(데스크톱 폴백)
 */
export async function shareResult(
  blob: Blob | null,
  text: string,
  url: string,
  filename: string,
): Promise<ShareOutcome> {
  const nav = navigator as ShareCapableNavigator
  const message = `${text} ${url}`

  if (blob !== null && typeof nav.canShare === "function" && typeof nav.share === "function") {
    try {
      const file = new File([blob], filename, { type: "image/png" })
      if (nav.canShare({ files: [file] })) {
        await nav.share({ title: "Legend Draft League", text: message, files: [file] })
        return "shared"
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return "cancelled"
      }
    }
  }

  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: "Legend Draft League", text: text, url })
      return "shared"
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return "cancelled"
      }
    }
  }

  let copied = false
  try {
    await navigator.clipboard.writeText(message)
    copied = true
  } catch {
    copied = false
  }
  if (blob !== null) {
    downloadBlob(blob, filename)
  }
  return copied ? "copied" : "unsupported"
}
