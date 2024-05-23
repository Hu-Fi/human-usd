// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

import "./interfaces/ICampaignManager.sol";
import "./interfaces/IEscrow.sol";
import "./interfaces/IEscrowFactory.sol";
import "./interfaces/IHMToken.sol";
import "./interfaces/IStaking.sol";

contract HumanUSD is OwnableUpgradeable, ERC20Upgradeable, UUPSUpgradeable {
    address public addressUSDT;

    IHMToken public hmToken;
    IEscrowFactory public escrowFactory;
    IStaking public staking;
    ICampaignManager public campaignManager;
    uint256 public lastCampaignId;

    uint256 public tokensRequiredForCampaign;
    uint256 public tokensRemainingForCampaign;

    function initialize(
        address _addressUSDT,
        address _hmToken,
        address _escrowFactory,
        address _staking,
        uint256 _tokensRequiredForCampaign
    ) external payable virtual initializer {
        __Ownable_init_unchained();
        __ERC20_init_unchained("HumanUSD", "HUSD");

        __HumanUSD_init_unchained(
            _addressUSDT,
            _hmToken,
            _escrowFactory,
            _staking,
            _tokensRequiredForCampaign
        );
    }

    function __HumanUSD_init_unchained(
        address _addressUSDT,
        address _hmToken,
        address _escrowFactory,
        address _staking,
        uint256 _tokensRequiredForCampaign
    ) internal initializer {
        require(_addressUSDT != address(0), "Invalid USDT address");
        addressUSDT = _addressUSDT;

        require(_hmToken != address(0), "Invalid HMT address");
        hmToken = IHMToken(_hmToken);

        require(_escrowFactory != address(0), "Invalid escrow factory address");
        escrowFactory = IEscrowFactory(_escrowFactory);

        require(_staking != address(0), "Invalid staking address");
        staking = IStaking(_staking);

        tokensRequiredForCampaign = _tokensRequiredForCampaign;
        tokensRemainingForCampaign = 0;
        lastCampaignId = 0;
    }

    function setCampaignManager(address _campaignManager) external onlyOwner {
        require(_campaignManager != address(0), "Invalid campaign manager");
        campaignManager = ICampaignManager(_campaignManager);
    }

    function stakeHMT(uint256 amountToStake) external onlyOwner {
        _safeTransferFrom(
            address(hmToken),
            _msgSender(),
            address(this),
            amountToStake
        );
        hmToken.approve(address(staking), amountToStake);
        staking.stake(amountToStake);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _safeTransferFrom(addressUSDT, _msgSender(), address(this), amount);

        _mint(to, amount);
    }

    function getCampaignTierToLaunch(
        uint256 amount
    ) external view returns (address, uint256) {
        require(
            tokensRemainingForCampaign + amount >= tokensRequiredForCampaign,
            "Not enough tokens to launch a campaign"
        );

        require(
            campaignManager != ICampaignManager(address(0)),
            "Campaign manager not set"
        );

        (, address token, uint256 fundAmount) = campaignManager
            .getCampaignTierToLaunch();

        return (token, fundAmount);
    }

    function mint(
        address to,
        uint256 amount,
        string memory manifestURL,
        string memory manifestHash
    ) public onlyOwner {
        _safeTransferFrom(addressUSDT, _msgSender(), address(this), amount);

        _mint(to, amount);

        if (
            campaignManager != ICampaignManager(address(0)) &&
            IStaking(staking).hasAvailableStake(address(this))
        ) {
            tokensRemainingForCampaign = tokensRemainingForCampaign + amount;
            while (tokensRemainingForCampaign >= tokensRequiredForCampaign) {
                _createCampaign(manifestURL, manifestHash);
                tokensRemainingForCampaign =
                    tokensRemainingForCampaign -
                    tokensRequiredForCampaign;
            }
        }
    }

    function _createCampaign(
        string memory manifestURL,
        string memory manifestHash
    ) internal {
        (, address token, uint256 fundAmount) = campaignManager
            .getCampaignTierToLaunch();

        campaignManager.launchCampaignTier();

        (
            address recordingOracle,
            address reputationOracle,
            address exchangeOracle,
            uint8 recordingOracleFeePercentage,
            uint8 reputationOracleFeePercentage,
            uint8 exchangeOracleFeePercentage
        ) = campaignManager.campaignData();

        if (IERC20(token).balanceOf(address(this)) < fundAmount) {
            // Silently fail if we don"t have enough tokens to fund the campaign
            return;
        }

        lastCampaignId = lastCampaignId + 1;

        address[] memory trustedHandlers = new address[](1);
        trustedHandlers[0] = address(this);
        string memory jobRequestId = Strings.toString(lastCampaignId);

        // Create escrow
        address escrow = escrowFactory.createEscrow(
            token,
            trustedHandlers,
            jobRequestId
        );

        // Setup escrow
        IEscrow(escrow).setup(
            reputationOracle,
            recordingOracle,
            exchangeOracle,
            reputationOracleFeePercentage,
            recordingOracleFeePercentage,
            exchangeOracleFeePercentage,
            manifestURL,
            manifestHash
        );

        // Fund escrow
        _safeTransfer(token, escrow, fundAmount);

        emit CampaignLaunched(lastCampaignId, token, fundAmount, escrow);
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        SafeERC20.safeTransferFrom(IERC20(token), from, to, value);
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        SafeERC20.safeTransfer(IERC20(token), to, value);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    event CampaignLaunched(
        uint256 campaignId,
        address token,
        uint256 fundAmount,
        address escrow
    );

    uint256[42] private __gap;
}
