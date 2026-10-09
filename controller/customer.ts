import express from "express";
import { conn } from "../dbconnect";
import { Customer } from "../model/customer";

export const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM customers");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/search", async (req, res) => {
  const name = req.query.name;
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const [rows] = await conn.query(
      "SELECT * FROM customers WHERE name LIKE ?",
      [`%${name.trim()}%`],
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/nearby", async (req, res) => {
  const lat = typeof req.query.lat === "string" ? Number(req.query.lat) : NaN;
  const lng = typeof req.query.lng === "string" ? Number(req.query.lng) : NaN;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
    !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Valid lat and lng are required" });
  }

  try {
    const [rows] = await conn.query(
      `SELECT customers.*,
        (6371 * ACOS(LEAST(1, GREATEST(-1,
          COS(RADIANS(?)) * COS(RADIANS(latitude)) *
          COS(RADIANS(longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(latitude))
        )))) AS distance_km
       FROM customers
       HAVING distance_km <= 1
       ORDER BY distance_km ASC`,
      [lat, lng, lat],
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const customer: Customer = req.body;
  if (typeof customer.name !== "string" || !customer.name.trim() ||
    typeof customer.phone !== "string" || !customer.phone.trim() ||
    typeof customer.address !== "string" || !customer.address.trim() ||
    !Number.isFinite(customer.latitude) || customer.latitude < -90 || customer.latitude > 90 ||
    !Number.isFinite(customer.longitude) || customer.longitude < -180 || customer.longitude > 180) {
    return res.status(400).json({ message: "Invalid customer data" });
  }

  try {
    const [result] = await conn.query(
      "INSERT INTO customers (name, phone, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      [customer.name.trim(), customer.phone.trim(), customer.address.trim(), customer.latitude, customer.longitude],
    );
    const insertResult = result as { affectedRows: number; insertId: number };
    res.status(201).json({ affected_row: insertResult.affectedRows, customer_id: insertResult.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const customer: Customer = req.body;
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid customer id" });
  }
  if (typeof customer.name !== "string" || !customer.name.trim() ||
    typeof customer.phone !== "string" || !customer.phone.trim() ||
    typeof customer.address !== "string" || !customer.address.trim() ||
    !Number.isFinite(customer.latitude) || customer.latitude < -90 || customer.latitude > 90 ||
    !Number.isFinite(customer.longitude) || customer.longitude < -180 || customer.longitude > 180) {
    return res.status(400).json({ message: "Invalid customer data" });
  }

  try {
    const [result] = await conn.query(
      "UPDATE customers SET name = ?, phone = ?, address = ?, latitude = ?, longitude = ? WHERE customer_id = ?",
      [customer.name.trim(), customer.phone.trim(), customer.address.trim(), customer.latitude, customer.longitude, id],
    );
    const updateResult = result as { affectedRows: number };
    const [rows] = await conn.query("SELECT * FROM customers WHERE customer_id = ?", [id]);
    if ((rows as Customer[]).length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ affected_row: updateResult.affectedRows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid customer id" });
  }

  try {
    const [result] = await conn.query("DELETE FROM customers WHERE customer_id = ?", [id]);
    const deleteResult = result as { affectedRows: number };
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({ affected_row: deleteResult.affectedRows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
