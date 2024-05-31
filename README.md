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
```
