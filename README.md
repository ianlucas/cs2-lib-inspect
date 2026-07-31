# cs2-lib-inspect

> An extension for cs2-lib to create Counter-Strike 2 inspect links

## Install

```bash
npm install @ianlucas/cs2-lib-inspect
```

`@ianlucas/cs2-lib` v9 is a peer dependency and must be installed alongside it.

## Usage

```typescript
import { CS2Economy, CS2_ITEMS } from "@ianlucas/cs2-lib";
import { english } from "@ianlucas/cs2-lib/translations";
import { generateInspectLink, parseInspectLink } from "@ianlucas/cs2-lib-inspect";

CS2Economy.load({ items: CS2_ITEMS, language: english });

const link = generateInspectLink(CS2Economy.getById(307));
//=> "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000180920D802280638004001B9A9F1D4"

const item = parseInspectLink(CS2Economy, link);
//=> { id: 307, ... }
```

`parseCSFloatItemInfo(CS2Economy, itemInfo)` does the same for a CSFloat item info payload.
