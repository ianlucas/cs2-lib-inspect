/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type CS2BaseInventoryItem, CS2EconomyInstance } from "@ianlucas/cs2-lib";
import { Buffer } from "buffer";
import CRC32 from "crc-32";
import { CS2_PREVIEW_COMMAND, CS2_PREVIEW_URL } from "./constants.js";
import { parseGCInventoryItem } from "./parse-gc-inventory-item.js";
import { CEconItemPreviewDataBlock } from "./Protobufs/cstrike15_gcmessages.js";
import { bytesToFloat } from "./utils.js";

export function isCommandInspect(inspectLink: string) {
    return inspectLink.startsWith(CS2_PREVIEW_COMMAND);
}

export function isSteamInspectLink(inspectLink: string): boolean {
    try {
        const decoded = decodeURI(inspectLink);
        return /^steam:\/\/rungame\/730\/\d+\/[+ ]csgo_econ_action_preview [SM]\d+A\d+D\d+$/.test(decoded);
    } catch {
        return false;
    }
}

function parseHex(hexString: string): CEconItemPreviewDataBlock {
    // Convert hex string to buffer
    const buffer = Buffer.from(hexString.toLowerCase(), "hex");
    // XOR bytes 1..N-1 with the first byte (CS2 native format; no-op when first byte is 0)
    const xorKey = buffer[0];
    for (let i = 1; i < buffer.length; i++) {
        buffer[i] ^= xorKey;
    }
    // Extract the data and CRC portions
    const payload = buffer.slice(0, -4); // Everything except last 4 bytes
    const providedCrcBuffer = buffer.slice(-4); // Last 4 bytes
    const providedCrc = providedCrcBuffer.readUInt32BE(0);
    // Extract just the attributes data (removing the first byte)
    const attributesData = payload.slice(1);
    // Verify CRC
    const calculatedCrc = CRC32.buf(payload);
    const calculatedXCrc = (calculatedCrc & 0xffff) ^ (attributesData.byteLength * calculatedCrc);
    const finalCalculatedCrc = (calculatedXCrc & 0xffffffff) >>> 0;
    if (finalCalculatedCrc !== providedCrc) {
        throw new Error("CRC verification failed");
    }
    // Convert the binary data back to CEconItemPreviewDataBlock
    return CEconItemPreviewDataBlock.fromBinary(attributesData);
}

export function parseInspectLink(economy: CS2EconomyInstance, inspectLink: string): CS2BaseInventoryItem {
    const hex = isCommandInspect(inspectLink)
        ? inspectLink.replace(CS2_PREVIEW_COMMAND, "")
        : inspectLink.replace(CS2_PREVIEW_URL, "");
    const attributes = parseHex(hex);
    return parseGCInventoryItem(economy, {
        defindex: attributes.defindex ?? 0,
        paintindex: attributes.paintindex,
        paintseed: attributes.paintseed,
        floatvalue: attributes.paintwear !== undefined ? bytesToFloat(attributes.paintwear) : undefined,
        killeatervalue: attributes.killeatervalue,
        customname: attributes.customname,
        musicindex: attributes.musicindex,
        stickers: attributes.stickers,
        keychains: attributes.keychains
    });
}
