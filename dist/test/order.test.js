"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
const dbconnect_1 = require("../dbconnect");
const validOrder = (customer) => ({
    customer_id: customer.customer_id,
    delivery_date: "2026-10-05",
    quantity: 2,
    unit_price: 65,
    unit_cost: 40,
    is_simulated: 0,
    status: "ACTIVE",
});
let customer;
(0, vitest_1.beforeAll)(async () => {
    const [rows] = await dbconnect_1.conn.query("SELECT customer_id, latitude, longitude FROM customers LIMIT 1");
    const customers = rows;
    if (!customers[0]) {
        throw new Error("Automated test requires at least one customer");
    }
    customer = customers[0];
});
(0, vitest_1.afterAll)(async () => {
    await dbconnect_1.conn.end();
});
(0, vitest_1.describe)("Order API", () => {
    (0, vitest_1.it)("lists orders from the database", async () => {
        const response = await (0, supertest_1.default)(app_1.app).get("/orders");
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(response.body)).toBe(true);
    });
    vitest_1.it.each([0, -1, 4, 1.5])("rejects invalid quantity %s when creating an order", async (quantity) => {
        const response = await (0, supertest_1.default)(app_1.app)
            .post("/orders")
            .send({ ...validOrder(customer), quantity });
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("creates, updates, and deletes an order", async () => {
        const createResponse = await (0, supertest_1.default)(app_1.app)
            .post("/orders")
            .send(validOrder(customer));
        (0, vitest_1.expect)(createResponse.status).toBe(201);
        const orderId = createResponse.body.last_idx;
        try {
            const updateResponse = await (0, supertest_1.default)(app_1.app)
                .put(`/orders/${orderId}`)
                .send({ ...validOrder(customer), quantity: 3 });
            (0, vitest_1.expect)(updateResponse.status).toBe(200);
            const [rows] = await dbconnect_1.conn.query("SELECT quantity FROM orders WHERE order_id = ?", [orderId]);
            (0, vitest_1.expect)(rows[0]?.quantity).toBe(3);
        }
        finally {
            const deleteResponse = await (0, supertest_1.default)(app_1.app).delete(`/orders/${orderId}`);
            (0, vitest_1.expect)(deleteResponse.status).toBe(200);
        }
    });
    (0, vitest_1.it)("creates between 20 and 30 simulated orders", async () => {
        const [beforeRows] = await dbconnect_1.conn.query("SELECT COALESCE(MAX(order_id), 0) AS last_id FROM orders");
        const beforeId = beforeRows[0]?.last_id ?? 0;
        const response = await (0, supertest_1.default)(app_1.app).post("/orders/simulated");
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body.affected_row).toBeGreaterThanOrEqual(20);
        (0, vitest_1.expect)(response.body.affected_row).toBeLessThanOrEqual(30);
        const [createdRows] = await dbconnect_1.conn.query("SELECT order_id, is_simulated FROM orders WHERE order_id > ?", [beforeId]);
        const createdOrders = createdRows;
        (0, vitest_1.expect)(createdOrders).toHaveLength(response.body.affected_row);
        (0, vitest_1.expect)(createdOrders.every((order) => order.is_simulated === 1)).toBe(true);
        for (const order of createdOrders) {
            await dbconnect_1.conn.query("DELETE FROM orders WHERE order_id = ?", [
                order.order_id,
            ]);
        }
    });
    (0, vitest_1.it)("requires coordinates for nearby orders", async () => {
        const response = await (0, supertest_1.default)(app_1.app).get("/orders/nearby");
        (0, vitest_1.expect)(response.status).toBe(400);
    });
    (0, vitest_1.it)("returns nearby orders sorted by distance", async () => {
        const response = await (0, supertest_1.default)(app_1.app)
            .get("/orders/nearby")
            .query({ lat: customer.latitude, lng: customer.longitude });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(response.body)).toBe(true);
        const distances = response.body.map((order) => Number(order.distance_km));
        (0, vitest_1.expect)(distances.every((distance) => distance <= 2)).toBe(true);
        (0, vitest_1.expect)(distances).toEqual([...distances].sort((a, b) => a - b));
    });
});
//# sourceMappingURL=order.test.js.map