import fs from "fs";
import path from "path";

type CacheItem<T> = {
    value: T;
    updatedAt: string;
};

export class OtterCache<T> {
    private data = new Map<string, CacheItem<T>>();
    private readonly filePath: string;

    private autosaveTimer: NodeJS.Timeout | null = null;
    private autosaveDelay = 60 * 1000; // 1 minute

    constructor(fileName = "cache.json") {
        // Ensure the fileName ends with .json
        if (!fileName.endsWith('.json')) {
            fileName = `${fileName}.json`;
        }

        // Créer le dossier cache s'il n'existe pas
        const cacheDir = path.resolve(process.cwd(), 'cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, {recursive: true});
        }

        // Stocker le fichier dans le dossier cache
        this.filePath = path.resolve(cacheDir, fileName);
        this.loadFromFile();
    }

    /* ------------------------------ BASICS ------------------------------ */
    /**
     * Updates or adds a key-value pair to the internal data storage.
     * The value is saved along with a timestamp indicating when the entry was last updated.
     * Triggers an autosave operation after the data is set.
     *
     * @param {string} key - The key to uniquely identify the value being stored.
     * @param {T} value - The value associated with the given key.
     * @return {void} This method does not return any value.
     */
    set(key: string, value: T): void {
        this.data.set(key, {
            value,
            updatedAt: new Date(Date.now()).toLocaleString('fr-FR', {dateStyle: 'medium', timeStyle: 'medium'}),
        });

        this.scheduleAutosave();
    }

    /**
     * Retrieves the value associated with the given key.
     *
     * @param {string} key - The key for which the value needs to be retrieved.
     * @return {T | null} The value associated with the key, or null if the key does not exist.
     */
    get(key: string): T | null {
        const item = this.data.get(key);
        return item ? item.value : null;
    }

    /**
     * Retrieves all the data stored in the instance.
     *
     * @return {Array|Object} The full collection of data stored in the instance.
     */
    getAll() {
        return this.data;
    }

    /**
     * Deletes the specified key and its associated value from the data store.
     * Also schedules an autosave operation after the deletion.
     *
     * @param {string} key - The key of the item to delete from the data store.
     * @return {void} - This method does not return a value.
     */
    delete(key: string) {
        this.data.delete(key);
        this.scheduleAutosave();
    }

    /**
     * Clears all data from the cache, including the underlying data structure and file.
     */
    clear() {
        this.data.clear();
        this.saveToFile();
    }

    /**
     * Retrieves all the keys from the internal data structure.
     *
     * @return {Array} An array containing all the keys in the data structure.
     */
    keys() {
        return [...this.data.keys()];
    }

    /**
     * Retrieves an array of values stored in the collection.
     * The values are extracted from the internal data structure and returned as a new array.
     *
     * @return {T[]} An array containing all values from the collection.
     */
    values(): T[] {
        return [...this.data.values()].map((d) => d.value);
    }

    /**
     * Retrieves all entries in the data structure as an array of key-value pairs.
     *
     * @return {Array<[string, T]>} An array of key-value pairs, where keys are strings and values are of type T.
     */
    entries(): [string, T][] {
        return [...this.data.entries()].map(([k, v]) => [k, v.value]);
    }

    /**
     * Retrieves the current number of elements in the collection.
     *
     * @return {number} The number of elements in the collection.
     */
    size(): number {
        return this.data.size;
    }

    /* --------------------------- PERSISTENCE ---------------------------- */

    /**
     * Saves the current data entries into a file in JSON format.
     * The data is serialized and written into the file specified by the file path.
     *
     * @return {void} This method does not return a value.
     */
    private saveToFile(): void {
        const json = JSON.stringify([...this.data.entries()], null, 2);
        fs.writeFileSync(this.filePath, json);
    }

    /**
     * Loads data from a file specified by the `filePath` property and populates the `data` property.
     * If the file does not exist, the method returns without taking any action.
     * If the file contents cannot be parsed or an error occurs, an error message*/
    private loadFromFile() {
        if (!fs.existsSync(this.filePath)) return;

        try {
            const arr = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
            this.data = new Map(arr);
        } catch (e) {
            console.error("Erreur de chargement du cache :", e);
        }
    }

    /* ----------------------- AUTO SAVE DEBOUNCED ------------------------ */

    /**
     * Schedules an automatic saving process after a defined delay. If an autosave operation is already in progress, it clears the existing timer and resets it.
     *
     * @return {void} Does not return any value.
     */
    private scheduleAutosave(): void {
        if (this.autosaveTimer) clearTimeout(this.autosaveTimer);

        this.autosaveTimer = setTimeout(() => {
            this.saveToFile();
            this.autosaveTimer = null;
        }, this.autosaveDelay);
    }
}
