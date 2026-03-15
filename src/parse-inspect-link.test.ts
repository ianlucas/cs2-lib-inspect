/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Economy, CS2Inventory, CS2_ITEMS } from "@ianlucas/cs2-lib";
import { english } from "@ianlucas/cs2-lib/translations";
import { describe, expect, test } from "vitest";
import { generateInspectLink } from "./generate-inspect-link.js";
import { isSteamInspectLink, parseInspectLink } from "./parse-inspect-link.js";

const AWP_DRAGON_LORE_ID = 307;
const AK47_ID = 4;
const KARAMBIT_AUTOTRONIC_ID = 1356;
const BROKEN_FANG_GLOVES_JADE_ID = 1707;
const LIL_AVA_ID = 13113;
const BLOODY_DARRYL_THE_STRAPPED_ID = 8657;
const FALLEN_COLOGNE_2015_ID = 2226;
const BLOODHOUND_ID = 8569;

CS2Economy.use({ items: CS2_ITEMS, language: english });

function roundtrip(item: Parameters<typeof generateInspectLink>[0]) {
    const link = generateInspectLink(item);
    console.log(link);
    return parseInspectLink(CS2Economy, link);
}

describe("parseInspectLink", () => {
    test("economy item roundtrip", () => {
        const item = CS2Economy.getById(AWP_DRAGON_LORE_ID);
        const result = roundtrip(item);
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
    });

    test("weapon with wear and seed", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({ id: AWP_DRAGON_LORE_ID, wear: 0.5, seed: 500 });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.wear).toBeCloseTo(0.5, 5);
        expect(result.seed).toBe(500);
    });

    test("weapon with stickers", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({
            id: AWP_DRAGON_LORE_ID,
            stickers: {
                0: { id: FALLEN_COLOGNE_2015_ID, wear: 0.1 },
                1: { id: FALLEN_COLOGNE_2015_ID, wear: 0.2 }
            }
        });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.stickers?.[0]?.id).toBe(FALLEN_COLOGNE_2015_ID);
        expect(result.stickers?.[0]?.wear).toBeCloseTo(0.1, 5);
        expect(result.stickers?.[1]?.id).toBe(FALLEN_COLOGNE_2015_ID);
        expect(result.stickers?.[1]?.wear).toBeCloseTo(0.2, 5);
    });

    test("weapon with statTrak", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({ id: AWP_DRAGON_LORE_ID, statTrak: 200 });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.statTrak).toBe(200);
    });

    test("weapon with nameTag", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({ id: AK47_ID, nameTag: "My Gun" });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(AK47_ID);
        expect(result.nameTag).toBe("My Gun");
    });

    test("melee with wear and seed", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({ id: KARAMBIT_AUTOTRONIC_ID, wear: 0.3, seed: 100 });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(KARAMBIT_AUTOTRONIC_ID);
        expect(result.wear).toBeCloseTo(0.3, 5);
        expect(result.seed).toBe(100);
    });

    test("gloves with wear", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({ id: BROKEN_FANG_GLOVES_JADE_ID, wear: 0.2 });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(BROKEN_FANG_GLOVES_JADE_ID);
        expect(result.wear).toBeCloseTo(0.2, 5);
    });

    test("agent with patches", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({
            id: BLOODY_DARRYL_THE_STRAPPED_ID,
            patches: { 0: BLOODHOUND_ID }
        });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(BLOODY_DARRYL_THE_STRAPPED_ID);
        expect(result.patches?.[0]).toBe(BLOODHOUND_ID);
    });

    test("keychain economy item roundtrip", () => {
        const item = CS2Economy.getById(LIL_AVA_ID);
        const result = roundtrip(item);
        expect(result.id).toBe(LIL_AVA_ID);
    });

    test("sticker economy item roundtrip", () => {
        const item = CS2Economy.getById(FALLEN_COLOGNE_2015_ID);
        const result = roundtrip(item);
        expect(result.id).toBe(FALLEN_COLOGNE_2015_ID);
    });

    test("weapon with keychain", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({
            id: AWP_DRAGON_LORE_ID,
            keychains: {
                0: { id: LIL_AVA_ID, seed: 2000 }
            }
        });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.keychains?.[0]?.id).toBe(LIL_AVA_ID);
        expect(result.keychains?.[0]?.seed).toBe(2000);
    });

    test("minimum wear is stripped", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({ id: AWP_DRAGON_LORE_ID });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.wear).toBeUndefined();
        expect(result.seed).toBeUndefined();
    });

    test("wear is truncated to valid decimal places", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({ id: AWP_DRAGON_LORE_ID, wear: 0.233422 });
        const result = roundtrip(inventory.get(0));
        expect(result.wear).toBeDefined();
        expect(String(result.wear).length).toBeLessThanOrEqual(String(0.000001).length);
        const addInventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        expect(() => addInventory.add(result)).not.toThrow();
    });

    test("sticker wear is truncated to valid decimal places", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({
            id: AWP_DRAGON_LORE_ID,
            stickers: { 0: { id: FALLEN_COLOGNE_2015_ID, wear: 0.1 } }
        });
        const result = roundtrip(inventory.get(0));
        expect(result.stickers?.[0]?.wear).toBeDefined();
        expect(String(result.stickers?.[0]?.wear).length).toBeLessThanOrEqual(String(0.1).length);
        const addInventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        expect(() => addInventory.add(result)).not.toThrow();
    });

    test("sticker schema roundtrip", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({
            id: AWP_DRAGON_LORE_ID,
            stickers: {
                0: { id: FALLEN_COLOGNE_2015_ID, schema: 1 },
                1: { id: FALLEN_COLOGNE_2015_ID, schema: 2 }
            }
        });
        const result = roundtrip(inventory.get(0));
        expect(result.stickers?.[0]?.schema).toBe(1);
        expect(result.stickers?.[1]?.schema).toBe(2);
    });

    test("sticker without schema uses slot as schema", () => {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({
            id: AWP_DRAGON_LORE_ID,
            stickers: {
                0: { id: FALLEN_COLOGNE_2015_ID },
                2: { id: FALLEN_COLOGNE_2015_ID }
            }
        });
        const result = roundtrip(inventory.get(0));
        expect(result.stickers?.[0]?.schema).toBe(0);
        expect(result.stickers?.[1]?.schema).toBe(2);
    });
});

describe("isSteamInspectLink", () => {
    test("valid S-form link returns true", () => {
        expect(
            isSteamInspectLink(
                "steam://rungame/730/76561202255233023/+csgo_econ_action_preview S76561198029816785A49963474016D875678535536611316"
            )
        ).toBe(true);
    });

    test("valid M-form link returns true", () => {
        expect(
            isSteamInspectLink(
                "steam://rungame/730/76561202255233023/+csgo_econ_action_preview M3000000000A49963474016D875678535536611316"
            )
        ).toBe(true);
    });

    test("real S-form links return true", () => {
        expect(
            isSteamInspectLink(
                "steam://rungame/730/76561202255233023/+csgo_econ_action_preview S76561198345734391A47641518478D16881788017564683471"
            )
        ).toBe(true);
        expect(
            isSteamInspectLink(
                "steam://rungame/730/76561202255233023/+csgo_econ_action_preview S76561198141202154A50190974559D10261036291470033848"
            )
        ).toBe(true);
    });

    test("hex protobuf link returns false", () => {
        const link = generateInspectLink(CS2Economy.getById(AWP_DRAGON_LORE_ID));
        expect(isSteamInspectLink(link)).toBe(false);
    });
});
