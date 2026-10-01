/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2EconomyItem, CS2InventoryItem, CS2_MIN_SEED, CS2_MIN_STICKER_WEAR } from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import {
    CS2PreviewRarity,
    CS2_PREVIEW_COMMAND,
    CS2_PREVIEW_HAS_STICKERS,
    CS2_PREVIEW_PET_CHICK_INDEX,
    CS2_PREVIEW_PET_CHICK_UPGRADE_LEVEL,
    CS2_PREVIEW_PET_EGG_UPGRADE_LEVEL,
    CS2_PREVIEW_PET_HEN_UPGRADE_LEVEL,
    CS2_PREVIEW_URL
} from "./constants.js";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";
import { floatToBytes } from "./utils.js";

// A breed is always its full-grown hen; the egg and the chick are pets of their own.
function getPetUpgradeLevel(item: CS2EconomyItem) {
    if (item.isPetEgg()) {
        return CS2_PREVIEW_PET_EGG_UPGRADE_LEVEL;
    }
    return item.variantIndex === CS2_PREVIEW_PET_CHICK_INDEX
        ? CS2_PREVIEW_PET_CHICK_UPGRADE_LEVEL
        : CS2_PREVIEW_PET_HEN_UPGRADE_LEVEL;
}

function getEconomyItemPreviewData(item: CS2EconomyItem): CEconItemPreviewDataBlock {
    const { definitionIndex, variantIndex, rarityColor, type, tintIndex } = item;
    const hasStickers = CS2_PREVIEW_HAS_STICKERS.includes(type);
    const isPet = item.isPet();
    const hasPaintIndex = !hasStickers && !item.isMusicKit() && !isPet;
    const hasKeychains = item.isKeychain();
    return {
        customnames: [],
        defindex: definitionIndex,
        keychains: hasKeychains
            ? [{ stickerId: variantIndex, slot: 0, wrappedSticker: item.displayedSticker?.variantIndex }]
            : [],
        musicindex: item.isMusicKit() ? variantIndex : undefined,
        paintindex: hasPaintIndex ? variantIndex : undefined,
        paintseed: item.hasSeed() && !isPet ? CS2_MIN_SEED : undefined,
        paintwear: item.hasWear() ? floatToBytes(item.getMinimumWear()) : undefined,
        petindex: isPet ? variantIndex : undefined,
        rarity: CS2PreviewRarity[rarityColor] ?? 0,
        stickers: hasStickers ? [{ tintId: tintIndex, stickerId: variantIndex, slot: 0 }] : [],
        upgradeLevel: isPet ? getPetUpgradeLevel(item) : undefined,
        // A pet's seed is not a paint seed: the game carries it as the pattern of a variation.
        variations: isPet ? [{ pattern: item.getMinimumSeed() }] : []
    };
}

function getInventoryItemPreviewData(item: CS2InventoryItem): CEconItemPreviewDataBlock {
    const { nameTag, seed, statTrak, stickers, style, patches, keychains } = item;
    const baseAttributes = getEconomyItemPreviewData(item);
    return {
        ...baseAttributes,
        customnames: nameTag !== undefined ? [nameTag] : [],
        killeaterscoretype: statTrak !== undefined ? 0 : undefined,
        killeatervalue: statTrak,
        paintseed: baseAttributes.paintseed !== undefined ? (seed ?? CS2_MIN_SEED) : undefined,
        paintwear: item.hasWear() ? floatToBytes(item.getWear()) : undefined,
        style,
        variations: baseAttributes.variations.map(({ pattern }) => ({ pattern: seed ?? pattern })),
        stickers:
            stickers !== undefined
                ? item.someStickers().map(([slot, { id, wear, rotation, x, y, schema }]) => ({
                      offsetX: x,
                      offsetY: y,
                      rotation,
                      slot: schema ?? slot,
                      stickerId: item.economy.getById(id).variantIndex,
                      wear: wear ?? CS2_MIN_STICKER_WEAR
                  }))
                : patches !== undefined
                  ? item
                        .somePatches()
                        .map(([slot, patchId]) => ({ slot, stickerId: item.economy.getById(patchId).variantIndex }))
                  : baseAttributes.stickers,
        keychains:
            keychains !== undefined
                ? item.someKeychains().map(([slot, { id, x, y, z, seed }]) => {
                      const keychainItem = item.economy.getById(id);
                      return {
                          offsetX: x,
                          offsetY: y,
                          offsetZ: z,
                          pattern: seed,
                          slot,
                          stickerId: keychainItem.variantIndex,
                          wrappedSticker: keychainItem.displayedSticker?.variantIndex
                      };
                  })
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
        return `${CS2_PREVIEW_COMMAND}${hex}`;
    }
    return `${CS2_PREVIEW_URL}${hex}`;
}
