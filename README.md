# CSE540-Spr26-Group-12

## Project Title
Pharmacy Supply Chain Project
## Team Name
CSE 540 Project Team 12  

## Team Members
- Deepti Panchangam  
- Kudzayi Mwashita  
- Qianhui (Jessie) Yang  
- Rayyan Ashraf  
- Tyler Nguyen  

---

# Pharmacy Supply Chain Project

## Project Description
This project is a blockchain-based pharmacy supply chain system aimed at improving transparency and traceability of pharmaceutical products.

We are currently in the minimum viable product phase. So far, we have implemented a Solidity smart contract, tested it on the Sepolia Ethereum Testnet, and created a frontend to interact with the application. 

The smart contract allows for basic functionalities such as registering products, updating their status, transferring ownership, and viewing product history. Each product is assigned a unique ID using `productCount`, which helps track the product across different stages of the supply chain.

On the Sepolia Testnet, we were able to get the gas cost of operations such as 
- `assignRole()` → assign roles to users  
- `registerProduct()` → register a new product  
- `updateStatus()` → update product status  
- `transferOwnership()` → transfer ownership  


The frontend application uses a direct client-to-contract architecture. The React frontend connects to MetaMask, and MetaMask provides the signer for blockchain transactions. ethers.js is used to call the deployed PharmacySupplyChain smart contract on the Ethereum Sepolia testnet. Because the project focuses on on-chain product registration, role assignment, ownership transfer, status updates, and product history, a separate Express backend was not required.

---

## Features
- Register pharmaceutical products  
- Track product status  
- Transfer ownership between users  
- View product details and history  
- Role-based access control  

---

## Dependencies
- Solidity ^0.8.20  
- Remix IDE  
- MetaMask  
- Ethereum-compatible network (Remix VM / Polygon Amoy)
- npm (for the frontend)

---

## Smart Contract Deployment Instructions

1. Open Remix IDE: https://remix.ethereum.org/  
2. Upload `PharmacySupplyChain.sol`  
3. Compile using Solidity version ^0.8.20  
4. Go to “Deploy & Run Transactions”  
5. Select environment (Remix VM recommended)  
6. Click “Deploy”  

---

## Usage

After deployment, you can use the following functions:

- `assignRole()` → assign roles to users  
- `registerProduct()` → register a new product  
- `updateStatus()` → update product status  
- `transferOwnership()` → transfer ownership  
- `getProduct()` → view product details  
- `getProductHistory()` → view product history  

---

## Frontend Application Instructions

1. cd into pharmacy-frontend
2. Run npm install to get all the frontend dependencies
3. Run npm run dev to run the localhost for the application
4. Connect the frontend with your metamask wallet by clicking connect Metamask and following Metamask's instructions

Notes:
- When connecting Metamask to the frontend application, any operations that change the state of the contract will take gas from the Sepolia testnet, so use https://cloud.google.com/application/web3/faucet/ethereum/sepolia to get Sepolia ETH to test operations such as 
    - "Assign Role"
    - "Register Product" 
    - "Update Status" 
    - "Transfer Ownership"
    - "Recall Product"

---
