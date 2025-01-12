# cs2-lib-inspect

> An extension for cs2-lib to create Counter-Strike 2 inspect links

## Install

```bash
npm install @ianlucas/cs2-lib-inspect
```

## Usage

```typescript
import { CS2Economy } from "@ianlucas/cs2-lib";
import { generateInspectLink } from "@ianlucas/cs2-lib-inspect";

const link = generateInspectLink(CS2Economy.getById(307));
//=> "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000180920D802280638004001B9A9F1D4"
```
