# Human USD token - Automated market making ERC20 example

This project demonstrates the ERC20 token example, which launches market making campaigns on Human Protocol.

## Overview
Simple `HUSD` ERC20 stable coin is deployed with Mock USDT, HMT, Escrow Factory, and Staking contract addresses. Mock USDT is used as collateral for the stable coin for demonstration purpose only. For the real world assets, this should be either ETH/USDT/USDC, or whatever can be used as collateral.
HMT, Escrow Factory, and Staking contracts are all coming from Human Protocol eco-system. Please refer to [Human Protocol](https://github.com/humanprotocol/human-protocol) for more information.
There is one more configuration called `tokensRequiredForCampaign`, which is used to determine how often it should launch campaigns. Whenever the stable coin reaches the mint amount specified by this value, it'll launch a campaign.

`HumanUSD` token contract is working with `CampaignManager` which handles all the campaign related actions.
We can configure campaign details inside the campaign manager, which is:
- Oracle addresses and relevant fees via `setCampaignData`.
- Campaign Tier, which includes campaign token and its amount, via `addCampaignTier`/`removeCampaignTier`.

Campaign manager uses simple [round-robin](https://en.wikipedia.org/wiki/Round-robin_scheduling) selection , so that the campaign launched by the stable coin is equally distributed for the available tiers.

Campaign manifest details are off-chain data, so that must be created off-chain, and then should be passed to `mint` function of the stable coin.

## Deployed Contracts

- Sepolia

    Contract | Address
    -- | --
    Mock USDT | [0x6A3267e048B80FC2Fbd52510508c1eb884F0fDb1](https://sepolia.etherscan.io/token/0x6A3267e048B80FC2Fbd52510508c1eb884F0fDb1)
    HumanUSD | [0xF15D41e06FE329427c643Ed2203F14C409cb4b85](https://sepolia.etherscan.io/address/0xF15D41e06FE329427c643Ed2203F14C409cb4b85)
    CampaignManager | [0x571E2443D8E74b531cd92F6310437F71Dc378fF6](https://sepolia.etherscan.io/address/0x571E2443D8E74b531cd92F6310437F71Dc378fF6)

- Polygon Amoy

    Contract | Address
    -- | --
    Mock USDT | [0x0E1fB03d02F3205108DE0c6a2b0B6B68e13D767e](https://www.oklink.com/amoy/address/0x0e1fb03d02f3205108de0c6a2b0b6b68e13d767e)
    HumanUSD | [0x6d15C4c6B58F9C80e1e34cbeB717aa7c4FF7B87c](https://www.oklink.com/amoy/address/0x6d15C4c6B58F9C80e1e34cbeB717aa7c4FF7B87c)
    CampaignManager | [0xFC041e678421F33437f82A1467379A42d1Cc29bb](https://www.oklink.com/amoy/address/0xFC041e678421F33437f82A1467379A42d1Cc29bb)

## Test
```bash
yarn test
```

## Deployment

- Proxy deployment
    ```bash
    yarn deploy:proxy --network $NETWORK
    ```
- Proxy upgrade
    ```bash
    export UPGRADE_HUMAN_USD=true
    export UPGRADE_CAMPAIGN_MANAGER=true
    yarn upgrade-proxy --network $NETWORK
    ```
