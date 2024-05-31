/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CS2EconomyItem,
    CS2InventoryItem,
    CS2RarityColor,
    CS2_MIN_SEED,
    CS2_MIN_STICKER_WEAR,
    CS2_MIN_WEAR
} from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { CEconItemPreviewDataBlock } from "./econ-item-preview-data-block.js";

const CS2_RARITY_INT: Record<string, number | undefined> = {
    [CS2RarityColor.Common]: 1,
    [CS2RarityColor.Uncommon]: 2,
    [CS2RarityColor.Rare]: 3,
    [CS2RarityColor.Mythical]: 4,
    [CS2RarityColor.Legendary]: 5,
    [CS2RarityColor.Ancient]: 6,
    [CS2RarityColor.Immortal]: 7
};

const MISSING_ITEM_DEF: Record<string, number | undefined> = {
    graffiti: 1348,
    patch: 4609,
    sticker: 1209,
    musickit: 1314
};

export const CS2_PREVIEW_URL = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

function floatToBytes(floatValue: number) {
    const floatArray = new Float32Array(1);
    floatArray[0] = floatValue;
    const byteArray = new Uint32Array(floatArray.buffer);
    return byteArray[0];
}

function getEconomyItemPreviewData(item: CS2EconomyItem): CEconItemPreviewDataBlock {
    const { def, index, rarity, type, tint, wearMin } = item;
    const hasStickerObject = MISSING_ITEM_DEF[type] !== undefined;
    const hasPaintIndex = !hasStickerObject && type !== "musickit";
    return {
        defindex: MISSING_ITEM_DEF[type] ?? def,
        musicindex: type === "musickit" ? index : undefined,
        paintindex: hasPaintIndex ? index : undefined,
        paintseed: item.hasSeed() ? CS2_MIN_SEED : undefined,
        paintwear: item.hasWear() ? wearMin ?? CS2_MIN_WEAR : undefined,
        rarity: CS2_RARITY_INT[rarity] ?? 0,
        stickers: hasStickerObject
            ? [
                  {
                      tintId: tint,
                      stickerId: index,
                      slot: 0
                  }
              ]
            : []
    };
}

function getInventoryItemPreviewData(item: CS2InventoryItem): CEconItemPreviewDataBlock {
    const { nameTag, seed, statTrak, stickers, wear } = item;
    const baseAttributes = getEconomyItemPreviewData(item);
    return {
        ...baseAttributes,
        customname: nameTag,
        killeaterscoretype: statTrak !== undefined ? 0 : undefined,
        killeatervalue: statTrak,
        paintseed: item.hasSeed() ? seed ?? CS2_MIN_SEED : undefined,
        paintwear: item.hasWear() ? floatToBytes(wear ?? item.wearMin ?? CS2_MIN_WEAR) : undefined,
        stickers:
            stickers !== undefined
                ? item.someStickers().map(([slot, { id, wear }]) => ({
                      slot,
                      stickerId: item.economy.getById(id).index,
                      wear: wear ?? CS2_MIN_STICKER_WEAR
                  }))
                : baseAttributes.stickers
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
    return `${CS2_PREVIEW_URL}${generateHex(
        item instanceof CS2InventoryItem ? getInventoryItemPreviewData(item) : getEconomyItemPreviewData(item)
    )}`;
}
