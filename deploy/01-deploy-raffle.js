const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({getNamedAccounts,deployments}) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    
    let vrfCoordinatorV2Address;
    let subscriptionId;
    let Fund_Amount = ethers.utils.parseEther("2");

    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
    const interval = networkConfig[chainId]["interval"];


    if (developmentChains.includes(network.name)) {
        let mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = mock.address;
        // Since on dev chain we are creting our own subscription Id
        // Even when u use a testnet SubId is still just a function call being made by the oracle node
        // therefore when we deploy the mock subsription we can crete our own subId by calling the :-respective function 
        const transactionResponse = await mock.createSubscription();
        // transaction receipt is logs of the block 
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.events[0].args.subId;
        // This function helps to fund the subsrciption account 
        // usually the funding is done in Link as it is paid to the oracle node 
        await mock.fundSubscription(subscriptionId, Fund_Amount);
        log("deployed on a local network!!!!!");
    }
    else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2Address"];
        // When we catually create a subsrciption we will update it 
        subscriptionId = networkConfig[chainId]["subId"];
    }


    const args = [vrfCoordinatorV2Address,entranceFee,gasLane,subscriptionId,callbackGasLimit,interval];
    log("Deploying Lottery contract!!!!!!!!");
    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })
    log("Contract has been deployed!!!!!!!!!!");
    log(`${raffle.address} is the address of the contract`)
    

    if (
      !developmentChains.includes(network.name) &&
      process.env.Etherscan_API_KEY
    ) {
      log("Verifying the contract.....");
      await verify(raffle.address, args);
      log("Contract has been verified");
    }

    log("---------------------------------------------------------------");
}

module.exports.tags = ["all", "raffle"];