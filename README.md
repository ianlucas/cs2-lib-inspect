# Counter Strike 2 Inspect Link Creator

[![npm version](https://img.shields.io/npm/v/cs2-inspect-create.svg)](https://www.npmjs.com/package/cs2-inspect-create)
[![npm downloads](https://img.shields.io/npm/dm/cs2-inspect-create.svg)](https://www.npmjs.com/package/cs2-inspect-create)
[![license](https://img.shields.io/npm/l/cs2-inspect-create.svg)](https://github.com/candyboyz/cs2-inspect-create/blob/main/LICENSE)

This module is designed to create a link to inspect an item in CS2.

# Installing

From npm:

```bash
npm install cs2-inspect-create
```

From yarn:

```bash
yarn add cs2-inspect-create
```

# Usage

```ts
import {
  generateHex,
  generateLink,
  generateGen,
  Rarity,
  itemIds,
  skinIds,
  stickerIds,
} from "cs2-inspect-create"; // or import cs2inspect from "cs2-inspect-create";

const link = generateLink({
  defindex: 7,
  paintindex: 474,
  paintseed: 306,
  paintwear: 0.6336590647697449,
  rarity: Rarity.COVERT, // 5
  stickers: [
    {
      slot: 3,
      stickerId: stickerIds["00 Nation | Rio 2022"], // 6025
      wear: 0,
    },
  ],
});

// retrun inspect link `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000180720DA03280638FBEE88F90340B2026213080310021D00000000250000803F2D00000000503D5A64`

const hex = generateHex({
  defindex: 7,
  paintindex: 474,
  paintseed: 306,
  paintwear: 0.6336590647697449,
  rarity: Rarity.COVERT,
  stickers: [
    {
      slot: 3,
      stickerId: 2,
      wear: 0,
    },
  ],
});

// return hex `00180720DA03280638FBEE88F90340B2026213080310021D00000000250000803F2D00000000503D5A64`

const gen = generateGen({
  defindex: 7,
  paintindex: 474,
  paintseed: 306,
  paintwear: 0.6336590647697449,
  rarity: Rarity.COVERT,
  stickers: [
    {
      slot: 3,
      stickerId: 2,
      wear: 0,
    },
  ],
});

// return gen `!gen 7 474 306 0.6336590647697449 0 0 0 0 0 0 2 0 0 0`
```
