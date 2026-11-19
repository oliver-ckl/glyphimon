export type HalfBlockRun = { text: string; fg: string; bg: string }

const TRANSPARENT = "."
const UPPER = "▀"
const LOWER = "▄"
const SPACE = " "

function colorAt(
  row: string | undefined,
  x: number,
  palette: Record<string, string>,
): string | undefined {
  const key = row?.[x]
  if (!key || key === TRANSPARENT) return undefined
  return palette[key]
}

export function buildHalfBlockRows(
  grid: string[],
  palette: Record<string, string>,
  surface: string,
): HalfBlockRun[][] {
  const rows: HalfBlockRun[][] = []

  for (let y = 0; y < grid.length; y += 2) {
    const top = grid[y] ?? ""
    const bottom = grid[y + 1] ?? ""
    const width = Math.max(top.length, bottom.length)
    const runs: HalfBlockRun[] = []

    for (let x = 0; x < width; x++) {
      const topColor = colorAt(top, x, palette)
      const bottomColor = colorAt(bottom, x, palette)

      let text: string
      let fg: string
      let bg: string

      if (topColor && bottomColor) {
        text = UPPER
        fg = topColor
        bg = bottomColor
      } else if (topColor) {
        text = UPPER
        fg = topColor
        bg = surface
      } else if (bottomColor) {
        text = LOWER
        fg = bottomColor
        bg = surface
      } else {
        text = SPACE
        fg = surface
        bg = surface
      }

      const last = runs[runs.length - 1]
      if (last && last.fg === fg && last.bg === bg) {
        last.text += text
      } else {
        runs.push({ text, fg, bg })
      }
    }

    rows.push(runs)
  }

  return rows
}
