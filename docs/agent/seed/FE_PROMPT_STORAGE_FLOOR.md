# Backend handover: numeric floor for every storage unit

Updated requirement, 18/11/2026: every storage unit has a positive integer floor. Warehouse seed data uses floor=1. This replaces the previous warehouse-null rule. No endpoint is added.

## Request contract

- `POST /storage-units`: `floor?: number`; omitted floor defaults to 1.
- `PATCH /storage-units/{id}`: `floor?: number`; omission preserves the stored floor.
- All Unit Type categories, including `warehouse_rack`, follow the same rule: integer >=1. Null, zero, negative and fractional values are invalid.
- Changing Unit Type preserves the floor unless a new valid floor is supplied. There is no category-specific reset to null or requirement to resubmit an existing floor.
- Numeric floor filters are unchanged (`floor >= 1`).

## Response contract

`StorageUnit.floor` is a required `number` in list/detail, facility available units and map layout. Reservation and Contract snapshots (including addendums/unit changes) have numeric floors as well. StorageRack, Incident and CustomerInventory partial refs may omit floor, but a supplied floor is a positive integer and cannot be null.

Display warehouse seed data as “Tầng 1”. Show the numeric floor control for all categories; do not send null, label warehouses as “Không áp dụng”, or convert invalid/missing values to 0. Rack `tierNumber` remains 1–4 and is independent of warehouse `floor`.

OpenAPI and generated tsoa routes are updated in this backend checkout. This task does not change frontend source or deploy a backend service.

## Errors

- Request schema validation returns HTTP 400 for invalid floor values.
- `MESSAGE_CODE_608` (400): A Positive Integer Floor Is Required For Storage Units (service validation).
- Legacy `MESSAGE_CODE_607` is retained as an identifier for compatibility; the warehouse-null error is no longer emitted.

## Data available for review

- Q1–Q5: 19 units each (10 on floor 1 including the warehouse, 9 on floor 2).
- Warehouse codes: `Q1-KHO-01` through `Q5-KHO-01`.
- Each warehouse: 10 racks, 4 tiers per rack; Economy/Standard/Prime = 4/4/2.
- Total: 95 units, 50 racks, 200 tiers. No contract/inventory is seeded at this milestone.

Verify warehouse floor 1, create omission/default, positive integer edits, type changes that preserve the floor, numeric nested snapshots and rejection of null/0/negative/fractional values. UI position/layout choices are outside this handover.
