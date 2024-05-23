// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICampaignManager.sol";

contract CampaignManager is
    OwnableUpgradeable,
    UUPSUpgradeable,
    ICampaignManager
{
    ICampaignManager.CampaignData public override campaignData;
    uint256 public override campaignTierCount;
    mapping(uint256 => ICampaignManager.CampaignTier)
        public
        override campaignTiers;

    function initialize() external payable initializer {
        __Ownable_init_unchained();
        __UUPSUpgradeable_init_unchained();
    }

    /**************** View Functions ****************/

    /**
     * @dev Get the campaign tier to launch
     * This function is used to get the campaign tier to launch.
     * It will return the campaign tier id which has the minimum launch count.
     */
    function getCampaignTierToLaunch()
        external
        view
        override
        returns (uint256, address, uint256)
    {
        uint256 tierIndexToLaunch = _getCampaignTierToLaunch();

        ICampaignManager.CampaignTier memory tierToLaunch = campaignTiers[
            tierIndexToLaunch
        ];

        return (tierIndexToLaunch, tierToLaunch.token, tierToLaunch.fundAmount);
    }

    function launchCampaignTier() external override {
        uint256 tierIndexToLaunch = _getCampaignTierToLaunch();

        ICampaignManager.CampaignTier memory tierToLaunch = campaignTiers[
            tierIndexToLaunch
        ];
        tierToLaunch.numberOfLaunches++;
        campaignTiers[tierIndexToLaunch] = tierToLaunch;

        emit CampaignTierLaunched(tierIndexToLaunch);
    }

    /**************** Restricted Functions ****************/

    function setCampaignData(
        address _recordingOracle,
        address _reputationOracle,
        address _exchangeOracle,
        uint8 _recordingOracleFeePercentage,
        uint8 _reputationOracleFeePercentage,
        uint8 _exchangeOracleFeePercentage
    ) external override onlyOwner {
        require(
            _recordingOracle != address(0),
            "CampaignManager: Invalid recording oracle address"
        );
        require(
            _reputationOracle != address(0),
            "CampaignManager: Invalid reputation oracle address"
        );
        require(
            _exchangeOracle != address(0),
            "CampaignManager: Invalid exchange oracle address"
        );
        require(
            _recordingOracleFeePercentage > 0,
            "CampaignManager: Invalid recording oracle fee percentage"
        );
        require(
            _reputationOracleFeePercentage > 0,
            "CampaignManager: Invalid reputation oracle fee percentage"
        );
        require(
            _exchangeOracleFeePercentage > 0,
            "CampaignManager: Invalid exchange oracle fee percentage"
        );

        uint256 totalFeePercentage = uint256(_recordingOracleFeePercentage) +
            uint256(_reputationOracleFeePercentage) +
            uint256(_exchangeOracleFeePercentage);
        require(
            totalFeePercentage <= 100,
            "CampaignManager: Total fee percentage exceeds 100"
        );

        campaignData = ICampaignManager.CampaignData({
            recordingOracle: _recordingOracle,
            reputationOracle: _reputationOracle,
            exchangeOracle: _exchangeOracle,
            recordingOracleFeePercentage: _recordingOracleFeePercentage,
            reputationOracleFeePercentage: _reputationOracleFeePercentage,
            exchangeOracleFeePercentage: _exchangeOracleFeePercentage
        });

        emit CampaignDataUpdated(
            _recordingOracle,
            _reputationOracle,
            _exchangeOracle,
            _recordingOracleFeePercentage,
            _reputationOracleFeePercentage,
            _exchangeOracleFeePercentage
        );
    }

    function addCampaignTier(
        address _token,
        uint256 _fundAmount
    ) external override onlyOwner {
        require(_token != address(0), "CampaignManager: Invalid token address");
        require(_fundAmount > 0, "CampaignManager: Invalid fund amount");

        ICampaignManager.CampaignTier memory _campaignTier = ICampaignManager
            .CampaignTier({
                token: _token,
                fundAmount: _fundAmount,
                numberOfLaunches: 0
            });

        uint256 campaignTierId = campaignTierCount;
        campaignTiers[campaignTierId] = _campaignTier;
        campaignTierCount++;

        emit CampaignTierAdded(campaignTierId, _token, _fundAmount);
    }

    function removeCampaignTier(
        uint256 _campaignTierId
    ) external override onlyOwner {
        require(
            _campaignTierId < campaignTierCount,
            "CampaignManager: Invalid campaign tier id"
        );
        require(
            campaignTiers[_campaignTierId].token != address(0),
            "CampaignManager: Campaign tier not found"
        );

        delete campaignTiers[_campaignTierId];

        emit CampaignTierRemoved(_campaignTierId);
    }

    /**************** Internal Functions ****************/

    function _getCampaignTierToLaunch() internal view returns (uint256) {
        require(
            campaignData.recordingOracle != address(0),
            "CampaignManager: Invalid campaign data"
        );
        require(
            campaignTierCount > 0,
            "CampaignManager: No campaign tier to launch"
        );

        uint256 minNumberOfLaunches = type(uint256).max;
        uint256 tierIndexToLaunch = type(uint256).max;

        for (uint256 i = 0; i < campaignTierCount; i++) {
            ICampaignManager.CampaignTier memory _campaignTier = campaignTiers[
                i
            ];
            if (
                _campaignTier.token != address(0) &&
                _campaignTier.numberOfLaunches < minNumberOfLaunches
            ) {
                minNumberOfLaunches = _campaignTier.numberOfLaunches;
                tierIndexToLaunch = i;
            }
        }

        require(
            tierIndexToLaunch != type(uint256).max,
            "CampaignManager: No campaign tier to launch"
        );

        return tierIndexToLaunch;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**************** Events ****************/
    event CampaignTierLaunched(uint256 campaignTierId);

    event CampaignDataUpdated(
        address recordingOracle,
        address reputationOracle,
        address exchangeOracle,
        uint8 recordingOracleFeePercentage,
        uint8 reputationOracleFeePercentage,
        uint8 exchangeOracleFeePercentage
    );
    event CampaignTierAdded(
        uint256 campaignTierId,
        address token,
        uint256 fundAmount
    );
    event CampaignTierRemoved(uint256 campaignTierId);

    uint256[47] private __gap;
}
