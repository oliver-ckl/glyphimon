export type Palette = Record<string, string>

export type Sprite = {
  grid: string[]
  eyes?: [number, number][]
}

export type Nature = "builder" | "scholar" | "tinkerer"

export type FamilyId = "cinder" | "tide" | "moss"
