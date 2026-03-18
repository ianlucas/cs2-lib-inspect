/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CS2EconomyItem, CS2InventoryItem, CS2_MIN_SEED, CS2_MIN_STICKER_WEAR } from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { CS2PreviewRarity, CS2_PREVIEW_COMMAND, CS2_PREVIEW_HAS_STICKERS, CS2_PREVIEW_URL } from "./constants.js";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";
import { floatToBytes } from "./utils.js";

function getEconomyItemPreviewData(item: CS2EconomyItem): CEconItemPreviewDataBlock {
    const { def, index, rarity, type, tint } = item;
    const hasStickers = CS2_PREVIEW_HAS_STICKERS.includes(type);
    const hasPaintIndex = !hasStickers && !item.isMusicKit();
    const hasKeychains = item.isKeychain();
    return {
        defindex: def,
        keychains: hasKeychains ? [{ stickerId: index, slot: 0, wrappedSticker: item.stickerId }] : [],
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
                ? item.someStickers().map(([slot, { id, wear, rotation, x, y, schema }]) => ({
                      offsetX: x,
                      offsetY: y,
                      rotation,
                      slot: schema ?? slot,
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
                ? item.someKeychains().map(([slot, { id, x, y, z, seed }]) => {
                      const keychainItem = item.economy.getById(id);
                      return {
                          offsetX: x,
                          offsetY: y,
                          offsetZ: z,
                          pattern: seed,
                          slot,
                          stickerId: keychainItem.index,
                          wrappedSticker: keychainItem.stickerId
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
