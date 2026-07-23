/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    type CS2Item,
    CS2Economy,
    CS2EconomyInstance,
    CS2Inventory,
    CS2RarityColor,
    CS2_ITEMS,
    CS2_MAX_KEYCHAIN_SEED,
    CS2_MAX_STICKER_ROTATION,
    CS2_MAX_STICKER_WEAR,
    CS2_MIN_STICKER_ROTATION,
    CS2_MIN_STICKER_WEAR
} from "@ianlucas/cs2-lib";
import { english } from "@ianlucas/cs2-lib/translations";
import { describe, expect, test } from "vitest";
import { type CS2GCInventoryItem, parseGCInventoryItem } from "./parse-gc-inventory-item.js";

CS2Economy.load({ items: CS2_ITEMS, language: english });

const BROKEN_FANG_GLOVES_JADE_ID = 1707; // def 4725, index 10085, wear [0.06, 0.8]
const GLOVES_DEFINDEX = 4725;
const GLOVES_PAINTINDEX = 10085;
const AWP_DRAGON_LORE_ID = 307; // def 9, index 344
const AWP_DEFINDEX = 9;
const AWP_PAINTINDEX = 344;
const FALLEN_COLOGNE_STICKER_INDEX = 395; // sticker id 2226
const LIL_AVA_KEYCHAIN_INDEX = 1; // keychain id 13113, def 1355
const DEAGLE_URBAN_DDPAT_ID = 66; // def 1, index 17; sticker offset X [-0.6436, 0.5803], Y [-0.1982, 0.3346]
const DEAGLE_DEFINDEX = 1;
const DEAGLE_PAINTINDEX = 17;

function gcItem(overrides: Partial<CS2GCInventoryItem>): CS2GCInventoryItem {
    return { defindex: 0, stickers: [], keychains: [], ...overrides };
}

describe("parseGCInventoryItem wear clamping", () => {
    test("float below wearMin is clamped up to wearMin", () => {
        const economyItem = CS2Economy.getById(BROKEN_FANG_GLOVES_JADE_ID);
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({ defindex: GLOVES_DEFINDEX, paintindex: GLOVES_PAINTINDEX, floatvalue: 0.01 })
        );
        expect(result.id).toBe(BROKEN_FANG_GLOVES_JADE_ID);
        expect(result.wear).toBe(economyItem.getMinimumWear());
    });

    test("float above wearMax is clamped down to wearMax", () => {
        const economyItem = CS2Economy.getById(BROKEN_FANG_GLOVES_JADE_ID);
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({ defindex: GLOVES_DEFINDEX, paintindex: GLOVES_PAINTINDEX, floatvalue: 0.95 })
        );
        expect(result.id).toBe(BROKEN_FANG_GLOVES_JADE_ID);
        expect(result.wear).toBe(economyItem.getMaximumWear());
    });
});

describe("parseGCInventoryItem sticker clamping", () => {
    test("out-of-range sticker rotation is normalized into [min, max]", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: AWP_DEFINDEX,
                paintindex: AWP_PAINTINDEX,
                stickers: [{ slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX, rotation: 9999 }]
            })
        );
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        const rotation = result.stickers?.[0]?.rotation;
        expect(rotation).toBeGreaterThanOrEqual(CS2_MIN_STICKER_ROTATION);
        expect(rotation).toBeLessThanOrEqual(CS2_MAX_STICKER_ROTATION);
    });

    test("sticker rotation snaps to the half-degree grid, preserving the visual angle", () => {
        const parseRotation = (rotation: number) =>
            parseGCInventoryItem(
                CS2Economy,
                gcItem({
                    defindex: AWP_DEFINDEX,
                    paintindex: AWP_PAINTINDEX,
                    stickers: [{ slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX, rotation }]
                })
            ).stickers?.[0]?.rotation;
        // Half-degree GC values survive intact (previously truncated to whole degrees).
        expect(parseRotation(2.5)).toBe(2.5);
        expect(parseRotation(-90.5)).toBe(-90.5);
        // Off-grid float noise snaps to the nearest half degree.
        expect(parseRotation(2.7)).toBe(2.5);
        expect(parseRotation(2.4)).toBe(2.5);
        // Legacy 0-359 wraps after snapping.
        expect(parseRotation(270)).toBe(-90);
        expect(parseRotation(359.5)).toBe(-0.5);
        expect(parseRotation(359.7)).toBe(-0.5);
    });

    test("over-max sticker wear is clamped to max", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: AWP_DEFINDEX,
                paintindex: AWP_PAINTINDEX,
                stickers: [{ slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX, wear: 5 }]
            })
        );
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.stickers?.[0]?.wear).toBe(CS2_MAX_STICKER_WEAR);
    });

    test("below-min sticker wear is clamped to min", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: AWP_DEFINDEX,
                paintindex: AWP_PAINTINDEX,
                stickers: [{ slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX, wear: -5 }]
            })
        );
        // CS2_MIN_STICKER_WEAR is stripped to undefined by stripMinValues.
        expect(result.stickers?.[0]?.wear).toBe(CS2_MIN_STICKER_WEAR === 0 ? undefined : CS2_MIN_STICKER_WEAR);
    });
});

describe("parseGCInventoryItem sticker offset healing", () => {
    test("off-grid sticker offset is truncated onto the CS2_STICKER_OFFSET_FACTOR grid", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: DEAGLE_DEFINDEX,
                paintindex: DEAGLE_PAINTINDEX,
                stickers: [
                    { slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX, offsetX: 0.12345678, offsetY: -0.0511111 }
                ]
            })
        );
        expect(result.id).toBe(DEAGLE_URBAN_DDPAT_ID);
        // Both values are within the model envelope, so only grid truncation (4 dp) applies.
        expect(result.stickers?.[0]?.x).toBe(0.1234);
        expect(result.stickers?.[0]?.y).toBe(-0.0511);
    });

    test("out-of-envelope sticker offset is clamped to the model's published bounds", () => {
        const economyItem = CS2Economy.getById(DEAGLE_URBAN_DDPAT_ID);
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: DEAGLE_DEFINDEX,
                paintindex: DEAGLE_PAINTINDEX,
                stickers: [{ slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX, offsetX: 999, offsetY: -999 }]
            })
        );
        expect(result.stickers?.[0]?.x).toBe(economyItem.getMaximumStickerOffsetX());
        expect(result.stickers?.[0]?.y).toBe(economyItem.getMinimumStickerOffsetY());
    });

    test("healed offsets satisfy cs2-lib validation (inventory.add does not throw)", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: DEAGLE_DEFINDEX,
                paintindex: DEAGLE_PAINTINDEX,
                stickers: [{ slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX, offsetX: 999, offsetY: -999 }]
            })
        );
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        expect(() => inventory.add(result)).not.toThrow();
    });
});

describe("parseGCInventoryItem sticker schema healing", () => {
    // Desert Eagle | Urban DDPAT exposes 4 sticker anchors (getStickerSchemaCount() === 4), fewer than
    // the 5-deep stack, so a full stack necessarily pushes a GC slot past the model's anchor range.
    test("a GC slot beyond the model's anchor count is repaired onto a real anchor", () => {
        expect(CS2Economy.getById(DEAGLE_URBAN_DDPAT_ID).getStickerSchemaCount()).toBe(4);
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: DEAGLE_DEFINDEX,
                paintindex: DEAGLE_PAINTINDEX,
                stickers: [
                    { slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 1, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 2, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 3, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 4, stickerId: FALLEN_COLOGNE_STICKER_INDEX }
                ]
            })
        );
        // In-range slots keep their anchor; the out-of-range 5th sticker (slot 4) falls back to the
        // first free anchor — every anchor is taken, so it shares anchor 0.
        expect(result.stickers?.[0]?.schema).toBe(0);
        expect(result.stickers?.[1]?.schema).toBe(1);
        expect(result.stickers?.[2]?.schema).toBe(2);
        expect(result.stickers?.[3]?.schema).toBe(3);
        expect(result.stickers?.[4]?.schema).toBe(0);
    });

    test("in-range GC slots are preserved as the sticker schema", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: DEAGLE_DEFINDEX,
                paintindex: DEAGLE_PAINTINDEX,
                stickers: [
                    { slot: 2, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX }
                ]
            })
        );
        // Record key is the 0-based stack position; schema is the GC anchor it was sent on.
        expect(result.stickers?.[0]?.schema).toBe(2);
        expect(result.stickers?.[1]?.schema).toBe(0);
    });

    test("healed schema satisfies cs2-lib validation (out-of-range slot would otherwise throw)", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: DEAGLE_DEFINDEX,
                paintindex: DEAGLE_PAINTINDEX,
                stickers: [
                    { slot: 0, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 1, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 2, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 3, stickerId: FALLEN_COLOGNE_STICKER_INDEX },
                    { slot: 4, stickerId: FALLEN_COLOGNE_STICKER_INDEX }
                ]
            })
        );
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        expect(() => inventory.validateBaseInventoryItem(result)).not.toThrow();
    });
});

describe("parseGCInventoryItem keychain clamping", () => {
    test("over-range nested keychain seed is clamped to max", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: AWP_DEFINDEX,
                paintindex: AWP_PAINTINDEX,
                keychains: [{ slot: 0, stickerId: LIL_AVA_KEYCHAIN_INDEX, pattern: 999999 }]
            })
        );
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.keychains?.[0]?.seed).toBe(CS2_MAX_KEYCHAIN_SEED);
    });

    test("out-of-range keychain item seed is clamped to max", () => {
        const economyItem = CS2Economy.itemsAsArray.find(
            (item) =>
                item.isKeychain() && item.index === LIL_AVA_KEYCHAIN_INDEX && item.wrappedSticker?.index === undefined
        )!;
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: economyItem.def,
                keychains: [{ slot: 0, stickerId: LIL_AVA_KEYCHAIN_INDEX, pattern: 999999 }]
            })
        );
        expect(result.id).toBe(economyItem.id);
        expect(result.seed).toBe(CS2_MAX_KEYCHAIN_SEED);
    });

    test("below-min keychain item seed is clamped then stripped to undefined", () => {
        const economyItem = CS2Economy.itemsAsArray.find(
            (item) =>
                item.isKeychain() && item.index === LIL_AVA_KEYCHAIN_INDEX && item.wrappedSticker?.index === undefined
        )!;
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: economyItem.def,
                keychains: [{ slot: 0, stickerId: LIL_AVA_KEYCHAIN_INDEX, pattern: 0 }]
            })
        );
        // Clamped up to CS2_MIN_KEYCHAIN_SEED, which stripMinValues then drops.
        expect(result.id).toBe(economyItem.id);
        expect(result.seed).toBeUndefined();
    });
});

describe("parseGCInventoryItem keychain offset healing", () => {
    const parseKeychainOffsets = (offsets: { offsetX?: number; offsetY?: number; offsetZ?: number }) =>
        parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: AWP_DEFINDEX,
                paintindex: AWP_PAINTINDEX,
                keychains: [{ slot: 0, stickerId: LIL_AVA_KEYCHAIN_INDEX, ...offsets }]
            })
        ).keychains?.[0];

    test("off-grid keychain offset is truncated onto the CS2_KEYCHAIN_OFFSET_FACTOR grid", () => {
        // All three axes sit inside the AWP's envelope, so only grid truncation (4 dp) applies.
        const keychain = parseKeychainOffsets({ offsetX: 1.23456789, offsetY: 0.5123456, offsetZ: 5.4321987 });
        expect(keychain?.x).toBe(1.2345);
        expect(keychain?.y).toBe(0.5123);
        expect(keychain?.z).toBe(5.4321);
    });

    test("out-of-envelope keychain offset is clamped to the model's published bounds", () => {
        // Stands in for a weapon whose item data publishes a keychain envelope; asserting against a
        // fixed envelope keeps this meaningful no matter which bounds the shipped items carry.
        const economy = new CS2EconomyInstance();
        const items: CS2Item[] = [
            {
                base: true,
                def: AWP_DEFINDEX,
                free: true,
                id: 0,
                keychainOffsetXMax: 41.2865,
                keychainOffsetXMin: -10.1283,
                keychainOffsetYMax: 1.3716,
                keychainOffsetYMin: -0.0176,
                keychainOffsetZMax: 11.7576,
                keychainOffsetZMin: 2.6437,
                rarity: CS2RarityColor.Common,
                type: "weapon"
            },
            {
                baseId: 0,
                def: AWP_DEFINDEX,
                id: 1,
                index: AWP_PAINTINDEX,
                rarity: CS2RarityColor.Ancient,
                type: "weapon"
            },
            { def: 1355, id: 2, index: LIL_AVA_KEYCHAIN_INDEX, rarity: CS2RarityColor.Rare, type: "keychain" }
        ];
        economy.load({ items, language: { 0: { name: "AWP" }, 1: { name: "AWP | Skin" }, 2: { name: "Charm" } } });
        const parse = (offsets: object) =>
            parseGCInventoryItem(economy, {
                defindex: AWP_DEFINDEX,
                paintindex: AWP_PAINTINDEX,
                stickers: [],
                keychains: [{ slot: 0, stickerId: LIL_AVA_KEYCHAIN_INDEX, ...offsets }]
            }).keychains?.[0];
        expect(parse({ offsetX: 9999, offsetY: -9999, offsetZ: 9999 })).toMatchObject({
            x: 41.2865,
            y: -0.0176,
            z: 11.7576
        });
        // Charm coordinates are absolute, so a zeroed axis can sit below the envelope floor.
        expect(parse({ offsetZ: 0 })?.z).toBe(2.6437);
    });

    test("absent keychain offsets stay absent", () => {
        const keychain = parseKeychainOffsets({});
        expect(keychain?.x).toBeUndefined();
        expect(keychain?.y).toBeUndefined();
        expect(keychain?.z).toBeUndefined();
    });

    test("healed keychain offsets satisfy cs2-lib validation (inventory.add does not throw)", () => {
        const result = parseGCInventoryItem(
            CS2Economy,
            gcItem({
                defindex: AWP_DEFINDEX,
                paintindex: AWP_PAINTINDEX,
                keychains: [
                    { slot: 0, stickerId: LIL_AVA_KEYCHAIN_INDEX, offsetX: 9999, offsetY: -9999, offsetZ: 12.345678 }
                ]
            })
        );
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        expect(() => inventory.add(result)).not.toThrow();
    });
});
