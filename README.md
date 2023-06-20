# Hardhat-Decentralised-Lottery

-> This is a truly decentraised lottery that uses the chainlink VRF to get a verifiably random number which helps choose a random winner 

-> This contract also has been automated using chainlink keepers that will automatically call the VRF function after a certain amount of time has been passed 

```shell
yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv
```
-> add the required dependencies 
-> try running the below tasks 
``` shell 
yarn hardhat help
yarn hardhat node
yarn hardhat deploy
yarn hardhat test
yarn hardhat deploy --network sepolia 
```
