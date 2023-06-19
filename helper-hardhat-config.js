const { ethers } = require("hardhat");

const networkConfig = {
  11155111: {
    name: "sepolia",
    vrfCoordinatorV2Address: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
    subId: "2958",
    callbackGasLimit: "500000",
    interval: "30",
  },
  80001: {
    name: "polygon",
    vrfCoordinatorV2Address: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
    entranceFee: ethers.utils.parseEther("0.1"),
    gasLane:
      "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
    subId: "5284",
    callbackGasLimit: "500000",
    interval: "30",
  },
  31337: {
    name: "hardhat",
    // mock will be deployed so need not be mentioned here
    entranceFee: ethers.utils.parseEther("0.01"),
    gasLane:
      "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
    callbackGasLimit: "500000",
    interval: "30",
  },
};

const developmentChains = ["hardhat", "localhost"];

// parameters for the mock since the constructor of the VRFcoordinatorV2Mock
const BASE_FEE = ethers.utils.parseEther("0.25"); // this is the premium 

const GAS_PRICE_LINK = 1e9;

module.exports = {
  networkConfig,
  developmentChains,
  BASE_FEE,
  GAS_PRICE_LINK,
};