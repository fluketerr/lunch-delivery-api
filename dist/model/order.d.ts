export interface Order {
    order_id: number;
    customer_id: number;
    delivery_date: Date;
    quantity: number;
    unit_price: string;
    unit_cost: string;
    is_simulated: number;
    status: Status;
}
export type Status = "ACTIVE";
//# sourceMappingURL=order.d.ts.map