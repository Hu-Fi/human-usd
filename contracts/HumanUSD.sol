// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

import "./interfaces/IEscrow.sol";
import "./interfaces/IEscrowFactory.sol";
import "./interfaces/IHMToken.sol";
import "./interfaces/IStaking.sol";

contract HumanUSD is OwnableUpgradeable, ERC20Upgradeable {
    IHMToken public hmToken;
    IEscrowFactory public escrowFactory;
    IStaking public staking;

    struct CampaignConfiguration {
        address recordingOracle;
        address reputationOracle;
        address exchangeOracle;
        uint8 recordingOracleFeePercentage;
        uint8 reputationOracleFeePercentage;
        uint8 exchangeOracleFeePercentage;
        string manifestURL;
        string manifestHash;
    }

    /***
     * @dev This is just for the demo purpose.
     * Ideally, the campaign configuration should be specified by the user
     */
    CampaignConfiguration public campaignConfiguration;

    struct CampaignTier {
        address token;
        uint256 amount;
    }

    CampaignTier[] public campaignTiers;

    uint256 public campaignId;

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _hmToken,
        address _escrowFactory,
        address _staking,
        CampaignConfiguration memory _campaignConfiguration,
        CampaignTier[] memory _campaignTiers
    ) external payable virtual initializer {
        __Ownable_init_unchained(_msgSender());
        __ERC20_init_unchained("HumanUSD", "HUSD");

        __HumanUSD_init_unchained(
            _hmToken,
            _escrowFactory,
            _staking,
            _campaignConfiguration,
            _campaignTiers
        );
    }

    function __HumanUSD_init_unchained(
        address _hmToken,
        address _escrowFactory,
        address _staking,
        CampaignConfiguration memory _campaignConfiguration,
        CampaignTier[] memory _campaignTiers
    ) internal initializer {
        require(_hmToken != address(0), "Invalid HMT address");
        hmToken = IHMToken(_hmToken);

        require(_escrowFactory != address(0), "Invalid escrow factory address");
        escrowFactory = IEscrowFactory(_escrowFactory);

        require(_staking != address(0), "Invalid staking address");
        staking = IStaking(_staking);

        campaignConfiguration = _campaignConfiguration;

        for (uint256 i = 0; i < _campaignTiers.length; i++) {
            campaignTiers.push(_campaignTiers[i]);
        }
    }

    function stakeHMT(uint256 amountToStake) public onlyOwner {
        _safeTransferFrom(
            address(hmToken),
            _msgSender(),
            address(this),
            amountToStake
        );
        hmToken.approve(address(staking), amountToStake);
        staking.stake(amountToStake);
    }

    function mint(
        address to,
        uint256 amount,
        uint256 campaignTierId
    ) public onlyOwner {
        _mint(to, amount);
        _createCampaign(campaignTierId);
    }

    function _createCampaign(uint256 campaignTierId) internal {
        require(campaignTierId < campaignTiers.length, "Invalid campaign tier");
        require(staking.hasAvailableStake(address(this)), "No available stake");
        require(
            campaignConfiguration.recordingOracle != address(0),
            "Invalid campaign configuration"
        );

        campaignId = campaignId + 1;

        CampaignTier memory campaignTier = campaignTiers[campaignTierId];
        address[] memory trustedHandlers = new address[](1);
        trustedHandlers[0] = campaignConfiguration.recordingOracle;
        string memory jobRequestId = Strings.toString(campaignId);

        // Create escrow
        address escrow = escrowFactory.createEscrow(
            campaignTier.token,
            trustedHandlers,
            jobRequestId
        );

        // Setup escrow
        IEscrow(escrow).setup(
            campaignConfiguration.reputationOracle,
            campaignConfiguration.recordingOracle,
            campaignConfiguration.exchangeOracle,
            campaignConfiguration.reputationOracleFeePercentage,
            campaignConfiguration.recordingOracleFeePercentage,
            campaignConfiguration.exchangeOracleFeePercentage,
            campaignConfiguration.manifestURL,
            campaignConfiguration.manifestHash
        );

        // Fund escrow
        _safeTransferFrom(
            campaignTier.token,
            _msgSender(),
            escrow,
            campaignTier.amount
        );
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        SafeERC20.safeTransferFrom(IERC20(token), from, to, value);
    }
}
