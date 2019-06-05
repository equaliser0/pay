import { logger } from "../../core";
import { payDatabase } from "../../core";
import { Wallet } from "../../interfaces";

export class Storage {
    public static async getWallet(username: string, platform: string, token: string): Promise<Wallet> {
        token = token.toUpperCase();
        platform = platform.toLowerCase();

        const query = `SELECT * FROM users WHERE username = $1 AND platform = $2 AND token = $3 LIMIT 1`;
        const result = await payDatabase.query(query, [username, platform, token]);
        let user = result.rows[0];

        // User does not exist, try lowercase version of the username (previously users were not stored in Lowercase)
        if (typeof user === "undefined") {
            username = username.toLowerCase();
            const result = await payDatabase.query(query, [username, platform, token]);
            user = result.rows[0];
        }

        if (typeof user === "undefined" || !user.hasOwnProperty("address") || !user.hasOwnProperty("seed")) {
            return null; // no wallet found
        }

        return {
            address: user.address,
            encryptedSeed: user.seed,
        };
    }

    public static async setWallet(username: string, platform: string, token: string, wallet: Wallet): Promise<boolean> {
        token = token.toUpperCase();
        platform = platform.toLowerCase();
        username = username.toLowerCase();

        const sql: string = `INSERT INTO users (username, address, seed, platform, token) VALUES($1, $2, $3, $4, $5) RETURNING *`;
        const values = [username, wallet.address, wallet.encryptedSeed, platform, token];

        const res = await payDatabase.query(sql, values);
        if (typeof res.rows[0] === "undefined") {
            throw new Error(`Could not create user ${username}`);
        }
        return true;
    }

    public static async checkSubmission(submissionId: string): Promise<boolean> {
        const query: string = "SELECT * FROM submissions WHERE submission = $1 LIMIT 1";
        const result = await payDatabase.query(query, [submissionId]);
        const submission = result.rows[0];
        return typeof submission !== "undefined";
    }

    public static async addSubmission(submissionId: string): Promise<boolean> {
        const sql = "INSERT INTO submissions(submission) VALUES($1) RETURNING *";
        const values = [submissionId];

        await payDatabase.query(sql, values);
        logger.info(`New submission ${submissionId} has been added to the database.`);
        return true;
    }
}