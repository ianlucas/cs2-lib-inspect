/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CS2EconomyItem,
    CS2InventoryItem,
    CS2ItemType,
    type CS2ItemTypeValues,
    CS2RarityColor,
    CS2_MIN_SEED,
    CS2_MIN_STICKER_WEAR
} from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";

export const CS2PreviewRarity = {
    [CS2RarityColor.Default]: 0,
    [CS2RarityColor.Common]: 1,
    [CS2RarityColor.Uncommon]: 2,
    [CS2RarityColor.Rare]: 3,
    [CS2RarityColor.Mythical]: 4,
    [CS2RarityColor.Legendary]: 5,
    [CS2RarityColor.Ancient]: 6,
    [CS2RarityColor.Immortal]: 7
};

export const CS2_PREVIEW_HAS_STICKERS: CS2ItemTypeValues[] = [
    CS2ItemType.Graffiti,
    CS2ItemType.MusicKit,
    CS2ItemType.Patch,
    CS2ItemType.Sticker
];

export const CS2_PREVIEW_INSPECTABLE_ITEMS: CS2ItemTypeValues[] = [
    CS2ItemType.Agent,
    CS2ItemType.Collectible,
    CS2ItemType.Container,
    CS2ItemType.Gloves,
    CS2ItemType.Graffiti,
    CS2ItemType.Keychain,
    CS2ItemType.Melee,
    CS2ItemType.MusicKit,
    CS2ItemType.Patch,
    CS2ItemType.Sticker,
    CS2ItemType.Weapon
];

export const CS2_PREVIEW_URL = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";
export const CS2_PREVIEW_COMMAND = "csgo_econ_action_preview";

function floatToBytes(floatValue: number) {
    const floatArray = new Float32Array(1);
    floatArray[0] = floatValue;
    const byteArray = new Uint32Array(floatArray.buffer);
    return byteArray[0];
}

function getEconomyItemPreviewData(item: CS2EconomyItem): CEconItemPreviewDataBlock {
    const { def, index, rarity, type, tint } = item;
    const hasStickers = CS2_PREVIEW_HAS_STICKERS.includes(type);
    const hasPaintIndex = !hasStickers && !item.isMusicKit();
    const hasKeychains = item.isKeychain();
    return {
        defindex: def,
        keychains: hasKeychains ? [{ stickerId: index, slot: 0 }] : [],
        musicindex: item.isMusicKit() ? index : undefined,
        paintindex: hasPaintIndex ? index : undefined,
        paintseed: item.hasSeed() ? CS2_MIN_SEED : undefined,
        paintwear: item.hasWear() ? floatToBytes(item.getMinimumWear()) : undefined,
        rarity: CS2PreviewRarity[rarity] ?? 0,
        stickers: hasStickers ? [{ tintId: tint, stickerId: index, slot: 0 }] : []
    };
}

function getInventoryItemPreviewData(item: CS2InventoryItem): CEconItemPreviewDataBlock {
    const { nameTag, seed, statTrak, stickers, patches, keychains } = item;
    const baseAttributes = getEconomyItemPreviewData(item);
    return {
        ...baseAttributes,
        customname: nameTag,
        killeaterscoretype: statTrak !== undefined ? 0 : undefined,
        killeatervalue: statTrak,
        paintseed: item.hasSeed() ? (seed ?? CS2_MIN_SEED) : undefined,
        paintwear: item.hasWear() ? floatToBytes(item.getWear()) : undefined,
        stickers:
            stickers !== undefined
                ? item.someStickers().map(([slot, { id, wear, rotation, x, y }]) => ({
                      offsetX: x,
                      offsetY: y,
                      rotation,
                      slot,
                      stickerId: item.economy.getById(id).index,
                      wear: wear ?? CS2_MIN_STICKER_WEAR
                  }))
                : patches !== undefined
                  ? item
                        .somePatches()
                        .map(([slot, patchId]) => ({ slot, stickerId: item.economy.getById(patchId).index }))
                  : baseAttributes.stickers,
        keychains:
            keychains !== undefined
                ? item.someKeychains().map(([slot, { id, x, y, seed }]) => ({
                      offsetX: x,
                      offsetY: y,
                      pattern: seed,
                      slot,
                      stickerId: item.economy.getById(id).index
                  }))
                : item.isKeychain()
                  ? baseAttributes.keychains.map((keychain) => {
                        keychain.pattern = seed;
                        return keychain;
                    })
                  : baseAttributes.keychains
    };
}

function generateHex(attributes: CEconItemPreviewDataBlock) {
    const payload = Buffer.concat([Uint8Array.from([0]), CEconItemPreviewDataBlock.toBinary(attributes)]);
    const crc = CRC32.buf(payload);
    const xCrc = (crc & 0xffff) ^ (CEconItemPreviewDataBlock.toBinary(attributes).byteLength * crc);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE((xCrc & 0xffffffff) >>> 0, 0);
    const buffer = Buffer.concat([payload, crcBuffer]);
    return buffer.toString("hex").toUpperCase();
}

export function generateInspectLink(item: CS2EconomyItem | CS2InventoryItem) {
    const attributes =
        item instanceof CS2InventoryItem ? getInventoryItemPreviewData(item) : getEconomyItemPreviewData(item);
    const hex = generateHex(attributes);
    // There's a char limit for launching the game using the steam:// protocol.
    if (CS2_PREVIEW_URL.length + hex.length > 300) {
        return `${CS2_PREVIEW_COMMAND} ${hex}`;
    }
    return `${CS2_PREVIEW_URL}${hex}`;
}

export function isCommandInspect(inspectLink: string) {
    return inspectLink.startsWith(CS2_PREVIEW_COMMAND);
}
