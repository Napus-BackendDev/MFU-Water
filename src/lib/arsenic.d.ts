export type ArsenicLevel = 'normal' | 'watch' | 'over'

export declare const ARSENIC_LIMIT_PPB: number
export declare const ARSENIC_WATCH_PPB: number
export declare const ARSENIC_REVIEW_PPB: number
export declare const arsenicLevelMeta: Record<ArsenicLevel, { label: string; shortLabel: string; note: string; hex: string; darkHex: string }>
export declare function arsenicLevel(ppb: number): ArsenicLevel
export declare function needsAdminReview(ppb: number): boolean
export declare function isPublicSample(ppb: number, status?: string | null): boolean
