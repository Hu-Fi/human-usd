// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IStaking {
    function stake(uint256 _tokens) external;

    function hasAvailableStake(address _indexer) external view returns (bool);
}
