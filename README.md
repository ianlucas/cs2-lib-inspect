# cs2-lib-inspect

> A utility for creating inspect links for CS2 items

## Install

```bash
npm install @ianlucas/cs2-lib-inspect
```

## Usage

```typescript
import { CS_Economy } from "@ianlucas/cs2-lib";
import { CS_generateInspectLink } from "@ianlucas/cs2-lib-inspect";

const link = CS_generateInspectLink(CS_Economy.getById(307));
```
