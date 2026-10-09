"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conn = void 0;
const promise_1 = require("mysql2/promise");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { db_host, db_port, db_user, db_password, db_database } = process.env;
if (!db_host || !db_port || !db_user || !db_password || !db_database) {
    throw new Error("Missing database environment variables");
}
exports.conn = (0, promise_1.createPool)({
    connectionLimit: 10,
    host: db_host,
    port: Number(db_port),
    user: db_user,
    password: db_password,
    database: db_database,
});
//# sourceMappingURL=dbconnect.js.map