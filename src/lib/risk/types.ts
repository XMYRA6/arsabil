/** WMS 1.1.1 bbox sırası: lon,lat (minLon,minLat,maxLon,maxLat). */
export type BBox = { minLon: number; minLat: number; maxLon: number; maxLat: number }

/** pngjs'in verdiği ham RGBA tamponu. data uzunluğu = width*height*4. */
export type RGBAImage = { width: number; height: number; data: Uint8Array | Buffer }

export type RiskMeasurement = {
    faultDistanceM: number | null
    gammaF: number
    floodQ100: boolean
    suggestedR: number
}
