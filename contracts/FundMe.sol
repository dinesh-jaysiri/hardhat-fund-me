// SPDX-License-Identifier: MIT
pragma solidity 0.8.9; //^0.8.8 3;13

import "./PriceConverter.sol";

error FundMe_NotOwner();



contract FundMe {
    using PriceConverter for uint256;

    uint256 public constant MINIMUM_USD = 5;

    address[] public funders;
    mapping(address => uint256) public addressToAmountFunded;
    address public immutable i_owner;
    AggregatorV3Interface public priceFeed;

    constructor(address priceFeedAddress){
        i_owner = msg.sender;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    function fund() public payable {

        require(msg.value.getConversionRate(priceFeed)  > MINIMUM_USD, "Didn't send enough!");
        funders.push(msg.sender);
        addressToAmountFunded[msg.sender] +=msg.value;
    }
    
    function withdraw() public onlyOwner{


        for(uint256 funderIndex = 0; funderIndex < funders.length; funderIndex++){
            address funder= funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }

        funders = new address[](0);

        
        (bool callSuccess,) = payable(msg.sender).call{value:address(this).balance}("");
        require(callSuccess,"Call failed");
    }

    modifier onlyOwner {
         if(msg.sender != i_owner) revert FundMe_NotOwner();
         _;
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }
}

    