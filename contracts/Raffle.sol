// Enter the lottery 
// Pick a verifiably random winner 
// completely automate so that a winner is chosen every X minutess
// Chianlink Oracle - Randomness, Automated Execution (Chainlink Keepers)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

error Raffle__NotEnoughEthEntered();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpKeepNotNeeded(uint currentBalance, uint numPlayers, uint raffleState);


/// @title A Raffle lottery contract
/// @author Pranav Reddy 
/// @notice To create an untamparable truly decentralised random lottery
/// @dev This uses chianlink VRFv2 and Chainlink Keepers 
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface{
    // Type declaration
    enum RaffleState {
        OPEN,
        CALCULATING
    }
    
    // State variables 
    //  Chainlink variables      
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyhash;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // Lottery variables 
    uint private immutable i_entrancefee;
    address payable[] private s_players;
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint private s_lastTimeStamp;
    uint private immutable i_interval;

    // Events 
    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint indexed requestId);
    event winnerPicked(address indexed winner);

    // Functions 
    constructor(address vrfCoordinatorV2 ,uint EntranceFee,bytes32 keyhash,uint64 subscriptionId,uint32 callbackGasLimit,uint interval) VRFConsumerBaseV2(vrfCoordinatorV2){
        i_entrancefee = EntranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_keyhash = keyhash;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable{
        if (msg.value < i_entrancefee){
            revert Raffle__NotEnoughEthEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit RaffleEnter(msg.sender);
    }

    ///  A function when u are using the chainlink Keeper 
    /// @dev The Chianlink nodes look for this function and when it returns "upkeepNeeded"= true,
    ///       the node calls the "performUpKeep" function 
    /// for the chainlink keeper to perform we need to have 3 factors to be true: 
    ///     1) Our time interval must have passed 
    ///     2) Lottery should have atleast 1 player,and a min eth and lottery should be in open state 
    ///     3) Our chainlink Subscription must be funded 
    function checkUpkeep(bytes memory /* checkdata */) public override returns(bool upkeepNeeded, bytes memory /* performData */ ) {
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = (block.timestamp - s_lastTimeStamp) > i_interval;
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasBalance && hasPlayers);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(bytes calldata /* performData */) external override{
        // Request random Number
        // After receiving the number we can do something with it 
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpKeepNotNeeded(address(this).balance, s_players.length, uint(s_raffleState));
        }
        s_raffleState = RaffleState.CALCULATING;
        uint requestId = i_vrfCoordinator.requestRandomWords(
            i_keyhash, // gaslane
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        // This event can be removed since the above functioncall from the object i_vrfCoordinator
        // release event first and that event will consist of requestId so we can use it from there
        emit RequestedRaffleWinner(requestId);

    }

    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        uint indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        s_players = new address payable[](0); 
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit winnerPicked(recentWinner);
    }

    // view/pure functions 
    function getEntranceFee() public view returns(uint) {
        return i_entrancefee;
    }

    function getPlayers(uint index) public view returns(address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns(address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns(RaffleState) {
        return s_raffleState;
    }

    function getNum_Words() public pure returns(uint) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint) {
        return s_players.length;
    }

    function getLatestTimestamp() public view returns(uint) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns(uint){
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint) {
        return i_interval;
    }
}
