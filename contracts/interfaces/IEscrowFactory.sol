// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IEscrowFactory {
    function createEscrow(
        address token,
        address[] memory trustedHandlers,
        string memory jobRequesterId
    ) external returns (address);
}
