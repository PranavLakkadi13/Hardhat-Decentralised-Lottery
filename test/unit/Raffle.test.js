const { assert, expect } = require("chai");
const { deployments, getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle", () => {
    let raffle;
    let VRFCoordinatorV2Mock;
    let chainId;
    let entranceFee;
    let deployer;
    let interval;
    beforeEach(async () => {
          deployer = (await getNamedAccounts()).deployer;
          const { fixture } = deployments;
      chainId = network.config.chainId;
          await fixture(["all"]);
          raffle = await ethers.getContract("Raffle", deployer);
          VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
          entranceFee = await raffle.getEntranceFee();  
          interval = await raffle.getInterval();
        });
    describe("constructor", () => {
      it("Initializes the raffle contract", async () => {
        const rafflestate = await raffle.getRaffleState();
        const interval = await raffle.getInterval();
        const entranceFee = await raffle.getEntranceFee();
        const requests = await raffle.getRequestConfirmations();
        assert.equal(rafflestate.toString(), "0");
        assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        assert.equal(entranceFee.toString(), networkConfig[chainId]["entranceFee"]);
        assert.equal(requests.toString(), "3");
      });
    });
      

    describe("Enter Raffle lottery", () => {
          it("reverts when u dont pay enough", async () => {
            await expect(raffle.enterRaffle()).to.be.revertedWith(
              'Raffle__NotEnoughEthEntered'
            );
          });
        it("records when players enter it", async () => {
          await raffle.enterRaffle({ value: entranceFee });
          const playerfromContract = await raffle.getPlayers(0);
          assert.equal(playerfromContract, deployer);
        });
        it("Emits an event", async () => {
          await expect(raffle.enterRaffle({ value: entranceFee })).to.emit(
            raffle,
            "RaffleEnter"
          );
        });
        // to test this function we first need to make sure we set the raffle state => calculating
        // therefore we act as the oracle node to call the perfrom_up_keep function
        it("doesnt allow entrance when raffle winner is being calculated", async () => {
          await raffle.enterRaffle({ value: entranceFee });
          // here we are trying to simulate some instances of the future so using special func
          // since it is a local environment we have the full control to test
          // therefore we use simulation to allow time to pass and test the functions 
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.send("evm_mine", []);
          // await network.provider.request({ method: "evm_mine", params: [] }); // does the same as above
          // since all the conditions for the raffle are true therefore we can act as a oracle node
          await raffle.performUpkeep([] /* since it is empty calldata */);
          await expect(raffle.enterRaffle({ value: entranceFee })).to.be.revertedWith('Raffle__NotOpen');
        });
      });
    
    describe("to check upkeep", () => {
      it("returns false if ppl havent sent any eth", async () => {
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.send("evm_mine", []);
        // since this is a public function, hh would by default it like sending a trx
        // therefore to avoid that confusion we have view, but since this func is not view as well
        // we use the callStatic to get the return value => this help to simulate the response
        // therefore when u use callStatic it call the function like it is a view function 
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
        assert.equal(upkeepNeeded, false);
      });
      it("returns false if raffle isnt open", async () => {
        await raffle.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
        await network.provider.send("evm_mine", []);
        await raffle.performUpkeep("0x"); // 0x == [] in the params
        const State = await raffle.getRaffleState();
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
        assert.equal(State, "1");
        assert.equal(upkeepNeeded, false);
      });
      it("returns false if enough time hasn't passed", async () => {
        await raffle.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]); // use a higher number here if this test fails
        await network.provider.request({ method: "evm_mine", params: [] });
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
        assert(!upkeepNeeded);
      });
      it("returns true if enough time has passed, has players, eth, and is open", async () => {
        await raffle.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ]);
        await network.provider.request({ method: "evm_mine", params: [] });
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
        assert(upkeepNeeded);
      });
    });

    describe("for perform upkeep", () => {
      it("It can only run if checkupkeep is true", async () => {
        await raffle.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 2]);
        await network.provider.request({ method: "evm_mine", params: [] });
        // since here the above call will make sure the checkupkeep function true 
        const tx = await raffle.performUpkeep([]);
        assert(tx, true); // the assert will return true since checkupkeep is true 
      });
      it("it will revert if checkupkeep if false", async () => {
        await expect(raffle.performUpkeep([])).to.be.revertedWith('Raffle__UpKeepNotNeeded');
      });
      it("It updates the raffle state, emits and events and calls the vrf coordinator", async () => {
        await raffle.enterRaffle({ value: entranceFee });
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 2]);
        await network.provider.request({ method: "evm_mine", params: [] });
        const txResponse = await raffle.performUpkeep([]);
        const txReceipt = await txResponse.wait(1);
        // Here to listen for the events i am listening to the log 
        // and a point to remember here is that the first emmited event will be from the vrfcoordinator
        // and then the event of our contract therefore we will listen to the vrfcoordinator events
        const requestId = txReceipt.events[1].args.requestId;
        const state = await raffle.getRaffleState();
        assert(state == 1);
        assert(requestId > 0);
      });

      describe("the test for fullfillRandomWords....", () => {
        // so that soone entered and lottery and the automation can be done to call performupkeep
        beforeEach(async () => {
          await raffle.enterRaffle({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 2]);
          await network.provider.request({ method: "evm_mine", params: [] });
        });
        it("can only be called after perfromupkeep is called", async () => {
          await expect(VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address/* since the parameter taken by the coordinator to call are the 1)requestId, 2)Consumer_contract_address */)).to.be.revertedWith('nonexistent request');
          await expect(VRFCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith('nonexistent request');
        });
        it("picks a winner, resets the array of players, and sends the money ", async () => {
          const new_entrants = 3;
          const index_of_starting_player = 1;
          const accounts = await ethers.getSigners();
          for (let i = index_of_starting_player; i < index_of_starting_player + new_entrants; i++) {
            raffle = raffle.connect(accounts[i]);
            await raffle.enterRaffle({ value: entranceFee });
          };
          const startingtimestamp = await raffle.getLatestTimestamp();

          // performUpkeep (mocks being a chainlink keeper)
          // fullfillrandomwords (mocks being a chainlink vrf)
          // We will have to wait for the fullfillrandomwords to be called
          
          // so instead of simulating the calls rather we want to do it just like in a testnet-> we add a listener
          // the listener will wait for the event logs and called the respective function

          await new Promise(async (resolve, reject) => {
            // raffle.once is the listener
            raffle.once("winnerPicked", async () => {
              console.log("Found the event.....");
              try {
                const recentWinner = await raffle.getRecentWinner();
                console.log(recentWinner);
                const state = await raffle.getRaffleState();
                const endingTimeStamp = await raffle.getLatestTimestamp();
                const numplayers = await raffle.getNumberOfPlayers();
                const winnerendingbalance = await accounts[1].getBalance();
                console.log(winnerendingbalance);
                /*  math to test the tranferred the amount is that when u do just new_entrants .mul entrnacefee
                we forget that the deployer was also a participant therefore we are missing his contribution 
                Therefore when we add product of the new_entrants to the winner and compare with the winner 
                we will 1 entrance fee amount short of the winning balance 

                Since in the beforeeach of this particular test the deployer has sent the entrance fee 
                */
                const product = entranceFee.mul(new_entrants + 1);

                assert.equal(numplayers.toString(), "0");
                assert.equal(state, 0);
                assert(endingTimeStamp > startingtimestamp);
                assert.equal(winnerendingbalance.toString(), startingbalance.add(product).toString());
                resolve();
              } catch (e) {
                reject(e);
              }
            });
            // lister is set 
            // below we will fire the event and listener will listen and catch the event and resolve
            const txResponse = await raffle.performUpkeep("0x");
            const txReceipt = await txResponse.wait(1);
            // call the starting balance before calling fulfillrandomwords function 
            // Bcoz u want to chech the balance of the winner before the lottery has been halted 
            const startingbalance = await accounts[1].getBalance();
            console.log(startingbalance);
            await VRFCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address);
          });
        });
      });
    });
    });