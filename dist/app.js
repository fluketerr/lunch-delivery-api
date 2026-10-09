"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const order_1 = require("./controller/order");
const customer_1 = require("./controller/customer");
exports.app = (0, express_1.default)();
// แปลงข้อมูลแบบข้อความทั่วไป (Text Body)
exports.app.use(express_1.default.text());
// แปลงข้อมูลรูปแบบ JSON (JSON Body)
exports.app.use(express_1.default.json());
exports.app.use("/orders", order_1.router);
exports.app.use("/customers", customer_1.router);
exports.app.use("/", (req, res) => {
    res.send("This is API server for practice project");
});
//# sourceMappingURL=app.js.map