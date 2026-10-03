/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CS2Economy,
    CS2Inventory,
    CS2_ITEMS,
    CS2_MAX_STICKER_ROTATION,
    CS2_MIN_STICKER_ROTATION,
    ensure
} from "@ianlucas/cs2-lib";
import { english } from "@ianlucas/cs2-lib/translations";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { describe, expect, test } from "vitest";
import { CS2_PREVIEW_COMMAND } from "./constants.js";
import { generateInspectLink } from "./generate-inspect-link.js";
import { isSteamInspectLink, parseInspectLink } from "./parse-inspect-link.js";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";

const AWP_DRAGON_LORE_ID = 307;
const AK47_ID = 4;
const KARAMBIT_AUTOTRONIC_ID = 1356;
const BROKEN_FANG_GLOVES_JADE_ID = 1707;
const LIL_AVA_ID = 13113;
const BLOODY_DARRYL_THE_STRAPPED_ID = 8657;
const FALLEN_COLOGNE_2015_ID = 2226;
const BLOODHOUND_ID = 8569;
const PET_EGG_ID = 28161;
const PET_CHICK_ID = 28162;
const PET_CATALANA_ID = 28163;
const PET_SILKIE_ID = 28164;
const PET_POLISH_ID = 28165;
const CHICKEN_EGG_TOOL_ID = 28166;
const CHICKEN_FEED_TOOL_ID = 28167;
const PET_DEFINDEX = 4681;

CS2Economy.load({ items: CS2_ITEMS, language: english });

function roundtrip(item: Parameters<typeof generateInspectLink>[0]) {
    const link = generateInspectLink(item);
    return parseInspectLink(CS2Economy, link);
}

// Encodes a block the way the game does, for the shapes the generator never writes.
function link(block: Partial<CEconItemPreviewDataBlock>) {
    const binary = CEconItemPreviewDataBlock.toBinary(CEconItemPreviewDataBlock.create(block));
    const payload = Buffer.concat([Uint8Array.from([0]), binary]);
    const crc = CRC32.buf(payload);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE((((crc & 0xffff) ^ (binary.byteLength * crc)) & 0xffffffff) >>> 0, 0);
    return `${CS2_PREVIEW_COMMAND}${Buffer.concat([payload, checksum]).toString("hex").toUpperCase()}`;
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
        expect(item.definitionIndex).toBe(1355);
        expect(item.variantIndex).toBe(37);
        expect(item.displayedSticker?.variantIndex).toBeDefined();
    });

    test("standalone sticker slab roundtrip (generate → parse → same id)", () => {
        const stickerSlab = ensure(
            CS2Economy.itemsAsArray.find(
                (item) =>
                    item.definitionIndex === 1355 &&
                    item.variantIndex === 37 &&
                    item.displayedSticker?.variantIndex !== undefined
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
        expect(keychainItem.definitionIndex).toBe(1355);
        expect(keychainItem.variantIndex).toBe(37);
        expect(keychainItem.displayedSticker?.variantIndex).toBeDefined();
    });

    test("weapon with sticker slab keychain roundtrip", () => {
        const stickerSlab = ensure(
            CS2Economy.itemsAsArray.find(
                (item) =>
                    item.definitionIndex === 1355 &&
                    item.variantIndex === 37 &&
                    item.displayedSticker?.variantIndex === 7249
            )
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

    test("sticker rotation is normalized to -180..180", () => {
        const originalLink =
            "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000181020B5022807300438A3E08EEE0340D402620A0803108E011D000000006219080610CD3D1D000000002D000070C13D807AA3BC45DB44093E6214080410D03D1D000000003D76401CBE45E0E2F5BC6219080410D33D1D000000002D00001CC33D722302BE45F054873D6219080310CF3D1D000000002D000016C33D4588B6BE45A8B4653DA2011C0800102F1D000000003D84E30142452F1E8A3E4DAAB2694150F1BE029DE86FC6";
        const parsed = parseInspectLink(CS2Economy, originalLink);
        for (const sticker of Object.values(parsed.stickers ?? {})) {
            if (sticker.rotation !== undefined) {
                expect(sticker.rotation).toBeGreaterThanOrEqual(CS2_MIN_STICKER_ROTATION);
                expect(sticker.rotation).toBeLessThanOrEqual(CS2_MAX_STICKER_ROTATION);
            }
        }
    });
});

describe("parseInspectLink pets", () => {
    function pet(item: Parameters<CS2Inventory["add"]>[0]) {
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        inventory.add(item);
        return roundtrip(inventory.get(0));
    }

    test("every pet survives a roundtrip as itself", () => {
        for (const id of [PET_EGG_ID, PET_CHICK_ID, PET_CATALANA_ID, PET_SILKIE_ID, PET_POLISH_ID]) {
            expect(roundtrip(CS2Economy.getById(id))).toEqual({ id });
        }
    });

    test("pet with seed and style", () => {
        expect(pet({ id: PET_POLISH_ID, seed: 4242, style: 12 })).toEqual({ id: PET_POLISH_ID, seed: 4242, style: 12 });
    });

    test("egg and chick keep their seed", () => {
        expect(pet({ id: PET_EGG_ID, seed: 99999 })).toEqual({ id: PET_EGG_ID, seed: 99999 });
        expect(pet({ id: PET_CHICK_ID, seed: 77 })).toEqual({ id: PET_CHICK_ID, seed: 77 });
    });

    test("pet with a name", () => {
        expect(pet({ id: PET_CATALANA_ID, nameTag: "Henrietta" }).nameTag).toBe("Henrietta");
    });

    test("the chicken tools roundtrip", () => {
        expect(roundtrip(CS2Economy.getById(CHICKEN_EGG_TOOL_ID))).toEqual({ id: CHICKEN_EGG_TOOL_ID });
        expect(roundtrip(CS2Economy.getById(CHICKEN_FEED_TOOL_ID))).toEqual({ id: CHICKEN_FEED_TOOL_ID });
    });

    test("a pet as the game writes it: hatch date beside the seed, default style as 0", () => {
        const result = parseInspectLink(
            CS2Economy,
            link({
                defindex: PET_DEFINDEX,
                petindex: 4,
                style: 0,
                upgradeLevel: 3,
                petFoodExpirationDate: 1790000000,
                variations: [{ pattern: 31337, tintId: 1780000000 }]
            })
        );
        expect(result).toEqual({ id: PET_SILKIE_ID, seed: 31337 });
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        expect(() => inventory.add(result)).not.toThrow();
    });

    test("a style the breed does not have is dropped", () => {
        const result = parseInspectLink(CS2Economy, link({ defindex: PET_DEFINDEX, petindex: 4, style: 10 }));
        expect(result).toEqual({ id: PET_SILKIE_ID });
    });

    test("a style on a pet with one look is dropped", () => {
        const result = parseInspectLink(CS2Economy, link({ defindex: PET_DEFINDEX, petindex: 2, style: 1 }));
        expect(result).toEqual({ id: PET_CHICK_ID });
    });

    test("an out-of-range pet seed is clamped", () => {
        const result = parseInspectLink(
            CS2Economy,
            link({ defindex: PET_DEFINDEX, petindex: 3, variations: [{ pattern: 4000000 }] })
        );
        expect(result.seed).toBe(CS2Economy.getById(PET_CATALANA_ID).getMaximumSeed());
    });

    test("a pullet is read as its breed at that level", () => {
        const result = parseInspectLink(CS2Economy, link({ defindex: PET_DEFINDEX, petindex: 5, upgradeLevel: 2 }));
        expect(result).toEqual({ id: PET_POLISH_ID, upgradeLevel: 2 });
        const inventory = new CS2Inventory({ maxItems: 4, storageUnitMaxItems: 4 });
        expect(() => inventory.add(result)).not.toThrow();
    });

    test("a pullet survives a roundtrip and a hen is left unset", () => {
        expect(pet({ id: PET_CATALANA_ID, upgradeLevel: 2 })).toEqual({ id: PET_CATALANA_ID, upgradeLevel: 2 });
        expect(pet({ id: PET_CATALANA_ID, upgradeLevel: 3 })).toEqual({ id: PET_CATALANA_ID });
    });

    test("an upgrade level the pet does not allow is dropped", () => {
        const level = (petindex: number, upgradeLevel: number) =>
            parseInspectLink(CS2Economy, link({ defindex: PET_DEFINDEX, petindex, upgradeLevel })).upgradeLevel;
        expect(level(4, 1)).toBeUndefined();
        expect(level(4, 9)).toBeUndefined();
        expect(level(2, 3)).toBeUndefined();
        expect(level(1, 2)).toBeUndefined();
    });

    test("an unknown pet index throws", () => {
        expect(() => parseInspectLink(CS2Economy, link({ defindex: PET_DEFINDEX, petindex: 99 }))).toThrow();
        expect(() => parseInspectLink(CS2Economy, link({ defindex: PET_DEFINDEX }))).toThrow();
    });

    test("the name shown is the last life stage's", () => {
        const names = (customnames: string[]) =>
            parseInspectLink(CS2Economy, link({ defindex: PET_DEFINDEX, petindex: 3, customnames })).nameTag;
        expect(names(["Chick", "Pullet", "Hen"])).toBe("Hen");
        expect(names(["Chick", "Pullet"])).toBe("Pullet");
        expect(names(["Chick", "", ""])).toBe("Chick");
        expect(names([])).toBeUndefined();
    });

    test("an egg takes no name", () => {
        const result = parseInspectLink(
            CS2Economy,
            link({ defindex: PET_DEFINDEX, petindex: 1, customnames: ["Egg"] })
        );
        expect(result).toEqual({ id: PET_EGG_ID });
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
