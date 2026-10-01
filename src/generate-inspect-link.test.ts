/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Economy, CS2Inventory, CS2_ITEMS } from "@ianlucas/cs2-lib";
import { english } from "@ianlucas/cs2-lib/translations";
import { Buffer } from "buffer";
import { describe, expect, test } from "vitest";
import { CS2_PREVIEW_URL } from "./constants.js";
import { generateInspectLink } from "./generate-inspect-link.js";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";

const AWP_DRAGON_LORE_ID = 307;
const PET_EGG_ID = 28161;
const PET_CHICK_ID = 28162;
const PET_CATALANA_ID = 28163;
const PET_SILKIE_ID = 28164;
const CHICKEN_EGG_TOOL_ID = 28166;
const CHICKEN_FEED_TOOL_ID = 28167;
const PET_DEFINDEX = 4681;

CS2Economy.load({ items: CS2_ITEMS, language: english });

function decode(link: string): CEconItemPreviewDataBlock {
    const buffer = Buffer.from(link.replace(CS2_PREVIEW_URL, ""), "hex");
    return CEconItemPreviewDataBlock.fromBinary(buffer.subarray(1, -4));
}

function inventoryItem(item: Parameters<CS2Inventory["add"]>[0]) {
    const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
    inventory.add(item);
    return inventory.get(0);
}

describe("generateInspectLink pets", () => {
    test("a pet is its definition plus a pet index, never a paint index", () => {
        const block = decode(generateInspectLink(CS2Economy.getById(PET_CATALANA_ID)));
        expect(block.defindex).toBe(PET_DEFINDEX);
        expect(block.petindex).toBe(3);
        expect(block.paintindex).toBeUndefined();
    });

    test("the seed travels as the pattern of a variation, not as the paint seed", () => {
        const block = decode(generateInspectLink(inventoryItem({ id: PET_CATALANA_ID, seed: 4242 })));
        expect(block.variations).toEqual([{ pattern: 4242 }]);
        expect(block.paintseed).toBeUndefined();
    });

    test("a pet without a seed takes the minimum one", () => {
        expect(decode(generateInspectLink(CS2Economy.getById(PET_SILKIE_ID))).variations).toEqual([{ pattern: 1 }]);
        expect(decode(generateInspectLink(inventoryItem({ id: PET_SILKIE_ID }))).variations).toEqual([{ pattern: 1 }]);
    });

    test("the style is carried only when the pet has one set", () => {
        expect(decode(generateInspectLink(inventoryItem({ id: PET_CATALANA_ID, style: 7 }))).style).toBe(7);
        expect(decode(generateInspectLink(inventoryItem({ id: PET_CATALANA_ID }))).style).toBeUndefined();
    });

    test("each pet is sent at its own life stage", () => {
        expect(decode(generateInspectLink(CS2Economy.getById(PET_EGG_ID))).upgradeLevel).toBe(0);
        expect(decode(generateInspectLink(CS2Economy.getById(PET_CHICK_ID))).upgradeLevel).toBe(1);
        expect(decode(generateInspectLink(CS2Economy.getById(PET_CATALANA_ID))).upgradeLevel).toBe(3);
        expect(decode(generateInspectLink(CS2Economy.getById(PET_SILKIE_ID))).upgradeLevel).toBe(3);
    });

    test("a pet's name is the first custom name", () => {
        const block = decode(generateInspectLink(inventoryItem({ id: PET_CHICK_ID, nameTag: "Henrietta" })));
        expect(block.customnames).toEqual(["Henrietta"]);
    });

    test("the chicken tools are plain definitions", () => {
        for (const [id, defindex] of [
            [CHICKEN_EGG_TOOL_ID, 4948],
            [CHICKEN_FEED_TOOL_ID, 4949]
        ]) {
            const block = decode(generateInspectLink(CS2Economy.getById(id)));
            expect(block.defindex).toBe(defindex);
            expect(block.petindex).toBeUndefined();
            expect(block.upgradeLevel).toBeUndefined();
            expect(block.variations).toEqual([]);
        }
    });
});

describe("generateInspectLink other items", () => {
    test("a weapon carries no pet fields", () => {
        const block = decode(generateInspectLink(inventoryItem({ id: AWP_DRAGON_LORE_ID, seed: 500 })));
        expect(block.paintseed).toBe(500);
        expect(block.petindex).toBeUndefined();
        expect(block.style).toBeUndefined();
        expect(block.upgradeLevel).toBeUndefined();
        expect(block.variations).toEqual([]);
    });

    test("a name tag is the only custom name", () => {
        const block = decode(generateInspectLink(inventoryItem({ id: AWP_DRAGON_LORE_ID, nameTag: "My Gun" })));
        expect(block.customnames).toEqual(["My Gun"]);
    });
});
