// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PharmacySupplyChain
 * @author Kudzayi Mwashita
 * @author Deepti Panchangam
 * @author Qianhui Yang
 * @author Rayyan Ashraf
 * @author Tyler Nguyen
 * @notice Manages pharmaceutical product registration, tracking, ownership transfers, and history.
 */
contract PharmacySupplyChain {

    // ──────────────────────────── Types ────────────────────────────
    // Define the Data structures 

    //using enums to save these as integers- benefits: save gas compared to using strings
    enum Status {
        Manufactured,
        InTransit,
        InWarehouse,
        InPharmacy,
        Sold,
        Recalled,
        Expired
    }
    // defining who does what 
    enum Role {
        None,
        Manufacturer,
        Distributor,
        Pharmacy,
        Regulator
    }
    // a record storing related product data.
    struct Product {
        uint256 id; // unique identifier for the product
        string name; // product name  e.g "Amoxicilling 500mg"
        string batchNumber; // product batch e.g "BAT-2024-0012"
        uint256 manufactureDate; //unit timestamp 
        uint256 expiryDate; // unit timestamp
        string manufacturer; 
        address currentOwner; //Ethereum address for whoever is the current holder
        Status status; // current lifecycle state
        bool exists; // using this to check validity 
    }
    //every action on a product forms an immutable audit trail
    struct HistoryEntry {
        address actor;  //who is performing the action
        Status status; // status change
        address from; // previous owner
        address to; // new owner
        uint256 timestamp; // block.timestamp
        string note; //description of why 
    }

    // ──────────────────────────── State ────────────────────────────
    // deals with contract storage on the blockchain in this case admin, productCount and three mappings which are product data,  

    address public admin;   // deployers address- will have full control
    uint256 public productCount; // this auto-increments in otherwords product ID generator

    mapping(uint256 => Product) public products; // productId is mapped to Product data
    mapping(uint256 => HistoryEntry[]) private productHistory; // productId is mapped to array of historical entries
    mapping(address => Role) public roles; // wallet address  to the role

    // ──────────────────────────── Events ───────────────────────────
    // these are logs emitted to the blockchain. these can also be read by other contacts  off-chain apps can also listen for them. they dont cost much gas.

    event RoleAssigned(address indexed account, Role role);
    event ProductRegistered(uint256 indexed productId, string name, address indexed owner);
    event StatusUpdated(uint256 indexed productId, Status oldStatus, Status newStatus);
    event OwnershipTransferred(uint256 indexed productId, address indexed from, address indexed to);

    // ──────────────────────────── Modifiers ────────────────────────
    // this is where the actual function body runs.

    modifier onlyAdmin() {
        require(msg.sender == admin, "Caller is not admin");
        _;
    }

    modifier onlyAuthorized() {
        require(roles[msg.sender] != Role.None, "Caller is not authorized");
        _;
    }

    modifier productExists(uint256 _productId) {
        require(products[_productId].exists, "Product does not exist");
        _;
    }

    modifier onlyProductOwner(uint256 _productId) {
        require(products[_productId].currentOwner == msg.sender, "Caller is not the product owner");
        _;
    }

    // ──────────────────────────── Constructor ──────────────────────
    // runs once  when contract is deployed, saves deployers address as the admin and assigns this as the regulator role allowing the admin to assign roles.
    // an event is created so that Off -chain systems become aware of the event. After deployment the constructor never runs again.
    constructor() { 
        admin = msg.sender;
        roles[msg.sender] = Role.Regulator;
        emit RoleAssigned(msg.sender, Role.Regulator);
    }

    // ──────────────────────── Role Management ─────────────────────
    // admin gives someone a role in order for the person to interact with the product. The admin can also revoke access.

    /**
     * @notice Assigning a role to an address. Only the admin can call this.
     */
    function assignRole(address _account, Role _role) external onlyAdmin {
        require(_role != Role.None, "Cannot assign None role");
        roles[_account] = _role;
        emit RoleAssigned(_account, _role);
    }

    /**
     * @notice Revoking a user's role.
     */
    function revokeRole(address _account) external onlyAdmin {
        require(_account != admin, "Cannot revoke admin role");
        roles[_account] = Role.None;
        emit RoleAssigned(_account, Role.None);
    }

    // ─────────────────── Product Registration ─────────────────────

    /**
     * @notice Register a new pharmaceutical product.
     */

     //authorized users can create a new product. new products will have increment productId, store product struct, generate history entry
    function registerProduct(
        string calldata _name,
        string calldata _batchNumber,
        uint256 _manufactureDate,
        uint256 _expiryDate,
        string calldata _manufacturer
    ) external onlyAuthorized returns (uint256) {
        require(bytes(_name).length > 0, "Name is required");
        require(_expiryDate > _manufactureDate, "Expiry must be after manufacture date");

        productCount++;
        uint256 newId = productCount;

        products[newId] = Product({
            id: newId,
            name: _name,
            batchNumber: _batchNumber,
            manufactureDate: _manufactureDate,
            expiryDate: _expiryDate,
            manufacturer: _manufacturer,
            currentOwner: msg.sender,
            status: Status.Manufactured,
            exists: true
        });

        productHistory[newId].push(HistoryEntry({
            actor: msg.sender,
            status: Status.Manufactured,
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp,
            note: "Product registered"
        }));

        emit ProductRegistered(newId, _name, msg.sender);
        return newId;
    }

    // ──────────────────── Status Management ───────────────────────

    /**
     * @notice Update the status of a product. Only the current owner can update.
     */

     // only current owner can change the state for example a distributor makes the product as "InWarehouse", context can be added 
    function updateStatus(
        uint256 _productId,
        Status _newStatus,
        string calldata _note
    ) external productExists(_productId) onlyProductOwner(_productId) {
        Product storage product = products[_productId];
        Status oldStatus = product.status;
        require(_newStatus != oldStatus, "Status is already set");

        product.status = _newStatus;

        productHistory[_productId].push(HistoryEntry({
            actor: msg.sender,
            status: _newStatus,
            from: msg.sender,
            to: msg.sender,
            timestamp: block.timestamp,
            note: _note
        }));

        emit StatusUpdated(_productId, oldStatus, _newStatus);
    }

    // ────────────────── Ownership Transfer ────────────────────────

    /**
     * @notice Transfer product ownership to another authorized address.
     */
    function transferOwnership(
        uint256 _productId,
        address _newOwner,
        string calldata _note
    ) external productExists(_productId) onlyProductOwner(_productId) {
        require(_newOwner != address(0), "Invalid new owner");
        require(_newOwner != msg.sender, "Cannot transfer to yourself");
        require(roles[_newOwner] != Role.None, "New owner is not authorized");

        Product storage product = products[_productId];
        address previousOwner = product.currentOwner;
        product.currentOwner = _newOwner;
        product.status = Status.InTransit;

        productHistory[_productId].push(HistoryEntry({
            actor: msg.sender,
            status: Status.InTransit,
            from: previousOwner,
            to: _newOwner,
            timestamp: block.timestamp,
            note: _note
        }));

        emit OwnershipTransferred(_productId, previousOwner, _newOwner);
        emit StatusUpdated(_productId, Status.InTransit, Status.InTransit);
    }

    // ──────────────────── View Functions ──────────────────────────

    /**
     * @notice Get full product details.
     */
    function getProduct(uint256 _productId)
        external
        view
        productExists(_productId)
        returns (Product memory)
    {
        return products[_productId];
    }

    /**
     * @notice Get the complete history of a product.
     */
    function getProductHistory(uint256 _productId)
        external
        view
        productExists(_productId)
        returns (HistoryEntry[] memory)
    {
        return productHistory[_productId];
    }

    /**
     * @notice Get the number of history entries for a product.
     */
    function getHistoryCount(uint256 _productId)
        external
        view
        productExists(_productId)
        returns (uint256)
    {
        return productHistory[_productId].length;
    }

    /**
     * @notice Emergency recall by a Regulator.
     */
    function recallProduct(uint256 _productId, string calldata _reason)
        external
        productExists(_productId)
    {
        require(roles[msg.sender] == Role.Regulator, "Only regulators can recall");

        Product storage product = products[_productId];
        Status oldStatus = product.status;
        product.status = Status.Recalled;

        productHistory[_productId].push(HistoryEntry({
            actor: msg.sender,
            status: Status.Recalled,
            from: product.currentOwner,
            to: product.currentOwner,
            timestamp: block.timestamp,
            note: _reason
        }));

        emit StatusUpdated(_productId, oldStatus, Status.Recalled);
    }
}
