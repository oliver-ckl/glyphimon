export type Palette = Record<string, string>

export type Sprite = {
  grid: string[]
  eyes?: [number, number][]
}

export type Nature = "builder" | "scholar" | "tinkerer"

export type FamilyId = "cinder" | "tide" | "moss"

export type Family = {
  id: FamilyId
  name: string
  blurb: string
  babyName: string
  teenName: string
  sprites: { egg: Sprite; baby: Sprite; teen: Sprite }
  finals: Record<Nature, { name: string; title: string; sprite: Sprite }>
  palette: Palette
}
