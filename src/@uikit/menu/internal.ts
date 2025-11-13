import {MenuManager} from "./core.ts";

//region HierarchyBuilder

export interface WithKeyAndItems<T> {
    key: string;
    items?: (T & WithKeyAndItems<T>)[];
}

export class HierarchyBuilder<T extends WithKeyAndItems<T>> {
    private normalizer: ((v: T) => void)|undefined;

    constructor(private readonly root: T, public readonly offset = -1, public readonly parentItems?: T[]) {
    }

    setNormalizer(f: (v: T) => void) {
        this.normalizer = f;
    }

    get value(): T {
        return this.root;
    }

    set value(value: Omit<T, 'key' | 'items'>) {
        for (let entry in value) {
            if (value.hasOwnProperty(entry)) {
                (this.root as any)[entry] = (value as any)[entry];
            }
        }

        if (this.normalizer) {
            this.applyNormalizer(this.root);
        }
    }

    /**
     * Return a HierarchyBuilder on the selected item.

     * @param keys string[]
     *      Traverse the hierarchy to search the item with the corresponding key.
     *      If it doesn't exist, create it.
     *
     * @param keys (e: T) => boolean
     *      Search an element in the direct item of the element.
     *      Returns a detached HierarchyBuilder if not found.
     */
    selectItem(keys: string[]|((e: T) => boolean)):  HierarchyBuilder<T> {
        if (keys instanceof Array) {
            let keyOffset = 0;
            const maxKeyOffset = keys.length;
            if (!maxKeyOffset) return this;

            let selected = this.root;
            let selectedOffset = -1;
            let selectedParent = this.parentItems;

            while (true) {
                if (keyOffset === maxKeyOffset) {
                    const n = new HierarchyBuilder(selected, selectedOffset, selectedParent);
                    n.normalizer = this.normalizer;
                    return n;
                }

                const key = keys[keyOffset++];
                if (!selected.items) selected.items = [];

                let isFound = false;
                selectedParent = selected.items;

                let entryOffset = 0;

                for (let entry of selected.items) {
                    if (entry.key===key) {
                        selected = entry;
                        selectedOffset = entryOffset;
                        isFound = true;
                        break;
                    }

                    entryOffset++;
                }

                if (!isFound) {
                    selectedOffset = selected.items!.length;
                    selected.items!.push(selected = this.normalize({key} as T));
                }
            }
        } else {
            if (this.root.items) {
                let entryOffset = 0;

                for (let entry of this.root.items!) {
                    if (keys(entry)) {
                        const n = new HierarchyBuilder<T>(entry, entryOffset, this.parentItems);
                        n.normalizer = this.normalizer;
                        return n;
                    }

                    entryOffset++;
                }
            }

            return gDetachedHierarchyBuilder as unknown as HierarchyBuilder<T>;
        }
    }

    normalize(entry: T): T {
        if (this.normalizer) this.applyNormalizer(entry);
        return entry;
    }

    parentAddBefore(entry: T) {
        if (this.parentItems && this.offset >= 0) {
            if (this.normalizer) this.applyNormalizer(entry);
            this.parentItems.splice(this.offset, 0, entry);
        }
    }

    parentAddAfter(entry: T) {
        if (this.parentItems && this.offset >= 0) {
            if (this.normalizer) this.applyNormalizer(entry);
            this.parentItems.splice(this.offset + 1, 0, entry);
        }
    }

    parentWrap(entry: T) {
        if (this.parentItems && this.offset >= 0) {
            if (this.normalizer) this.applyNormalizer(entry);
            this.parentItems.splice(this.offset + 1, 0, entry);
            this.parentItems.splice(this.offset, 0, entry);
        }
    }

    append(entry: T) {
        if (this.normalizer) {
            this.applyNormalizer(entry);
        }

        if (!this.root.items) {
            this.root.items = [entry];
        }
        else {
            let alreadyExists = this.root.items.find(e => e.key === entry.key);

            if (alreadyExists) {
                for (let key in entry) {
                    if (entry.hasOwnProperty(key)) {
                        (alreadyExists as any)[key] = (entry as any)[key];
                    }
                }
            } else {
                this.root.items.push(entry);
            }
        }
    }

    prepend(entry: T) {
        if (this.normalizer) {
            this.applyNormalizer(entry);
        }

        if (!this.root.items) {
            this.root.items = [entry];
        }
        else {
            let alreadyExists = this.root.items.find(e => e.key === entry.key);

            if (alreadyExists) {
                for (let key in entry) {
                    if (entry.hasOwnProperty(key)) {
                        (alreadyExists as any)[key] = (entry as any)[key];
                    }
                }
            } else {
                this.root.items.splice(0, 0, entry);
            }
        }
    }

    /**
     * Search an element in the current items by applying a filter function.
     * Returns the first corresponding entry.
     */
    searchFirstEntry(filter: (e: T) => boolean): T|undefined {
        for (let entry of this.root.items!) {
            if (filter(entry)) return entry;
        }

        return undefined;
    }

    private applyNormalizer(entry: T) {
        if (this.normalizer) {
            this.normalizer(entry);
        }

        if (entry.items) {
            for (let item of entry.items) {
                this.applyNormalizer(item);
            }
        }
    }
}

const gDetachedHierarchyBuilder = new HierarchyBuilder({key: ""});

//endregion

export function getDefaultMenuManager(): MenuManager {
    if (!gMenuManager) {
        let mustRemoveTrailingSlashs = (window as any)["__JOPI_OPTIONS__"].removeTrailingSlashs === true
        gMenuManager = new MenuManager(mustRemoveTrailingSlashs);
    }

    return gMenuManager;
}

let gMenuManager: MenuManager|undefined;