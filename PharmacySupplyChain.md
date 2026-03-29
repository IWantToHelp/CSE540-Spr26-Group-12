# PharmacySupplyChain Smart Contract Documentation

**Authors:** Kudzayi Mwashita, Deepti Panchangam, Qianhui Yang, Rayyan Ashraf, Tyler Nguyen

**License:** MIT
**Solidity Version:** ^0.8.20

---

## Overview

PharmacySupplyChain is a Solidity smart contract that manages pharmaceutical product registration, tracking, ownership transfers, and full audit history on the Ethereum blockchain. It enforces role-based access control so that only authorized participants (manufacturers, distributors, pharmacies, and regulators) can interact with the system.

---

## Table of Contents

1. [Data Structures](#1-data-structures)
2. [Contract State](#2-contract-state)
3. [Events](#3-events)
4. [Modifiers](#4-modifiers)
5. [Constructor](#5-constructor)
6. [Functions](#6-functions)
   - [Role Management](#role-management)
   - [Product Registration](#product-registration)
   - [Status Management](#status-management)
   - [Ownership Transfer](#ownership-transfer)
   - [View Functions](#view-functions)
   - [Emergency Recall](#emergency-recall)

---

## 1. Data Structures

### `enum Status`

Represents the 7 lifecycle states a pharmaceutical product can be in:

| Value          | Integer | Description                          |
|----------------|---------|--------------------------------------|
| Manufactured   | 0       | Just created at the factory          |
| InTransit      | 1       | Being shipped between parties        |
| InWarehouse    | 2       | Stored in a distribution center      |
| InPharmacy     | 3       | Arrived at a pharmacy/retail outlet  |
| Sold           | 4       | Dispensed to end consumer            |
| Recalled       | 5       | Pulled back due to a safety issue    |
| Expired        | 6       | Past its expiry date                 |

Stored as integers internally to save gas compared to strings.

### `enum Role`

Defines the 4 authorized roles plus a default:

| Value        | Integer | Description                              |
|--------------|---------|------------------------------------------|
| None         | 0       | No access (default for any address)      |
| Manufacturer | 1       | Produces pharmaceutical products         |
| Distributor  | 2       | Transports and warehouses products       |
| Pharmacy     | 3       | Sells products to consumers              |
| Regulator    | 4       | Government/oversight body                |

Every Ethereum address defaults to `None` until the admin assigns a role.

### `struct Product`

Groups all data related to a single pharmaceutical product:

| Field            | Type      | Description                                          |
|------------------|-----------|------------------------------------------------------|
| `id`             | uint256   | Unique identifier (auto-incremented)                 |
| `name`           | string    | Product name (e.g., "Amoxicillin 500mg")             |
| `batchNumber`    | string    | Batch identifier (e.g., "BAT-2024-0012")             |
| `manufactureDate`| uint256   | Unix timestamp of manufacture                        |
| `expiryDate`     | uint256   | Unix timestamp of expiry                             |
| `manufacturer`   | string    | Name of the manufacturing company                    |
| `currentOwner`   | address   | Ethereum address of the current holder               |
| `status`         | Status    | Current lifecycle state                              |
| `exists`         | bool      | `true` if registered; used to distinguish from empty defaults |

The `exists` flag is necessary because Solidity returns zero-values for non-existent mapping entries. Without it, there is no way to tell whether a product ID is unregistered or simply has empty fields.

### `struct HistoryEntry`

Records a single action on a product, forming an immutable audit trail:

| Field       | Type    | Description                                |
|-------------|---------|--------------------------------------------|
| `actor`     | address | Who performed the action                   |
| `status`    | Status  | The status after this action               |
| `from`      | address | Previous owner                             |
| `to`        | address | New owner                                  |
| `timestamp` | uint256 | Block timestamp when the action occurred   |
| `note`      | string  | Free-text description/reason               |

Once pushed to the history array, entries can never be deleted or modified.

---

## 2. Contract State

Persistent variables stored on the blockchain:

| Variable         | Type                                  | Visibility | Description                                      |
|------------------|---------------------------------------|------------|--------------------------------------------------|
| `admin`          | `address`                             | public     | The deployer's address; has supreme control       |
| `productCount`   | `uint256`                             | public     | Auto-incrementing counter; serves as ID generator |
| `products`       | `mapping(uint256 => Product)`         | public     | Maps product ID to Product data                  |
| `productHistory` | `mapping(uint256 => HistoryEntry[])`  | private    | Maps product ID to its array of history entries   |
| `roles`          | `mapping(address => Role)`            | public     | Maps wallet address to assigned Role              |

- `public` variables have auto-generated getter functions.
- `productHistory` is `private` and can only be accessed through the `getProductHistory()` function.

---

## 3. Events

Events are logs emitted to the blockchain. They are inexpensive, cannot be read by other contracts, but can be monitored by off-chain applications (dashboards, frontends, monitoring tools).

| Event                  | Parameters                                                  | Description                     |
|------------------------|-------------------------------------------------------------|---------------------------------|
| `RoleAssigned`         | `account` (indexed), `role`                                 | Emitted when a role is assigned or revoked |
| `ProductRegistered`    | `productId` (indexed), `name`, `owner` (indexed)            | Emitted when a new product is created      |
| `StatusUpdated`        | `productId` (indexed), `oldStatus`, `newStatus`             | Emitted when a product's status changes    |
| `OwnershipTransferred` | `productId` (indexed), `from` (indexed), `to` (indexed)    | Emitted when ownership is transferred      |

The `indexed` keyword makes a field searchable and filterable. For example, a frontend can subscribe to all `OwnershipTransferred` events for a specific address.

---

## 4. Modifiers

Reusable access-control checks. The `_;` placeholder marks where the function body executes. If the `require` fails, the transaction reverts.

| Modifier           | Condition Checked                                    |
|--------------------|------------------------------------------------------|
| `onlyAdmin`        | Caller must be the `admin` address                   |
| `onlyAuthorized`   | Caller must have a role other than `None`            |
| `productExists`    | The given product ID must map to a registered product|
| `onlyProductOwner` | Caller must be the `currentOwner` of the product     |

Multiple modifiers can be stacked on a single function; all checks run before the function body.

---

## 5. Constructor

```solidity
constructor() {
    admin = msg.sender;
    roles[msg.sender] = Role.Regulator;
    emit RoleAssigned(msg.sender, Role.Regulator);
}
```

Runs exactly once at deployment. It:
1. Sets the deployer as `admin`
2. Assigns the deployer the `Regulator` role
3. Emits a `RoleAssigned` event

The constructor can never be called again after deployment.

---

## 6. Functions

### Role Management

#### `assignRole(address _account, Role _role)`

| Property    | Value                                |
|-------------|--------------------------------------|
| Access      | `onlyAdmin`                          |
| Visibility  | `external`                           |
| Emits       | `RoleAssigned`                       |

Assigns a role to an Ethereum address. The role cannot be `None` (use `revokeRole` instead).

#### `revokeRole(address _account)`

| Property    | Value                                |
|-------------|--------------------------------------|
| Access      | `onlyAdmin`                          |
| Visibility  | `external`                           |
| Emits       | `RoleAssigned` (with `Role.None`)    |

Removes an address's role, setting it back to `None`. The admin cannot revoke their own role.

---

### Product Registration

#### `registerProduct(string _name, string _batchNumber, uint256 _manufactureDate, uint256 _expiryDate, string _manufacturer) returns (uint256)`

| Property    | Value                                |
|-------------|--------------------------------------|
| Access      | `onlyAuthorized`                     |
| Visibility  | `external`                           |
| Returns     | The new product's ID                 |
| Emits       | `ProductRegistered`                  |

Registers a new pharmaceutical product. Validations:
- Name must not be empty
- Expiry date must be after manufacture date

The caller becomes the initial `currentOwner`, status is set to `Manufactured`, and the first `HistoryEntry` is created.

---

### Status Management

#### `updateStatus(uint256 _productId, Status _newStatus, string _note)`

| Property    | Value                                          |
|-------------|-------------------------------------------------|
| Access      | `productExists`, `onlyProductOwner`             |
| Visibility  | `external`                                      |
| Emits       | `StatusUpdated`                                 |

Updates the lifecycle status of a product. Only the current owner can call this. The new status must differ from the current status. A history entry is recorded with the provided note.

---

### Ownership Transfer

#### `transferOwnership(uint256 _productId, address _newOwner, string _note)`

| Property    | Value                                          |
|-------------|-------------------------------------------------|
| Access      | `productExists`, `onlyProductOwner`             |
| Visibility  | `external`                                      |
| Emits       | `OwnershipTransferred`, `StatusUpdated`         |

Transfers product ownership to another authorized user. Validations:
- New owner cannot be the zero address
- New owner cannot be the caller (no self-transfer)
- New owner must have an assigned role

The product status is automatically set to `InTransit` upon transfer.

---

### View Functions

These are read-only functions that cost no gas when called externally.

#### `getProduct(uint256 _productId) returns (Product)`

Returns the full `Product` struct for a given product ID.

#### `getProductHistory(uint256 _productId) returns (HistoryEntry[])`

Returns the complete array of history entries for a product — the full audit trail from registration to current state.

#### `getHistoryCount(uint256 _productId) returns (uint256)`

Returns the number of history entries for a product. Useful for pagination in frontend applications.

---

### Emergency Recall

#### `recallProduct(uint256 _productId, string _reason)`

| Property    | Value                                |
|-------------|--------------------------------------|
| Access      | `Regulator` role required            |
| Visibility  | `external`                           |
| Emits       | `StatusUpdated`                      |

Allows a regulator to immediately set any product's status to `Recalled`, regardless of who currently owns it. The reason is recorded in the history. This is a safety mechanism for contaminated or dangerous products.

---

## Product Lifecycle Flow

```
Manufactured --> InTransit --> InWarehouse --> InTransit --> InPharmacy --> Sold
                                                  |
                                                  v
                                              Recalled  (regulator override at any point)
                                              Expired   (owner marks as expired)
```

---

## Access Control Summary

| Function            | Admin | Manufacturer | Distributor | Pharmacy | Regulator |
|---------------------|-------|--------------|-------------|----------|-----------|
| assignRole          | Yes   | No           | No          | No       | No        |
| revokeRole          | Yes   | No           | No          | No       | No        |
| registerProduct     | Yes   | Yes          | Yes         | Yes      | Yes       |
| updateStatus        | Owner | Owner        | Owner       | Owner    | Owner     |
| transferOwnership   | Owner | Owner        | Owner       | Owner    | Owner     |
| getProduct          | All   | All          | All         | All      | All       |
| getProductHistory   | All   | All          | All         | All      | All       |
| getHistoryCount     | All   | All          | All         | All      | All       |
| recallProduct       | No    | No           | No          | No       | Yes       |

*"Owner" means the current owner of that specific product, regardless of role.*
