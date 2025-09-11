/**
 * Update the meta-data.
 * Return true if a change has been done, false otherwise.
 */
export interface MetaUpdater<T> {
    updateMeta(meta: any | undefined, data: T): MetaUpdaterResult;

    requireCurrentMeta?: boolean;
    data?: T;
}

export enum MetaUpdaterResult { IS_NOT_UPDATED, IS_UPDATED, MUST_DELETE }