// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
interface IEscrow {
    function setup(
        address _reputationOracle,
        address _recordingOracle,
        address _exchangeOracle,
        uint8 _reputationOracleFeePercentage,
        uint8 _recordingOracleFeePercentage,
        uint8 _exchangeOracleFeePercentage,
        string memory _url,
        string memory _hash
    ) external;
}
