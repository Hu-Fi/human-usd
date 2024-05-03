// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
interface ICampaignManager {
    /**
     * @dev Campaign Data
     * Every single stable coin will have its own campaign data,
     * which is used to launch the campaign.
     *
     * recordingOracle: Address of the recording oracle
     * reputationOracle: Address of the reputation oracle
     * exchangeOracle: Address of the exchange oracle
     * recordingOracleFeePercentage: Fee percentage for the recording oracle
     * reputationOracleFeePercentage: Fee percentage for the reputation oracle
     * exchangeOracleFeePercentage: Fee percentage for the exchange oracle
     */
    struct CampaignData {
        address recordingOracle;
        address reputationOracle;
        address exchangeOracle;
        uint8 recordingOracleFeePercentage;
        uint8 reputationOracleFeePercentage;
        uint8 exchangeOracleFeePercentage;
    }

    /**
     * @dev Campaign Tier
     * Every single stable coin will have its own campaign tiers,
     * which is used to launch the campaign.
     * Campaign manager can add/remove the tiers.
     *
     * token: Address of the token used for the payout
     * fundAmount: Amount of the token to be distributed
     * launchCount: Number of times the campaign is launched - used for round robin selection
     */
    struct CampaignTier {
        address token;
        uint256 fundAmount;
        uint256 numberOfLaunches;
    }

    function campaignData()
        external
        view
        returns (
            address recordingOracle,
            address reputationOracle,
            address exchangeOracle,
            uint8 recordingOracleFeePercentage,
            uint8 reputationOracleFeePercentage,
            uint8 exchangeOracleFeePercentage
        );

    function campaignTierCount() external view returns (uint256);

    function campaignTiers(
        uint256 _index
    )
        external
        view
        returns (address token, uint256 fundAmount, uint256 numberOfLaunches);

    function getCampaignTierToLaunch()
        external
        returns (address token, uint256 fundAmount);

    function setCampaignData(
        address _recordingOracle,
        address _reputationOracle,
        address _exchangeOracle,
        uint8 _recordingOracleFeePercentage,
        uint8 _reputationOracleFeePercentage,
        uint8 _exchangeOracleFeePercentage
    ) external;

    function addCampaignTier(address _token, uint256 _fundAmount) external;

    function removeCampaignTier(uint256 _campaignTierId) external;
}
