import * as mysql from "mysql2/promise";
import otterlogs from "../utils/otterlogs";

export class Database {
    private readonly pool: mysql.Pool;

    constructor() {
        // Création du pool de connexions
        this.pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,  // Nombre maximum de connexions simultanées
            queueLimit: 0,  // Pas de limite dans la file d'attente
        });
    }

    async close() {
        try {
            await this.pool.end();  // Ferme le pool et libère toutes les connexions
            otterlogs.log("Pool de connexions fermé.");
        } catch (error) {
            otterlogs.error(`Erreur lors de la fermeture du pool de connexions : ${error}`);
        }
    }

    // Méthode pour exécuter des requêtes génériques
    async query(query: string) {
        try {
            const [results, fields] = await this.pool.execute(query); 
            return { results, fields };
        } catch (error) {
            otterlogs.error(`Erreur lors de la requête : ${error}`);
            return { results: [], fields: [] };
        }
    }

    // Méthode pour effectuer une requête SELECT
    async select(table: string, values: any[]) {
        try {
            const [results, fields] = await this.pool.execute(`SELECT * FROM ${table} WHERE ?`, values);
            return { results, fields };
        } catch (error) {
            otterlogs.error(`Erreur lors de la sélection : ${error}`);
            return { results: [], fields: [] };
        }
    }

    // Méthode pour insérer des données dans une table
    async insert(table: string, values: any) {
        try {
            const columns = Object.keys(values).join(', ');
            const placeholders = Object.keys(values).map(() => '?').join(', ');
            const insertValues = Object.values(values);
            const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
            const [results, fields] = await this.pool.execute(sql, insertValues);
            return { results, fields };
        } catch (error) {
            otterlogs.error(`Erreur lors de l'insertion : ${error}`);
            return { results: [], fields: [] };
        }
    }

    // Méthode pour mettre à jour des données dans une table
    async update(table: string, values: any, condition: string) {
        try {
            const setClause = Object.keys(values)
                .map(key => `${key} = ?`)
                .join(', ');
            const updateValues = Object.values(values);
            const sql = `UPDATE ${table} SET ${setClause} WHERE ${condition}`;
            const [results, fields] = await this.pool.execute(sql, updateValues);
            return { results, fields };
        } catch (error) {
            otterlogs.error(`Erreur lors de la mise à jour : ${error}`);
            return { results: [], fields: [] };
        }
    }

    // Méthode pour supprimer des données dans une table
    async delete(table: string, values: any) {
        try {
            const setClause = Object.keys(values)
                .map(key => `${key} = ?`)
                .join(', ');
            const deleteValues = Object.values(values);
            const sql = `DELETE FROM ${table} WHERE ?`;
            const [results, fields] = await this.pool.execute(sql, deleteValues);
            return { results, fields };
        } catch (error) {
            otterlogs.error(`Erreur lors de la suppression : ${error}`);
            return { results: [], fields: [] };
        }
    }
}
