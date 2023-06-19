const { network } = require("hardhat");
const { developmentChains, BASE_FEE, GAS_PRICE_LINK } = require("../helper-hardhat-config");


module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const args = [BASE_FEE, GAS_PRICE_LINK];

    if (developmentChains.includes(network.name)) {
        log("local network detected!!!!!!!!!");
        log("deploying mocks!!!");

        await deploy("VRFCoordinatorV2Mock", {
          from: deployer,
          args: args,
          log: true,
        });

        log("Mocks deployed!!!!!");
        log("----------------------------------------")
    }
}

module.exports.tags = ["all", "mocks"];