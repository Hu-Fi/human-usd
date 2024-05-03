import dotenv from "dotenv";
import { ethers, upgrades } from "hardhat";
import { ChainId, NETWORKS } from "@human-protocol/sdk";
import { CampaignManager, HumanUSD, MockUSDT } from "../typechain-types";

dotenv.config();

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkData = NETWORKS[Number(network.chainId) as ChainId];

  if (!networkData) {
    throw new Error("Unsupported network");
  }

  let usdtAddress = process.env.USDT_ADDRESS;
  let humanUSDAddress = process.env.HUMAN_USD_ADDRESS;
  let campaignManagerAddress = process.env.CAMPAIGN_MANAGER_ADDRESS;

  let usdt: MockUSDT;
  let humanUSD: HumanUSD;
  let campaignManager: CampaignManager;

  if (usdtAddress) {
    usdt = await ethers.getContractAt("MockUSDT", usdtAddress);
  } else {
    // Deploy MockUSDT contract
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy(ethers.parseEther("10000000000"));
    usdtAddress = await usdt.getAddress();
  }
  console.log("MockUSDT Address: ", usdtAddress);

  if (humanUSDAddress) {
    humanUSD = await ethers.getContractAt("HumanUSD", humanUSDAddress);
  } else {
    // Deploy HumanUSD contract
    const tokensRequiredForCampaign = ethers.parseEther(
      process.env.TOKENS_REQUIRED_FOR_EACH_CAMPAIGN || "100"
    );
    const HumanUSD = await ethers.getContractFactory("HumanUSD");
    humanUSD = (await upgrades.deployProxy(
      HumanUSD,
      [
        usdtAddress,
        networkData.hmtAddress,
        networkData.factoryAddress,
        networkData.stakingAddress,
        tokensRequiredForCampaign,
      ],
      { kind: "uups", initializer: "initialize" }
    )) as unknown as HumanUSD;
    await humanUSD.waitForDeployment();
    humanUSDAddress = await humanUSD.getAddress();
  }

  console.log("HumanUSD Proxy Address: ", humanUSDAddress);
  console.log(
    "HumanUSD Implementation Address: ",
    await upgrades.erc1967.getImplementationAddress(humanUSDAddress)
  );

  if (campaignManagerAddress) {
    campaignManager = await ethers.getContractAt(
      "CampaignManager",
      campaignManagerAddress
    );
  } else {
    // Deploy Campaign Manager
    const CampaignManager = await ethers.getContractFactory("CampaignManager");
    campaignManager = (await upgrades.deployProxy(CampaignManager, [], {
      initializer: "initialize",
      kind: "uups",
    })) as unknown as CampaignManager;
    await campaignManager.waitForDeployment();
    campaignManagerAddress = await campaignManager.getAddress();
  }
  console.log("Campaign Manager Proxy Address: ", campaignManagerAddress);
  console.log(
    "Campaign Manager Implementation Address: ",
    await upgrades.erc1967.getImplementationAddress(campaignManagerAddress)
  );

  // Configure Campaign Manager
  await campaignManager.setCampaignData(
    process.env.RECORDING_ORACLE_ADDRESS || "",
    process.env.REPUTATION_ORACLE_ADDRESS || "",
    process.env.EXCHANGE_ORACLE_ADDRESS || "",
    +(process.env.RECORDING_ORACLE_FEE_PERCENTAGE || "5"),
    +(process.env.REPUTATION_ORACLE_FEE_PERCENTAGE || "5"),
    +(process.env.EXCHANGE_ORACLE_FEE_PERCENTAGE || "5")
  );
  if ((await campaignManager.campaignTierCount()).toString() === "0") {
    await campaignManager.addCampaignTier(
      networkData.hmtAddress,
      ethers.parseEther(process.env.FUND_AMOUNT || "0.000001")
    );
  }
  console.log("Campaign Manager configured");

  // Set Campaign Manager for HumanUSD
  await humanUSD.setCampaignManager(campaignManagerAddress);

  // Transfer 0.0001 HMT to HumanUSD
  const hmt = await ethers.getContractAt("HMToken", networkData.hmtAddress);
  await hmt.transfer(humanUSDAddress, ethers.parseEther("0.0001"));

  // Stake 0.0000001 HMT onbehalf of HumanUSD
  const amountToStake = ethers.parseEther("0.0000001");
  await hmt.approve(await humanUSD.getAddress(), amountToStake);
  await humanUSD.stakeHMT(amountToStake);
  console.log("HumanUSD configured");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
