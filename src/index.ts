import {
  CEconItemPreviewDataBlock,
  CEconItemPreviewDataBlock_Sticker,
} from "./econ";
import CRC32 from "crc-32";
import { Buffer } from "buffer";

export enum Rarity {
  STOCK = 0,
  CONSUMER_GRADE = 1,
  INDUSTRIAL_GRADE = 2,
  MIL_SPEC_GRADE = 3,
  RESTRICTED = 4,
  CLASSIFIED = 5,
  COVERT = 6,
  CONTRABAND = 7,
  GOLD = 99,
}

export const previewLink =
  "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20";

const floatToBytes = (floatValue: number): number => {
  const floatArray = new Float32Array(1);
  floatArray[0] = floatValue;
  const byteArray = new Uint32Array(floatArray.buffer);
  return byteArray[0];
};

/**
 * Returns the hex.
 *
 *
 * @args {@link CEconItemPreviewDataBlock}
 * @returns {string} "00180720DA03280638FBEE88F90340B2026213080310021D00000000250000803F2D00000000503D5A64"
 */
const generateHex = ({
  paintwear = 0.001,
  ...props
}: CEconItemPreviewDataBlock): string => {
  const econ: CEconItemPreviewDataBlock = {
    ...props,
    paintwear: floatToBytes(paintwear),
  };

  let payload = CEconItemPreviewDataBlock.toBinary(econ);

  payload = Buffer.concat([Uint8Array.from([0]), payload]);

  let crc = CRC32.buf(payload);

  const x_crc =
    (crc & 0xffff) ^
    (CEconItemPreviewDataBlock.toBinary(econ).byteLength * crc);

  const crcBuffer = Buffer.alloc(4);

  crcBuffer.writeUInt32BE((x_crc & 0xffffffff) >>> 0, 0);

  const buffer = Buffer.concat([payload, crcBuffer]);

  return buffer.toString("hex").toUpperCase();
};

/**
 * Returns the inspect link.
 *
 *
 * @args {@link CEconItemPreviewDataBlock}
 * @returns {string} "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%2000180720DA03280638FBEE88F90340B2026213080310021D00000000250000803F2D00000000503D5A64"
 */
const generateLink = (props: CEconItemPreviewDataBlock) => {
  const hex = generateHex(props);

  return `${previewLink}${hex}`;
};

/**
 * Returns the inspect link.
 *
 *
 * @args {@link CEconItemPreviewDataBlock}
 * @returns {string} "!gen 7 474 306 0.6336590647697449 0 0 0 0 0 0 2 0 0 0"
 */
const generateGen = (props: CEconItemPreviewDataBlock) => {
  const stickers: CEconItemPreviewDataBlock_Sticker[] = [
    { slot: 0, stickerId: 0, wear: 0 },
    { slot: 1, stickerId: 0, wear: 0 },
    { slot: 2, stickerId: 0, wear: 0 },
    { slot: 3, stickerId: 0, wear: 0 },
    { slot: 4, stickerId: 0, wear: 0 },
  ];
  let str = `!gen ${props.defindex} ${props.paintindex} ${props.paintseed} ${props.paintwear}`;

  if (!props.stickers) return str;
  console.log(props.stickers);
  props.stickers.forEach((val) => {
    stickers[val.slot as number].stickerId = val.stickerId;

    if (val.wear) {
      stickers[val.slot as number].wear = val.wear;
    }
  });

  stickers.forEach((val) => {
    str += ` ${val.stickerId} ${val.wear}`;
  });

  return str;
};

export default {
  generateHex,
  generateLink,
  generateGen,
};
export { generateHex, generateLink, generateGen };
