// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

interface IIdentity {
    function isIdentityDeployer(string memory, address) external returns (bool);
}
