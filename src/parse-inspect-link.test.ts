/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2Economy, CS2Inventory, CS2_ITEMS, ensure } from "@ianlucas/cs2-lib";
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

    test("standalone sticker slab", () => {
        const link = "csgo_econ_action_preview CFDFCFD704C5EFCFE7CCFFC7A7CFBFCF6DCEC8C7CFDFEAAF668514DB475F";
        const result = parseInspectLink(CS2Economy, link);
        const item = CS2Economy.getById(result.id);
        expect(item.def).toBe(1355);
        expect(item.index).toBe(37);
        expect(item.stickerId).toBeDefined();
    });

    test("standalone sticker slab roundtrip (generate → parse → same id)", () => {
        const stickerSlab = ensure(
            CS2Economy.itemsAsArray.find(
                (item) => item.def === 1355 && item.index === 37 && item.stickerId !== undefined
            )
        );
        const link = generateInspectLink(stickerSlab);
        const result = parseInspectLink(CS2Economy, link);
        expect(result.id).toBe(stickerSlab.id);
    });

    test("weapon with sticker slab keychain (wrapped_sticker) - inspect link", () => {
        const link =
            "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001807202C2805300438BAC5D1EF0340D701620A080010DE2A1D00000000620A080110D62A1D00000000620A080210E32A1D000000006219080110E22A1D000000002D000028423DD513C1BD45D013243E6214080010CF241D000000003DBF18A9BE4500B3F4BAA2011B080010251D000000003D487D1E41452328143F4D328A844060C02E10C986BE";
        const result = parseInspectLink(CS2Economy, link);
        const keychainId = result.keychains?.[0]?.id;
        expect(keychainId).toBeDefined();
        const keychainItem = CS2Economy.getById(ensure(keychainId));
        expect(keychainItem.def).toBe(1355);
        expect(keychainItem.index).toBe(37);
        expect(keychainItem.stickerId).toBeDefined();
    });

    test("weapon with sticker slab keychain roundtrip", () => {
        const stickerSlab = ensure(
            CS2Economy.itemsAsArray.find((item) => item.def === 1355 && item.index === 37 && item.stickerId === 7249)
        );
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add({
            id: AWP_DRAGON_LORE_ID,
            keychains: { 0: { id: stickerSlab.id } }
        });
        const result = roundtrip(inventory.get(0));
        expect(result.id).toBe(AWP_DRAGON_LORE_ID);
        expect(result.keychains?.[0]?.id).toBe(stickerSlab.id);
    });

    test("sticker negative rotation is normalized to 0-359", () => {
        const originalLink =
            "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000181020B5022807300438A3E08EEE0340D402620A0803108E011D000000006219080610CD3D1D000000002D000070C13D807AA3BC45DB44093E6214080410D03D1D000000003D76401CBE45E0E2F5BC6219080410D33D1D000000002D00001CC33D722302BE45F054873D6219080310CF3D1D000000002D000016C33D4588B6BE45A8B4653DA2011C0800102F1D000000003D84E30142452F1E8A3E4DAAB2694150F1BE029DE86FC6";
        const parsed = parseInspectLink(CS2Economy, originalLink);
        for (const sticker of Object.values(parsed.stickers ?? {})) {
            if (sticker.rotation !== undefined) {
                expect(sticker.rotation).toBeGreaterThanOrEqual(0);
                expect(sticker.rotation).toBeLessThanOrEqual(359);
            }
        }
    });
});

describe("CS2 native hex format (XOR-encoded)", () => {
    // These links are generated by CS2 itself using a XOR-encoded protobuf format.
    // First byte is the XOR key; remaining bytes are XOR'd with it before parsing.
    const CS2_NATIVE_LINK_1 =
        "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%209A8A071D41142D9B825190BA9AB29CAA9EF293EA8D389B92929A8A8FCA582C993A1E2DE2";
    const CS2_NATIVE_LINK_2 =
        "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20B1A10E67470A0BB0A97ABB91B199B781B5D93CB3C1A613B0B9B9B1A1A4E15D36B23DE364EA";

    test("link 1 parses without throwing", () => {
        const result = parseInspectLink(CS2Economy, CS2_NATIVE_LINK_1);
        expect(result.id).toBeDefined();
    });

    test("link 2 parses without throwing", () => {
        const result = parseInspectLink(CS2Economy, CS2_NATIVE_LINK_2);
        expect(result.id).toBeDefined();
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
