"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
const dbconnect_1 = require("../dbconnect");
const makeCustomer = (name, overrides = {}) => ({
    name,
    phone: "0812345678",
    address: "1 Test Road",
    latitude: 13.7563,
    longitude: 100.5018,
    ...overrides,
});
(0, vitest_1.afterAll)(async () => {
    await dbconnect_1.conn.end();
});
(0, vitest_1.describe)("Customer API", () => {
    (0, vitest_1.it)("lists customers", async () => {
        const response = await (0, supertest_1.default)(app_1.app).get("/customers");
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(response.body)).toBe(true);
    });
    (0, vitest_1.it)("creates, updates, searches, and deletes a customer", async () => {
        const unique = `CustomerApiTest-${Date.now()}`;
        const createResponse = await (0, supertest_1.default)(app_1.app)
            .post("/customers")
            .send(makeCustomer(`${unique} Original`));
        (0, vitest_1.expect)(createResponse.status).toBe(201);
        const customerId = createResponse.body.customer_id;
        try {
            const searchResponse = await (0, supertest_1.default)(app_1.app)
                .get("/customers/search")
                .query({ name: unique });
            (0, vitest_1.expect)(searchResponse.status).toBe(200);
            (0, vitest_1.expect)(searchResponse.body.some((customer) => customer.customer_id === customerId)).toBe(true);
            const updateResponse = await (0, supertest_1.default)(app_1.app)
                .put(`/customers/${customerId}`)
                .send(makeCustomer(`${unique} Updated`, { phone: "0898765432" }));
            (0, vitest_1.expect)(updateResponse.status).toBe(200);
            const [rows] = await dbconnect_1.conn.query("SELECT name, phone FROM customers WHERE customer_id = ?", [customerId]);
            const updated = rows[0];
            (0, vitest_1.expect)(updated?.name).toBe(`${unique} Updated`);
            (0, vitest_1.expect)(updated?.phone).toBe("0898765432");
            const deleteResponse = await (0, supertest_1.default)(app_1.app).delete(`/customers/${customerId}`);
            (0, vitest_1.expect)(deleteResponse.status).toBe(200);
        }
        finally {
            await dbconnect_1.conn.query("DELETE FROM customers WHERE customer_id = ?", [customerId]);
        }
    });
    (0, vitest_1.it)("rejects invalid customer data and missing search terms or coordinates", async () => {
        const invalidCustomer = await (0, supertest_1.default)(app_1.app)
            .post("/customers")
            .send(makeCustomer("", { latitude: 91 }));
        (0, vitest_1.expect)(invalidCustomer.status).toBe(400);
        const missingSearchName = await (0, supertest_1.default)(app_1.app).get("/customers/search");
        (0, vitest_1.expect)(missingSearchName.status).toBe(400);
        const missingCoordinates = await (0, supertest_1.default)(app_1.app).get("/customers/nearby");
        (0, vitest_1.expect)(missingCoordinates.status).toBe(400);
    });
    (0, vitest_1.it)("returns customers within 1 km, ordered by distance", async () => {
        const center = { latitude: 13.7563, longitude: 100.5018 };
        const createResponse = await (0, supertest_1.default)(app_1.app)
            .post("/customers")
            .send(makeCustomer(`CustomerNearbyTest-${Date.now()}`, center));
        (0, vitest_1.expect)(createResponse.status).toBe(201);
        const customerId = createResponse.body.customer_id;
        try {
            const response = await (0, supertest_1.default)(app_1.app)
                .get("/customers/nearby")
                .query({ lat: center.latitude, lng: center.longitude });
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(Array.isArray(response.body)).toBe(true);
            (0, vitest_1.expect)(response.body.some((customer) => customer.customer_id === customerId)).toBe(true);
            const distances = response.body.map((customer) => Number(customer.distance_km));
            (0, vitest_1.expect)(distances.every((distance) => distance <= 1)).toBe(true);
            (0, vitest_1.expect)(distances).toEqual([...distances].sort((a, b) => a - b));
        }
        finally {
            await dbconnect_1.conn.query("DELETE FROM customers WHERE customer_id = ?", [customerId]);
        }
    });
    (0, vitest_1.it)("returns 404 when deleting a customer that does not exist", async () => {
        const response = await (0, supertest_1.default)(app_1.app).delete("/customers/2147483647");
        (0, vitest_1.expect)(response.status).toBe(404);
    });
});
//# sourceMappingURL=customer.test.js.map