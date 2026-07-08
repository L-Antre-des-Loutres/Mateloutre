import PocketBase from 'pocketbase';
import fs from 'fs';
import yaml from 'js-yaml';
import fetch from 'cross-fetch';
import { PocketBaseAlias, PocketBaseConfig } from './modules/PocketBaseTypes';
import { otterlogs } from '../otterlogs';

/**
 * OtterPocketBase utility class to manage PocketBase interactions using YAML aliases.
 */
export class OtterPocketBase {
    private static pb: PocketBase;
    private static config: PocketBaseConfig;
    private static readonly configPath = 'endpoint_alias.yaml';
    private static initPromise: Promise<void> | null = null;

    /**
     * Initializes the PocketBase instance and loads the YAML configuration.
     * This method is private because it is called automatically by ensureInitialized.
     */
    private static async init(): Promise<void> {
        try {
            if (!fs.existsSync(OtterPocketBase.configPath)) {
                otterlogs.error(`OtterPocketBase: Configuration file not found: ${OtterPocketBase.configPath}`);
                return;
            }

            const fileContents = fs.readFileSync(OtterPocketBase.configPath, 'utf8');
            OtterPocketBase.config = yaml.load(fileContents) as PocketBaseConfig;

            const url = process.env.PB_URL;
            const email = process.env.PB_EMAIL;
            const password = process.env.PB_PASSWORD;

            if (!url) {
                otterlogs.error("OtterPocketBase: PocketBase URL (PB_URL) missing in .env.");
                return;
            }

            OtterPocketBase.pb = new PocketBase(url);
            OtterPocketBase.pb.autoCancellation(false);

            // Désactivation du keep-alive pour Node 18 fetch
            OtterPocketBase.pb.beforeSend = function (reqUrl, options: Record<string, unknown>) {
                options.headers = Object.assign({}, options.headers, { "Connection": "close" });
                options.fetch = fetch; // Inject cross-fetch
                return { url: reqUrl, options };
            };

            const authenticate = async () => {
                if (email && password) {
                    await OtterPocketBase.pb.collection('_superusers').authWithPassword(email, password);
                }
            };

            // Authentification initiale
            try {
                await authenticate();
                otterlogs.debug("OtterPocketBase: Successfully initialized via _superusers!");
            } catch (error) {
                otterlogs.error(`OtterPocketBase: Authentication failed (_superusers): ${error}`);
            }

            // Wrapping global de pb.send pour gérer les erreurs réseau (0) et les expirations de token (401)
            const originalSend = OtterPocketBase.pb.send.bind(OtterPocketBase.pb);
            OtterPocketBase.pb.send = async function (path: string, options: Record<string, unknown>) {
                let lastError: unknown;
                // Jusqu'à 3 tentatives (1 initiale + 2 retries)
                for (let i = 0; i < 3; i++) {
                    try {
                        return await originalSend(path, options);
                    } catch (err: unknown) {
                        lastError = err;
                        
                        if (err && typeof err === 'object' && 'status' in err && err.status === 0) {
                            otterlogs.warn(`OtterPocketBase: Network error 0 on ${path} (attempt ${i + 1}/3). Retrying in ${500 * (i + 1)}ms...`);
                            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
                            continue;
                        }
                        
                        if (err && typeof err === 'object' && 'status' in err && err.status === 401 && email && password) {
                            otterlogs.warn(`OtterPocketBase: Token expired (401) on ${path}. Re-authenticating...`);
                            try {
                                await authenticate();
                            } catch {
                                otterlogs.error("OtterPocketBase: Re-authentication failed.");
                            }
                            continue;
                        }
                        
                        throw err;
                    }
                }
                throw lastError;
            };

        } catch (error) {
            otterlogs.error(`OtterPocketBase: Error during initialization: ${error}`);
        }
    }

    /**
     * Ensures the instance is initialized before any operation.
     */
    private static async ensureInitialized(): Promise<void> {
        if (OtterPocketBase.pb) return;

        if (!OtterPocketBase.initPromise) {
            OtterPocketBase.initPromise = OtterPocketBase.init();
        }

        return OtterPocketBase.initPromise;
    }

    /**
     * Retrieves the configuration of a specific alias.
     */
    private static getAliasConfig(alias: string): PocketBaseAlias | undefined {
        return OtterPocketBase.config?.aliases.find(a => a.alias === alias);
    }

    /**
     * Executes a PocketBase action via an alias defined in the YAML file.
     * 
     * @param alias The unique identifier for the action in the YAML config.
     * @param params Additional parameters depending on the action (ID, data, options, etc.).
     * @returns A promise resolving to the typed result T or undefined on error.
     */
    public static async execByAlias<T>(alias: string, ...params: unknown[]): Promise<T | undefined> {
        await OtterPocketBase.ensureInitialized();

        const aliasConfig = OtterPocketBase.getAliasConfig(alias);

        if (!aliasConfig) {
            otterlogs.error(`OtterPocketBase: Alias "${alias}" not found.`);
            return undefined;
        }

        if (!OtterPocketBase.pb) {
            otterlogs.error("OtterPocketBase: Instance could not be initialized.");
            return undefined;
        }

        try {
            const collection = OtterPocketBase.pb.collection(aliasConfig.collection);
            let result: unknown;

            switch (aliasConfig.action) {
                case 'getList':
                    result = await collection.getList(params[0] as number || 1, params[1] as number || 30, (params[2] || aliasConfig.options) as Record<string, unknown>);
                    break;
                case 'getOne':
                    result = await collection.getOne(params[0] as string, (params[1] || aliasConfig.options) as Record<string, unknown>);
                    break;
                case 'getFullList':
                    result = await collection.getFullList((params[0] || aliasConfig.options) as Record<string, unknown>);
                    break;
                case 'getFirstListItem':
                    result = await collection.getFirstListItem(params[0] as string, (params[1] || aliasConfig.options) as Record<string, unknown>);
                    break;
                case 'create':
                    result = await collection.create(params[0] as Record<string, unknown>, (params[1] || aliasConfig.options) as Record<string, unknown>);
                    break;
                case 'update':
                    result = await collection.update(params[0] as string, params[1] as Record<string, unknown>, (params[2] || aliasConfig.options) as Record<string, unknown>);
                    break;
                case 'delete':
                    result = await collection.delete(params[0] as string, (params[1] || aliasConfig.options) as Record<string, unknown>);
                    break;
                default:
                    otterlogs.error(`OtterPocketBase: Action "${aliasConfig.action}" not supported.`);
                    return undefined;
            }

            return result as T;
        } catch (error) {
            otterlogs.error(`OtterPocketBase: Error executing alias "${alias}": ${error}`);
            return undefined;
        }
    }

    /**
     * Direct access to the PocketBase instance for complex needs.
     * Automatically initializes the connection if necessary.
     */
    public static async getClient(): Promise<PocketBase> {
        await OtterPocketBase.ensureInitialized();
        return OtterPocketBase.pb;
    }
}
