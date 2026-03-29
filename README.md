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

We are currently in the early development phase. So far, we have implemented a Solidity smart contract and tested it using Remix IDE. The system allows basic functionalities such as registering products, updating their status, transferring ownership, and viewing product history.

Each product is assigned a unique ID using `productCount`, which helps track the product across different stages of the supply chain.

In future phases, we plan to build a frontend application to allow users to interact with the system more easily.

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
- MetaMask (optional)  
- Ethereum-compatible network (Remix VM / Polygon Amoy)

---

## Deployment Instructions

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

## Future Work
- Build frontend interface  
- Connect smart contract with UI  
- Improve testing and debugging  
- Add more validations  
