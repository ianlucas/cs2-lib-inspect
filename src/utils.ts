/*---------------------------------------------------------------------------------------------
 *  Copyright (c) candyboyz, Ian Lucas. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function floatToBytes(floatValue: number) {
    const floatArray = new Float32Array(1);
    floatArray[0] = floatValue;
    const byteArray = new Uint32Array(floatArray.buffer);
    return byteArray[0];
}

export function bytesToFloat(byteValue: number) {
    const byteArray = new Uint32Array(1);
    byteArray[0] = byteValue;
    const floatArray = new Float32Array(byteArray.buffer);
    return floatArray[0];
}

export function truncate(value: number, factor: number) {
    return parseFloat(String(value).substring(0, String(factor).length));
}
