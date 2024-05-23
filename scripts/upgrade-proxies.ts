/* eslint-disable no-console */
import { ethers, upgrades } from "hardhat";

async function main() {
  const campaignManagerAddress = process.env.CAMPAIGN_MANAGER_ADDRESS;
  const upgradeCampaignManager = process.env.UPGRADE_CAMPAIGN_MANAGER;
  const humanUSDAddress = process.env.HUMAN_USD_ADDRESS;
  const upgradeHumanUSD = process.env.UPGRADE_HUMAN_USD;

  if (!campaignManagerAddress && !humanUSDAddress) {
    console.error("Env variable missing");
    return;
  }

  if (upgradeCampaignManager == "true" && campaignManagerAddress) {
    const CampaignManager = await ethers.getContractFactory("CampaignManager");
    const campaignManagerContract = await upgrades.upgradeProxy(
      campaignManagerAddress,
      CampaignManager
    );
    await campaignManagerContract.waitForDeployment();

    console.log(
      "CampaignManager Proxy Address: ",
      await campaignManagerContract.getAddress()
    );
    console.log(
      "New CampaignManager Implementation Address: ",
      await upgrades.erc1967.getImplementationAddress(
        await campaignManagerContract.getAddress()
      )
    );
  }

  if (upgradeHumanUSD == "true" && humanUSDAddress) {
    const HumanUSD = await ethers.getContractFactory("HumanUSD");
    const humanUSDContract = await upgrades.upgradeProxy(
      humanUSDAddress,
      HumanUSD
    );
    await humanUSDContract.waitForDeployment();

    console.log(
      "HumanUSD Proxy Address: ",
      await humanUSDContract.getAddress()
    );
    console.log(
      "New HumanUSD Implementation Address: ",
      await upgrades.erc1967.getImplementationAddress(
        await humanUSDContract.getAddress()
      )
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
