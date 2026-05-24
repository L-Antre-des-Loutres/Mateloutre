// On initialise Ottercache
import {OtterCache} from "../../otterbots/utils/ottercache/ottercache";

/**
 * Caches configuration.
 * Here we define the cache we want to use.
 * @type {OtterCache}
 */

export const exempleCache: OtterCache<string> = new OtterCache("nbMessage")