/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CS_BaseInventoryItem,
    CS_Economy,
    CS_InventoryItem,
    CS_Item,
    CS_MIN_SEED,
    CS_MIN_STICKER_WEAR,
    CS_MIN_WEAR,
    CS_NONE,
    CS_RARITY_ANCIENT_COLOR,
    CS_RARITY_COMMON_COLOR,
    CS_RARITY_IMMORTAL_COLOR,
    CS_RARITY_LEGENDARY_COLOR,
    CS_RARITY_MYTHICAL_COLOR,
    CS_RARITY_RARE_COLOR,
    CS_RARITY_UNCOMMON_COLOR
} from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { CEconItemPreviewDataBlock } from "./econ";

const CS_RARITY_INT: Record<string, number | undefined> = {
    [CS_RARITY_COMMON_COLOR]: 1,
    [CS_RARITY_UNCOMMON_COLOR]: 2,
    [CS_RARITY_RARE_COLOR]: 3,
    [CS_RARITY_MYTHICAL_COLOR]: 4,
    [CS_RARITY_LEGENDARY_COLOR]: 5,
    [CS_RARITY_ANCIENT_COLOR]: 6,
    [CS_RARITY_IMMORTAL_COLOR]: 7
};

const MISSING_ITEM_DEF: Record<string, number | undefined> = {
    graffiti: 1348,
    patch: 4609,
    sticker: 1209,
    musickit: 1314
};

export const CS_PREVIEW_URL = "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

function floatToBytes(floatValue: number) {
    const floatArray = new Float32Array(1);
    floatArray[0] = floatValue;
    const byteArray = new Uint32Array(floatArray.buffer);
    return byteArray[0];
}

function getItemAttributes(item: CS_Item): CEconItemPreviewDataBlock {
    const { def, index, rarity, type, tint, wearmin } = item;
    const hasStickerObject = MISSING_ITEM_DEF[type] !== undefined;
    const hasPaintIndex = !hasStickerObject && type !== "musickit";
    return {
        defindex: MISSING_ITEM_DEF[type] ?? def,
        musicindex: type === "musickit" ? index : undefined,
        paintindex: hasPaintIndex ? index : undefined,
        paintseed: CS_Economy.hasSeed(item) ? CS_MIN_SEED : undefined,
        paintwear: CS_Economy.hasWear(item) ? wearmin ?? CS_MIN_WEAR : undefined,
        rarity: CS_RARITY_INT[rarity] ?? 0,
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

function getBaseInventoryItemAttributes({
    id,
    nametag,
    seed,
    stattrak,
    stickers,
    stickerswear,
    wear
}: CS_BaseInventoryItem): CEconItemPreviewDataBlock {
    const item = CS_Economy.getById(id);
    const baseAttributes = getItemAttributes(item);
    return {
        ...baseAttributes,
        customname: nametag,
        killeaterscoretype: stattrak !== undefined ? 0 : undefined,
        killeatervalue: stattrak,
        paintseed: CS_Economy.hasSeed(item) ? seed ?? CS_MIN_SEED : undefined,
        paintwear: CS_Economy.hasWear(item) ? floatToBytes(wear ?? item.wearmin ?? CS_MIN_WEAR) : undefined,
        stickers:
            stickers !== undefined
                ? stickers
                      .map((sticker, slot) => ({
                          slot,
                          stickerId: CS_Economy.getById(sticker).index,
                          wear: stickerswear?.[slot] ?? CS_MIN_STICKER_WEAR
                      }))
                      .filter(({ stickerId }) => stickerId !== CS_NONE)
                : baseAttributes.stickers
    };
}

function generateHex(attributes: CEconItemPreviewDataBlock) {
    console.log(attributes);
    const payload = Buffer.concat([Uint8Array.from([0]), CEconItemPreviewDataBlock.toBinary(attributes)]);
    const crc = CRC32.buf(payload);
    const xCrc = (crc & 0xffff) ^ (CEconItemPreviewDataBlock.toBinary(attributes).byteLength * crc);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE((xCrc & 0xffffffff) >>> 0, 0);
    const buffer = Buffer.concat([payload, crcBuffer]);
    return buffer.toString("hex").toUpperCase();
}

export function CS_generateInspectLink(item: CS_Item | CS_BaseInventoryItem | CS_InventoryItem) {
    const econ: CEconItemPreviewDataBlock = {
        ...(typeof (item as any).uid === undefined
            ? getItemAttributes(item as CS_Item)
            : getBaseInventoryItemAttributes(item as CS_BaseInventoryItem))
    };
    return `${CS_PREVIEW_URL}${generateHex(econ)}`;
}
