import { createPool } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const {
    db_host,
    db_port,
    db_user,
    db_password,
    db_database
} = process.env;

if (!db_host || !db_port || !db_user || !db_password || !db_database) {
    throw new Error("Missing database environment variables");
}

export const conn = createPool({
    connectionLimit: 10,
    host: db_host,
    port: Number(db_port),
    user: db_user,
    password: db_password,
    database: db_database,
});