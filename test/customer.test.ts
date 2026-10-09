import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { conn } from "../dbconnect";

type CustomerInput = {
  name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
};

const makeCustomer = (name: string, overrides: Partial<CustomerInput> = {}): CustomerInput => ({
  name,
  phone: "0812345678",
  address: "1 Test Road",
  latitude: 13.7563,
  longitude: 100.5018,
  ...overrides,
});

afterAll(async () => {
  await conn.end();
});

describe("Customer API", () => {
  it("lists customers", async () => {
    const response = await request(app).get("/customers");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("creates, updates, searches, and deletes a customer", async () => {
    const unique = `CustomerApiTest-${Date.now()}`;
    const createResponse = await request(app)
      .post("/customers")
      .send(makeCustomer(`${unique} Original`));

    expect(createResponse.status).toBe(201);
    const customerId = createResponse.body.customer_id as number;

    try {
      const searchResponse = await request(app)
        .get("/customers/search")
        .query({ name: unique });
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.some((customer: { customer_id: number }) => customer.customer_id === customerId)).toBe(true);

      const updateResponse = await request(app)
        .put(`/customers/${customerId}`)
        .send(makeCustomer(`${unique} Updated`, { phone: "0898765432" }));
      expect(updateResponse.status).toBe(200);

      const [rows] = await conn.query(
        "SELECT name, phone FROM customers WHERE customer_id = ?",
        [customerId],
      );
      const updated = (rows as Array<{ name: string; phone: string }>)[0];
      expect(updated?.name).toBe(`${unique} Updated`);
      expect(updated?.phone).toBe("0898765432");

      const deleteResponse = await request(app).delete(`/customers/${customerId}`);
      expect(deleteResponse.status).toBe(200);
    } finally {
      await conn.query("DELETE FROM customers WHERE customer_id = ?", [customerId]);
    }
  });

  it("rejects invalid customer data and missing search terms or coordinates", async () => {
    const invalidCustomer = await request(app)
      .post("/customers")
      .send(makeCustomer("", { latitude: 91 }));
    expect(invalidCustomer.status).toBe(400);

    const missingSearchName = await request(app).get("/customers/search");
    expect(missingSearchName.status).toBe(400);

    const missingCoordinates = await request(app).get("/customers/nearby");
    expect(missingCoordinates.status).toBe(400);
  });

  it("returns customers within 1 km, ordered by distance", async () => {
    const center = { latitude: 13.7563, longitude: 100.5018 };
    const createResponse = await request(app)
      .post("/customers")
      .send(makeCustomer(`CustomerNearbyTest-${Date.now()}`, center));

    expect(createResponse.status).toBe(201);
    const customerId = createResponse.body.customer_id as number;

    try {
      const response = await request(app)
        .get("/customers/nearby")
        .query({ lat: center.latitude, lng: center.longitude });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((customer: { customer_id: number }) => customer.customer_id === customerId)).toBe(true);

      const distances = response.body.map((customer: { distance_km: number }) => Number(customer.distance_km));
      expect(distances.every((distance: number) => distance <= 1)).toBe(true);
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
    } finally {
      await conn.query("DELETE FROM customers WHERE customer_id = ?", [customerId]);
    }
  });

  it("returns 404 when deleting a customer that does not exist", async () => {
    const response = await request(app).delete("/customers/2147483647");

    expect(response.status).toBe(404);
  });
});
