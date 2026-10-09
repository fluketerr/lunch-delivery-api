"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const dbconnect_1 = require("../dbconnect");
exports.router = express_1.default.Router();
exports.router.get("/", async (req, res) => {
    const [rows] = await dbconnect_1.conn.query("SELECT * FROM `orders`");
    res.json(rows);
});
exports.router.get("/with-customers", async (req, res) => {
    const [rows] = await dbconnect_1.conn.query("SELECT * FROM `orders`, `customers` WHERE `orders`.`customer_id` = `customers`.`customer_id`");
    res.json(rows);
});
exports.router.get("/nearby", async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({
            error: "lat และ lng จำเป็นต้องระบุ",
        });
    }
    const [rows] = await dbconnect_1.conn.query(`
    SELECT
      orders.*,
      customers.name,
      customers.phone,
      customers.address,
      customers.latitude,
      customers.longitude,

      (
        6371 * ACOS(
          COS(RADIANS(?))
          * COS(RADIANS(customers.latitude))
          * COS(RADIANS(customers.longitude) - RADIANS(?))
          + SIN(RADIANS(?))
          * SIN(RADIANS(customers.latitude))
        )
      ) AS distance_km

    FROM orders
    JOIN customers
      ON orders.customer_id = customers.customer_id

    HAVING distance_km <= 2
    ORDER BY distance_km ASC
    `, [lat, lng, lat]);
    res.json(rows);
});
exports.router.post("/simulated", async (req, res) => {
    try {
        const [customers] = await dbconnect_1.conn.query("SELECT * FROM customers");
        let customersList = customers;
        const orders = [];
        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Bangkok",
        });
        const counter = Math.floor(Math.random() * 11) + 20;
        // สุ่มจำนวนคำสั่งซื้อ 20 - 30
        for (let i = 1; i <= counter; i++) {
            const randomCustomer = customersList[Math.floor(Math.random() * customersList.length)];
            if (!randomCustomer) {
                throw new Error("ไม่พบข้อมูลลูกค้า");
            }
            orders.push([
                randomCustomer.customer_id,
                today,
                Math.floor(Math.random() * 3) + 1,
                65,
                40,
                true,
                "ACTIVE",
            ]);
        }
        const [result] = await dbconnect_1.conn.query(`
      INSERT INTO orders
      (
        customer_id,
        delivery_date,
        quantity,
        unit_price,
        unit_cost,
        is_simulated,
        status
      )
      VALUES ?
      `, [orders]);
        const insertResult = result;
        res.status(201).json({
            affected_row: insertResult.affectedRows, // จำนวนแถวที่ได้รับผลกระทบ (สำเร็จ = 1)
            last_idx: insertResult.insertId, // รหัสไอดีล่าสุดที่ระบบสร้างขึ้นให้อัตโนมัติ (Auto increment id)
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.router.post("/", async (req, res) => {
    try {
        let order = req.body;
        console.log(req.body);
        if (!Number.isInteger(order.quantity) ||
            order.quantity < 1 ||
            order.quantity > 3) {
            return res.status(400).json({
                message: "1 order ต้องมีอย่างน้อย 1 กล่อง และสามารถมีได้ไม่เกิน 3 กล่อง",
            });
        }
        let sql = "INSERT INTO `orders`(`customer_id`, `delivery_date`, `quantity`, `unit_price`, `unit_cost`, `is_simulated`, `status`) VALUES (?,?,?,?,?,?,?)";
        const [result] = await dbconnect_1.conn.query(sql, [
            order.customer_id,
            order.delivery_date,
            order.quantity,
            order.unit_price,
            order.unit_cost,
            order.is_simulated,
            order.status,
        ]);
        const insertResult = result;
        res.status(201).json({
            affected_row: insertResult.affectedRows, // จำนวนแถวที่ได้รับผลกระทบ (สำเร็จ = 1)
            last_idx: insertResult.insertId, // รหัสไอดีล่าสุดที่ระบบสร้างขึ้นให้อัตโนมัติ (Auto increment id)
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.router.delete("/:id", async (req, res) => {
    try {
        let id = req.params.id;
        const [result] = await dbconnect_1.conn.query("DELETE FROM orders WHERE order_id = ?", [
            id,
        ]);
        const deleteResult = result;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.status(200).json({ affected_row: deleteResult.affectedRows });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.router.delete("/", async (req, res) => {
    try {
        const [result] = await dbconnect_1.conn.query("DELETE FROM orders WHERE is_simulated = true");
        const deleteResult = result;
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.status(200).json({ affected_row: deleteResult.affectedRows });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.router.put("/:id", async (req, res) => {
    try {
        let id = req.params.id;
        const [resultCheck] = await dbconnect_1.conn.query("SELECT * FROM orders WHERE order_id = ?", [id]);
        const existingOrder = resultCheck;
        if (existingOrder.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        let order = req.body;
        if (!Number.isInteger(order.quantity) ||
            order.quantity < 1 ||
            order.quantity > 3) {
            return res.status(400).json({
                message: "1 order ต้องมีอย่างน้อย 1 กล่อง และสามารถมีได้ไม่เกิน 3 กล่อง",
            });
        }
        let sql = "UPDATE `orders` SET `customer_id`=?, `delivery_date`=?, `quantity`=?, `unit_price`=?, `unit_cost`=?, `is_simulated`=?, `status`=? WHERE `order_id`=?";
        const [result] = await dbconnect_1.conn.query(sql, [
            order.customer_id,
            order.delivery_date,
            order.quantity,
            order.unit_price,
            order.unit_cost,
            order.is_simulated,
            order.status,
            id,
        ]);
        const updateResult = result;
        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.status(200).json({ affected_row: updateResult.affectedRows });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
//# sourceMappingURL=order.js.map