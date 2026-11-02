/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    type CS2BaseInventoryItem,
    type CS2Item,
    CS2ContainerType,
    CS2EconomyInstance,
    CS2Inventory,
    CS2ItemType,
    CS2RarityColor,
    CS2SouvenirStickerType,
    ensure
} from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import { describe, expect, test } from "vitest";
import { CS2_PREVIEW_URL } from "./constants.js";
import { generateInspectLink } from "./generate-inspect-link.js";
import { parseCSFloatItemInfo } from "./parse-csfloat-item-info.js";
import { type CS2GCInventoryItem, parseGCInventoryItem } from "./parse-gc-inventory-item.js";
import { parseInspectLink } from "./parse-inspect-link.js";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";

const SOUVENIR_QUALITY = 12;
const EVENT_ID = 24;

const WEAPON_DEFINDEX = 7;
const SKIN_ID = 1;
const SKIN_PAINTINDEX = 44;
const LOOSE_SKIN_ID = 2;
const LOOSE_SKIN_PAINTINDEX = 45;

const TEAM_A_STICKER_ID = 10;
const TEAM_B_STICKER_ID = 11;
const EVENT_STICKER_ID = 12;
const MAP_STICKER_ID = 13;
const UNRELATED_STICKER_ID = 14;

const KEYCHAIN_DEFINDEX = 1355;
const CHARM_ID = 20;
const CHARM_INDEX = 70;
const HIGHLIGHT_ID = 21;
const HIGHLIGHT_REEL = 900;
const PLAIN_CHARM_ID = 22;
const PLAIN_CHARM_INDEX = 71;

const PACKAGE_ID = 30;

function sticker(id: number, type?: CS2SouvenirStickerType, teamId?: number): CS2Item {
    return {
        id,
        type: CS2ItemType.Sticker,
        rarityColor: CS2RarityColor.Ancient,
        definitionIndex: 1209,
        variantIndex: 100 + id,
        souvenirEventIds: type !== undefined ? [EVENT_ID] : undefined,
        souvenirStickerType: type,
        souvenirTeamId: teamId
    };
}

const economy = new CS2EconomyInstance();
economy.load({
    items: [
        {
            id: SKIN_ID,
            type: CS2ItemType.Weapon,
            rarityColor: CS2RarityColor.Mythical,
            definitionIndex: WEAPON_DEFINDEX,
            variantIndex: SKIN_PAINTINDEX
        },
        {
            id: LOOSE_SKIN_ID,
            type: CS2ItemType.Weapon,
            rarityColor: CS2RarityColor.Mythical,
            definitionIndex: WEAPON_DEFINDEX,
            variantIndex: LOOSE_SKIN_PAINTINDEX
        },
        sticker(TEAM_A_STICKER_ID, CS2SouvenirStickerType.Team, 1),
        sticker(TEAM_B_STICKER_ID, CS2SouvenirStickerType.Team, 2),
        sticker(EVENT_STICKER_ID, CS2SouvenirStickerType.Event),
        sticker(MAP_STICKER_ID, CS2SouvenirStickerType.Map),
        sticker(UNRELATED_STICKER_ID),
        {
            id: CHARM_ID,
            type: CS2ItemType.Keychain,
            rarityColor: CS2RarityColor.Rare,
            definitionIndex: KEYCHAIN_DEFINDEX,
            variantIndex: CHARM_INDEX
        },
        {
            id: HIGHLIGHT_ID,
            type: CS2ItemType.Highlight,
            parentId: CHARM_ID,
            teamStickerIds: [TEAM_A_STICKER_ID, TEAM_B_STICKER_ID],
            variantIndex: HIGHLIGHT_REEL
        },
        {
            id: PLAIN_CHARM_ID,
            type: CS2ItemType.Keychain,
            rarityColor: CS2RarityColor.Rare,
            definitionIndex: KEYCHAIN_DEFINDEX,
            variantIndex: PLAIN_CHARM_INDEX
        },
        {
            id: PACKAGE_ID,
            type: CS2ItemType.Container,
            rarityColor: CS2RarityColor.Common,
            containerType: CS2ContainerType.SouvenirCase,
            contentIds: [SKIN_ID],
            souvenirEventId: EVENT_ID,
            souvenirHighlightIds: [HIGHLIGHT_ID],
            souvenirMapStickerId: MAP_STICKER_ID
        }
    ]
});

const SOUVENIR_STICKERS = {
    0: { id: TEAM_A_STICKER_ID },
    1: { id: TEAM_B_STICKER_ID },
    2: { id: EVENT_STICKER_ID },
    3: { id: MAP_STICKER_ID }
};

function inventoryItem(item: CS2BaseInventoryItem) {
    const inventory = new CS2Inventory({ economy, maxItems: 4, storageUnitMaxItems: 4 });
    inventory.add(item);
    return inventory.get(0);
}

function decode(link: string): CEconItemPreviewDataBlock {
    const buffer = Buffer.from(link.replace(CS2_PREVIEW_URL, ""), "hex");
    return CEconItemPreviewDataBlock.fromBinary(buffer.subarray(1, -4));
}

function roundtrip(item: CS2BaseInventoryItem) {
    return parseInspectLink(economy, generateInspectLink(inventoryItem(item)));
}

function stickerIndex(id: number) {
    return ensure(economy.getById(id).variantIndex);
}

function gcItem(overrides: Partial<CS2GCInventoryItem>): CS2GCInventoryItem {
    return { defindex: WEAPON_DEFINDEX, paintindex: SKIN_PAINTINDEX, stickers: [], keychains: [], ...overrides };
}

function canAdd(item: CS2BaseInventoryItem) {
    const inventory = new CS2Inventory({ economy, maxItems: 4, storageUnitMaxItems: 4 });
    return () => inventory.add(item);
}

describe("generateInspectLink souvenirs", () => {
    test("a souvenir is sent with the souvenir quality", () => {
        expect(decode(generateInspectLink(inventoryItem({ id: SKIN_ID, souvenir: true }))).quality).toBe(
            SOUVENIR_QUALITY
        );
        expect(decode(generateInspectLink(inventoryItem({ id: SKIN_ID }))).quality).toBeUndefined();
    });

    test("a charm's highlight is sent as its highlight reel", () => {
        const attached = decode(
            generateInspectLink(
                inventoryItem({ id: SKIN_ID, keychains: { 0: { id: CHARM_ID, highlight: HIGHLIGHT_ID } } })
            )
        );
        expect(attached.keychains[0]?.highlightReel).toBe(HIGHLIGHT_REEL);
        const detached = decode(generateInspectLink(inventoryItem({ id: CHARM_ID, highlight: HIGHLIGHT_ID })));
        expect(detached.keychains[0]?.highlightReel).toBe(HIGHLIGHT_REEL);
    });

    test("a charm without a highlight sends no highlight reel", () => {
        const block = decode(
            generateInspectLink(inventoryItem({ id: SKIN_ID, keychains: { 0: { id: PLAIN_CHARM_ID, seed: 500 } } }))
        );
        expect(block.keychains[0]?.highlightReel).toBeUndefined();
    });
});

describe("parseInspectLink souvenirs", () => {
    test("a souvenir with its stickers and a highlight charm roundtrips", () => {
        const result = roundtrip({
            id: SKIN_ID,
            souvenir: true,
            stickers: SOUVENIR_STICKERS,
            keychains: { 0: { id: CHARM_ID, highlight: HIGHLIGHT_ID } }
        });
        expect(result).toEqual({
            id: SKIN_ID,
            souvenir: true,
            stickers: {
                0: { id: TEAM_A_STICKER_ID, schema: 0 },
                1: { id: TEAM_B_STICKER_ID, schema: 1 },
                2: { id: EVENT_STICKER_ID, schema: 2 },
                3: { id: MAP_STICKER_ID, schema: 3 }
            },
            keychains: { 0: { id: CHARM_ID, highlight: HIGHLIGHT_ID } }
        });
        expect(canAdd(result)).not.toThrow();
    });

    test("a souvenir with its stickers scraped off roundtrips", () => {
        expect(roundtrip({ id: SKIN_ID, souvenir: true })).toEqual({ id: SKIN_ID, souvenir: true });
    });

    test("a detached highlight charm roundtrips", () => {
        const result = roundtrip({ id: CHARM_ID, highlight: HIGHLIGHT_ID });
        expect(result).toEqual({ id: CHARM_ID, highlight: HIGHLIGHT_ID });
        expect(canAdd(result)).not.toThrow();
    });
});

describe("parseGCInventoryItem souvenirs", () => {
    test("stickers that fit no souvenir source drop the flag and are kept", () => {
        const result = parseGCInventoryItem(
            economy,
            gcItem({
                quality: SOUVENIR_QUALITY,
                stickers: [{ slot: 0, stickerId: stickerIndex(UNRELATED_STICKER_ID) }]
            })
        );
        expect(result.souvenir).toBeUndefined();
        expect(result.stickers?.[0]?.id).toBe(UNRELATED_STICKER_ID);
        expect(canAdd(result)).not.toThrow();
    });

    test("a skin no souvenir carries drops the flag", () => {
        const result = parseGCInventoryItem(
            economy,
            gcItem({ paintindex: LOOSE_SKIN_PAINTINDEX, quality: SOUVENIR_QUALITY })
        );
        expect(result).toEqual({ id: LOOSE_SKIN_ID });
    });

    test("other qualities are not souvenirs", () => {
        expect(parseGCInventoryItem(economy, gcItem({ quality: 4 })).souvenir).toBeUndefined();
        expect(parseGCInventoryItem(economy, gcItem({ quality: 9 })).souvenir).toBeUndefined();
    });

    test("a highlight charm takes no seed", () => {
        const result = parseGCInventoryItem(
            economy,
            gcItem({ keychains: [{ slot: 0, stickerId: CHARM_INDEX, highlightReel: HIGHLIGHT_REEL, pattern: 500 }] })
        );
        expect(result.keychains?.[0]).toEqual({ id: CHARM_ID, highlight: HIGHLIGHT_ID });
        expect(canAdd(result)).not.toThrow();
    });

    test("a highlight reel on a charm without highlights is ignored", () => {
        const result = parseGCInventoryItem(
            economy,
            gcItem({ keychains: [{ slot: 0, stickerId: PLAIN_CHARM_INDEX, highlightReel: HIGHLIGHT_REEL }] })
        );
        expect(result.keychains?.[0]).toEqual({ id: PLAIN_CHARM_ID });
    });

    test("an unknown highlight reel throws", () => {
        expect(() =>
            parseGCInventoryItem(
                economy,
                gcItem({ keychains: [{ slot: 0, stickerId: CHARM_INDEX, highlightReel: HIGHLIGHT_REEL + 1 }] })
            )
        ).toThrow();
    });
});

describe("parseCSFloatItemInfo souvenirs", () => {
    test("quality and highlight reel are read", () => {
        const result = parseCSFloatItemInfo(economy, {
            defindex: WEAPON_DEFINDEX,
            paintindex: SKIN_PAINTINDEX,
            quality: SOUVENIR_QUALITY,
            quality_name: "Souvenir",
            stickers: [
                { slot: 0, stickerId: stickerIndex(TEAM_A_STICKER_ID) },
                { slot: 1, stickerId: stickerIndex(TEAM_B_STICKER_ID) }
            ],
            keychains: [{ slot: 0, stickerId: CHARM_INDEX, highlight_reel: HIGHLIGHT_REEL }]
        });
        expect(result.souvenir).toBe(true);
        expect(result.keychains?.[0]).toEqual({ id: CHARM_ID, highlight: HIGHLIGHT_ID });
        expect(canAdd(result)).not.toThrow();
    });
});
